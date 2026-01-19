/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';

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
  constructor(private readonly ledgerService: LedgerService) {}

  @Post('transfer')
  async transfer(@Body() body: TransferDto) {
    const data = transferSchema.parse(body);

    return this.ledgerService.transferFunds(data);
  }

  @Get('balance/:accountId')
  async getBalance(@Param('accountId') accountId: string) {
    const balance = await this.ledgerService.getBalance(accountId);
    return { accountId, balance, currency: 'USD' };
  }
}
