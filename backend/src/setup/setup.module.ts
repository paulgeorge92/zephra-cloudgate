import { Module } from '@nestjs/common';
import { SetupService } from './setup.service';
import { SetupController } from './setup.controller';
import { CloudflareModule } from '../cloudflare/cloudflare.module';

@Module({
  imports: [CloudflareModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
