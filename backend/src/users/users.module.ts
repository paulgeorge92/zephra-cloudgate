import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CloudflareModule } from '../cloudflare/cloudflare.module';

@Module({
  imports: [CloudflareModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
