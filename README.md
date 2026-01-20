# Ledger Core

A production-ready **double-entry ledger system** built with NestJS, Prisma, and PostgreSQL. This system implements proper accounting principles with ACID guarantees, idempotency, and background job processing for high-volume financial transactions.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)

## 🎯 Overview

Ledger Core is a robust accounting ledger system that follows double-entry bookkeeping principles. Every financial transaction affects at least two accounts (debit and credit), ensuring the fundamental accounting equation remains balanced.

### Key Features

✅ **Double-Entry Bookkeeping** - Every transaction has balanced debits and credits  
✅ **ACID Compliance** - Transactions are atomic, consistent, isolated, and durable  
✅ **Idempotency** - Duplicate transactions are prevented using idempotency keys  
✅ **Atomic Balance Checks** - Balance verification happens inside database transactions  
✅ **Background Processing** - Transfers are queued using BullMQ for reliability  
✅ **Retry Mechanism** - Failed jobs automatically retry with exponential backoff  
✅ **Decimal Precision** - Uses `decimal.js` to avoid JavaScript floating-point errors  
✅ **Type Safety** - Full TypeScript support with Zod validation  

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **NestJS** | Progressive Node.js framework for building scalable server-side applications |
| **Prisma** | Next-generation ORM with type-safe database access |
| **PostgreSQL** | Robust relational database for transactional data |
| **BullMQ** | Redis-based queue for background job processing |
| **Zod** | Schema validation for runtime type checking |
| **Decimal.js** | Arbitrary-precision decimal arithmetic |
| **TypeScript** | Static typing and enhanced developer experience |

## 📁 Project Structure

```
ledger-core/
├── prisma/                          # Database schema and migrations
│   ├── migrations/                  # Database migration files
│   └── schema.prisma                # Prisma schema definition
├── src/                             # Source code
│   ├── ledger/                      # Ledger module (core business logic)
│   │   ├── ledger.controller.ts     # REST API endpoints
│   │   ├── ledger.service.ts        # Business logic and transaction handling
│   │   ├── ledger.processor.ts      # BullMQ job processor for async transfers
│   │   ├── ledger.module.ts         # Module configuration
│   │   └── ledger.service.spec.ts   # Unit tests
│   ├── prisma/                      # Prisma service module
│   │   └── (prisma service files)
│   ├── app.module.ts                # Root application module
│   ├── app.controller.ts            # Root controller
│   ├── app.service.ts               # Root service
│   ├── main.ts                      # Application entry point
│   ├── prisma.module.ts             # Prisma module configuration
│   └── prisma.service.ts            # Prisma client service with connection pooling
├── test/                            # E2E tests
├── .env                             # Environment variables
├── .gitignore                       # Git ignore rules
├── .prettierrc                      # Code formatting configuration
├── eslint.config.mjs                # ESLint configuration
├── nest-cli.json                    # NestJS CLI configuration
├── package.json                     # Project dependencies
├── prisma.config.ts                 # Prisma configuration file
├── tsconfig.json                    # TypeScript configuration
└── tsconfig.build.json              # TypeScript build configuration
```

## 🗄 Database Schema

The system uses three main tables with proper relationships:

### Account
Represents a ledger account (e.g., user wallets, revenue accounts)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Account name |
| `ledger` | String | Ledger identifier for grouping |
| `createdAt` | DateTime | Timestamp |

- **Constraint**: Unique combination of `(name, ledger)`

### Transaction
Header record for each financial transaction

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `description` | String | Transaction description |
| `postedAt` | DateTime | Transaction timestamp |
| `idempotencyKey` | String? | Optional unique key for idempotency |

- **Constraint**: Unique `idempotencyKey` to prevent duplicates

### Entry
Individual debit/credit entries that make up a transaction

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `amount` | Decimal(20,2) | Transaction amount |
| `direction` | DEBIT \| CREDIT | Entry type |
| `accountId` | UUID | Foreign key to Account |
| `transactionId` | UUID | Foreign key to Transaction |

