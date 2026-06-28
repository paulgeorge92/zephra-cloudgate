import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CronService } from './cron.service';
import { CloudflareModule } from '../cloudflare/cloudflare.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [ConfigModule, CloudflareModule, PrismaModule],
  providers: [CronService],
})
export class CronModule {}
