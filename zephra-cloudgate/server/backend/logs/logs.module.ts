import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { CloudflareModule } from '../cloudflare/cloudflare.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [CloudflareModule, PrismaModule],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}