import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env for Prisma CLI
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config(); // Also try local

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'file:./data.db',
  },
});
