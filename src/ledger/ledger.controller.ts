/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid money format'), // "10.50"
  description: z.string(),
  idempotencyKey: z.string().optional(),
});

class TransferDto {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description: string;
  idempotencyKey?: string;
}

@Controller('ledger')
export class LedgerController {
  constructor(
    private readonly ledgerService: LedgerService,
    @InjectQueue('transfers') private readonly transferQueue: Queue, // Inject the Queue
  ) {}

  @Post('transfer')
  async transfer(@Body() body: any) {
    // 1. Add to Queue instead of running directly
    const job = await this.transferQueue.add('transfer-job', body, {
      attempts: 3, // Retry 3 times if it crashes (Complicated resilience!)
      backoff: 5000, // Wait 5s between retries
      removeOnComplete: true, // Auto-cleanup
    });

    // 2. Return the Job ID immediately (Fast!)
    return {
      status: 'queued',
      message: 'Transfer is being processed in the background',
      jobId: job.id,
      trackUrl: `/ledger/status/${job.id}`,
    };
  }

  // New Endpoint to check status
  @Get('status/:jobId')
  async getStatus(@Param('jobId') jobId: string) {
    const job = await this.transferQueue.getJob(jobId);
    if (!job) return { status: 'not_found' };

    const isCompleted = await job.isCompleted();
    const isFailed = await job.isFailed();

    return {
      jobId,
      status: await job.getState(),
      result: isCompleted ? job.returnvalue : null,
      error: isFailed ? job.failedReason : null,
    };
  }
}
