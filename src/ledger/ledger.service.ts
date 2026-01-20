/* eslint-disable @typescript-eslint/await-thenable */
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

    // 1. Idempotency Check (As before)
    if (idempotencyKey) {
      const existingTx = await this.prisma.transaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx)
        throw new ConflictException('Transaction already processed');
    }

    return await this.prisma.$transaction(async (tx) => {
      // --- NEW: ATOMIC BALANCE CHECK ---

      // Calculate current balance INSIDE the transaction.
      // This effectively "locks" the state because we are inside a transaction.
      const entries = await tx.entry.groupBy({
        by: ['direction'],
        where: { accountId: fromAccountId },
        _sum: { amount: true },
      });

      let currentBalance = new Decimal(0);
      entries.forEach((e) => {
        const val = new Decimal(e._sum.amount || 0);
        if (e.direction === 'CREDIT') currentBalance = currentBalance.plus(val);
        else currentBalance = currentBalance.minus(val);
      });

      // Check if they have enough money
      if (currentBalance.lessThan(transferAmount)) {
        throw new BadRequestException(
          `Insufficient funds. Available: ${currentBalance.toFixed(2)}`,
        );
      }

      // --- END NEW CHECK ---

      // 2. Create Transaction Header
      const transactionRecord = await tx.transaction.create({
        data: { description, idempotencyKey, postedAt: new Date() },
      });

      // 3. DEBIT Sender
      await tx.entry.create({
        data: {
          transactionId: transactionRecord.id,
          accountId: fromAccountId,
          direction: 'DEBIT',
          amount: transferAmount,
        },
      });

      // 4. CREDIT Receiver
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
