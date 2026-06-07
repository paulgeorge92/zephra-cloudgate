import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Resolve the DB file path from DATABASE_URL env var
    const dbUrl = process.env.DATABASE_URL || 'file:./data.db';
    const dbRelPath = dbUrl.replace(/^file:/, '');

    // In production (dist), main.js is in dist/backend/
    // .env is in dist/
    // In dev, main.ts is in backend/src/ (via ts-node) or backend/dist/ (via nest)
    // We want the DB to be relative to the PROJECT ROOT (where .env lives)

    let baseDir = process.cwd();
    // If we can find the .env file parent, use that as the anchor
    const envPath = path.resolve(process.cwd(), '.env');
    const parentEnvPath = path.resolve(process.cwd(), '..', '.env');

    if (require('fs').existsSync(envPath)) {
      baseDir = process.cwd();
    } else if (require('fs').existsSync(parentEnvPath)) {
      baseDir = path.resolve(process.cwd(), '..');
    }

    const resolvedPath = path.isAbsolute(dbRelPath) ? dbRelPath : path.resolve(baseDir, dbRelPath);

    const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
