import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { CloudflareModule } from '../cloudflare/cloudflare.module';
import { DnsModule } from '../dns/dns.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule, CloudflareModule, DnsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
