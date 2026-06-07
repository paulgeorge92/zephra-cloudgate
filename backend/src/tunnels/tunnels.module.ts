import { Module } from '@nestjs/common';
import { TunnelsService } from './tunnels.service';
import { TunnelsController } from './tunnels.controller';
import { CloudflareModule } from '../cloudflare/cloudflare.module';

@Module({
  imports: [CloudflareModule],
  controllers: [TunnelsController],
  providers: [TunnelsService],
})
export class TunnelsModule {}
