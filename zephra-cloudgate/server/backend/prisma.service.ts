import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'fs';
import path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Resolve the DB file path from DATABASE_URL env var
    const dbUrl = process.env.DATABASE_URL || 'file:./data/data.db';
    const dbRelPath = dbUrl.replace(/^file:/, '');
    const resolvedPath = path.isAbsolute(dbRelPath) ? dbRelPath : path.resolve(process.cwd(), dbRelPath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

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
