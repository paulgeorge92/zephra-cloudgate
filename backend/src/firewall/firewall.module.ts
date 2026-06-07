import { Module } from '@nestjs/common';
import { FirewallService } from './firewall.service';
import { FirewallController } from './firewall.controller';
import { CloudflareModule } from '../cloudflare/cloudflare.module';

@Module({
  imports: [CloudflareModule],
  controllers: [FirewallController],
  providers: [FirewallService],
  exports: [FirewallService],
})
export class FirewallModule {}