- **Index**: `accountId` for fast balance queries

## 📂 File Details

### Core Application Files

#### `src/main.ts`
Application entry point that bootstraps the NestJS application on port 3000.

#### `src/app.module.ts`
Root module that imports:
- `LedgerModule` - Core ledger functionality
- `PrismaModule` - Database access layer

#### `src/app.controller.ts` & `src/app.service.ts`
Basic health check endpoint for application status.

### Ledger Module

#### `src/ledger/ledger.controller.ts`
**REST API Controller** - Handles HTTP requests

**Endpoints:**
- `POST /ledger/transfer` - Queue a fund transfer
- `GET /ledger/status/:jobId` - Check transfer job status

**Features:**
- Zod schema validation for transfer requests
- BullMQ queue integration for background processing
- Returns job ID for async tracking
- Configurable retry logic (3 attempts, 5s backoff)

#### `src/ledger/ledger.service.ts`
**Business Logic Layer** - Core transaction handling

**Methods:**
- `transferFunds(data)` - Execute double-entry transfer with atomic balance checks
- `getBalance(accountId)` - Calculate account balance from entries

**Features:**
- Atomic balance verification inside database transactions
- Idempotency checking via unique keys
- Decimal precision for monetary calculations
- Proper error handling (insufficient funds, duplicate transactions)

#### `src/ledger/ledger.processor.ts`
**Background Job Processor** - Processes queued transfers

**Features:**
- Consumes jobs from the `transfers` queue
- Invokes `ledgerService.transferFunds()`
- Comprehensive logging for debugging
- Automatic retry on failure (handled by BullMQ)

#### `src/ledger/ledger.module.ts`
**Module Configuration**

**Provides:**
- BullMQ queue setup for `transfers` queue
- Redis connection for queue persistence
- Exports `LedgerService` for dependency injection

### Database Layer

#### `src/prisma.service.ts`
**Prisma Client Service** - Database connection management

**Features:**
- Connection pooling with `pg` driver
- Prisma adapter for PostgreSQL
- SSL support for production databases (Supabase, etc.)
- Lifecycle hooks for connect/disconnect
- Exposes unified client interface

#### `src/prisma.module.ts`
**Prisma Module** - Makes PrismaService globally available

### Configuration Files

#### `prisma/schema.prisma`
Prisma schema defining the database structure:
- Generator: `prisma-client-js`
- Datasource: PostgreSQL
- Models: Account, Transaction, Entry
- Enums: EntryDirection (DEBIT/CREDIT)

#### `prisma.config.ts`
Prisma configuration:
- Schema path
- Migration path
- Database URL from environment variables
- Seed script configuration

#### `package.json`
Project metadata and dependencies:

**Key Dependencies:**
- `@nestjs/*` - NestJS framework packages
- `@prisma/client` & `@prisma/adapter-pg` - Database ORM
- `@nestjs/bullmq` & `bullmq` - Background job processing
- `decimal.js` - Precise decimal arithmetic
- `nestjs-zod` & `zod` - Runtime validation
- `pg` - PostgreSQL driver

**Scripts:**
- `start:dev` - Development mode with hot reload
- `build` - Production build
- `test` - Run unit tests
- `test:e2e` - Run end-to-end tests

#### `tsconfig.json`
TypeScript compiler configuration with strict mode enabled for type safety.

#### `eslint.config.mjs`
ESLint configuration for code quality and consistency.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Redis server (for BullMQ)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mo74x/ledger-core.git
cd ledger-core
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ledger_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
```

4. **Run database migrations**
```bash
npx prisma migrate dev
```

5. **Generate Prisma Client**
```bash
npx prisma generate
```

6. **Start the application**
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The application will be available at `http://localhost:3000`

## 🔌 API Endpoints

### Transfer Funds

Queue a fund transfer between accounts.

**Endpoint:** `POST /ledger/transfer`

**Request Body:**
```json
{
  "fromAccountId": "uuid-of-sender-account",
  "toAccountId": "uuid-of-receiver-account",
  "amount": "100.50",
  "description": "Payment for services",
  "idempotencyKey": "unique-transaction-id"
}
```

