/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Decimal } from 'decimal.js';

interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: string; // Always accept money as Strings to avoid JS float errors
  description: string;
  idempotencyKey?: string;
}

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async transferFunds(data: TransferRequest) {
    const { fromAccountId, toAccountId, amount, description, idempotencyKey } =
      data;
    const transferAmount = new Decimal(amount);

    if (transferAmount.isNegative() || transferAmount.isZero()) {
      throw new BadRequestException('Transfer amount must be positive');
    }
    if (idempotencyKey) {
      const existingTx = await this.prisma.client.transaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx)
        throw new ConflictException('Transaction already processed');
    }

    return await this.prisma.client.$transaction(async (tx) => {
      const transactionRecord = await tx.transaction.create({
        data: {
          description,
          idempotencyKey,
          postedAt: new Date(),
        },
      });

      await tx.entry.create({
        data: {
          transactionId: transactionRecord.id,
          accountId: fromAccountId,
          direction: 'DEBIT',
          amount: transferAmount, // Prisma handles Decimal conversion
        },
      });

      await tx.entry.create({
        data: {
          transactionId: transactionRecord.id,
          accountId: toAccountId,
          direction: 'CREDIT',
          amount: transferAmount,
        },
      });
      return transactionRecord;
    });
  }

  async getBalance(accountId: string): Promise<string> {
    // We aggregate directly in the database for speed
    const result = await this.prisma.client.entry.groupBy({
      by: ['accountId', 'direction'],
      where: { accountId },
      _sum: { amount: true },
    });

    let balance = new Decimal(0);

    // Logic: Balance = Sum(Credits) - Sum(Debits)
    // (Assuming these are Liability accounts like User Wallets)
    result.forEach((group) => {
      const amount = new Decimal(group._sum.amount || 0);
      if (group.direction === 'CREDIT') {
        balance = balance.plus(amount);
      } else {
        balance = balance.minus(amount);
      }
    });

    return balance.toFixed(2);
  }
}
