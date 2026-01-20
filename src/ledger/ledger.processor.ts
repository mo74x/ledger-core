/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LedgerService } from './ledger.service';
import { Logger } from '@nestjs/common';

@Processor('transfers')
export class LedgerProcessor extends WorkerHost {
  private readonly logger = new Logger(LedgerProcessor.name);

  constructor(private readonly ledgerService: LedgerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing Job ${job.id}: ${job.name}`);

    // The data passed from the controller is inside job.data
    try {
      const result = await this.ledgerService.transferFunds(job.data);
      this.logger.log(`Job ${job.id} Completed successfully.`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} Failed: ${error.message}`);
      // If we throw here, BullMQ will mark the job as Failed and can retry it
      throw error;
    }
  }
}