**Response:**
```json
{
  "status": "queued",
  "message": "Transfer is being processed in the background",
  "jobId": "12345",
  "trackUrl": "/ledger/status/12345"
}
```

### Check Transfer Status

Get the status of a queued transfer.

**Endpoint:** `GET /ledger/status/:jobId`

**Response (Processing):**
```json
{
  "jobId": "12345",
  "status": "active",
  "result": null,
  "error": null
}
```

**Response (Completed):**
```json
{
  "jobId": "12345",
  "status": "completed",
  "result": {
    "id": "transaction-uuid",
    "description": "Payment for services",
    "postedAt": "2026-01-20T08:00:00.000Z"
  },
  "error": null
}
```

**Response (Failed):**
```json
{
  "jobId": "12345",
  "status": "failed",
  "result": null,
  "error": "Insufficient funds. Available: 50.00"
}
```

## ⚙️ Configuration

### Database Configuration

The database connection is configured in `prisma.config.ts` and uses the `DATABASE_URL` environment variable.

For production databases with SSL (like Supabase):
```typescript
this.pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

### Queue Configuration

BullMQ configuration in `ledger.module.ts`:

```typescript
BullModule.forRoot({
  connection: {
    host: 'localhost',
    port: 6379,
  },
}),
BullModule.registerQueue({
  name: 'transfers',
})
```

## 🧑‍💻 Development

### Running in Development Mode

```bash
npm run start:dev
```

### Code Formatting

```bash
npm run format
```

### Linting

```bash
npm run lint
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (⚠️ destructive)
npx prisma migrate reset
```

### Prisma Studio

View and edit your database with Prisma Studio:

```bash
npx prisma studio
```

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

## 🏗 Architecture Highlights

### 1. Double-Entry Ledger System

Every transfer creates two entries:
- **DEBIT** from sender account (decreases balance)
- **CREDIT** to receiver account (increases balance)

This ensures:
- Sum of all entries = 0 (balanced books)
- Full audit trail
- Compliance with accounting standards

### 2. Atomic Balance Checks

Balance verification happens **inside** the database transaction:

```typescript
return await this.prisma.$transaction(async (tx) => {
  // 1. Calculate current balance (locks the state)
  const entries = await tx.entry.groupBy({...});
  
  // 2. Verify sufficient funds
  if (currentBalance.lessThan(transferAmount)) {
    throw new BadRequestException('Insufficient funds');
  }
  
  // 3. Create transaction and entries
  // ...
});
```

This prevents race conditions between concurrent transfers.

### 3. Background Job Processing

Transfers are processed asynchronously via BullMQ:

```
Client Request → Queue Job → Return Job ID → Background Processor → Update Status
```

**Benefits:**
- Fast API response times
- Automatic retries on failure
- Horizontal scalability
- Graceful error handling

### 4. Idempotency

Duplicate requests with the same `idempotencyKey` are rejected:

```typescript
const existingTx = await this.prisma.transaction.findUnique({
  where: { idempotencyKey },
});
if (existingTx) throw new ConflictException('Transaction already processed');
```

This prevents accidental double-charging when clients retry failed requests.

## 📊 Balance Calculation

Account balances are computed dynamically from entries:

```typescript
Balance = Sum(CREDIT entries) - Sum(DEBIT entries)
```

This ensures:
- No balance column to keep in sync
- Single source of truth (the entries)
- Full transaction history preserved

## 🔐 Security Considerations

- Use environment variables for sensitive credentials
- Enable SSL for database connections in production
- Validate all inputs with Zod schemas
- Use UUIDs to prevent enumeration attacks
- Implement rate limiting for API endpoints (recommended)
- Add authentication/authorization middleware (recommended)

## 📝 License

This project is [MIT licensed](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Support

For questions and support, please open an issue on the [GitHub repository](https://github.com/mo74x/ledger-core).

---

**Built with ♥️ using NestJS and Prisma**
