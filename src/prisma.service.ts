/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/prisma.service.ts
import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private pool: Pool;
    private _client: PrismaClient;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        });
        const adapter = new PrismaPg(this.pool);
        this._client = new PrismaClient({ adapter });
    }

    get client(): PrismaClient {
        return this._client;
    }

    async onModuleInit() {
        await this._client.$connect();
    }

    async onModuleDestroy() {
        await this._client.$disconnect();
        await this.pool.end();
    }
}
