/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Alice's Account
  const alice = await prisma.account.upsert({
    where: { name_ledger: { name: 'Alice', ledger: 'USD' } },
    update: {},
    create: {
      name: 'Alice',
      ledger: 'USD',
    },
  });

  // 2. Create Bob's Account
  const bob = await prisma.account.upsert({
    where: { name_ledger: { name: 'Bob', ledger: 'USD' } },
    update: {},
    create: {
      name: 'Bob',
      ledger: 'USD',
    },
  });

  console.log({ alice, bob });
  const initialDeposit = await prisma.transaction.create({
    data: {
      description: 'Initial Seed Deposit',
      entries: {
        create: [
          // Credit Alice $1000
          { amount: 1000, direction: 'CREDIT', accountId: alice.id },
        ],
      },
    },
  });

  console.log('💰 Alice funded with $1000');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
