import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { LedgerProcessor } from './ledger.processor';

@Module({
  imports: [
    // 1. Connect to Redis
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    // 2. Register the specific queue for transfers
    BullModule.registerQueue({
      name: 'transfers',
    }),
  ],
  controllers: [LedgerController],
  providers: [LedgerService, LedgerProcessor], // Add Processor here
})
export class LedgerModule {}
