import { Controller, Get, UseGuards } from '@nestjs/common';
import { DomainsService } from './domains.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestResponse } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  async findAll(): Promise<RequestResponse<any>> {
    const result = await this.domainsService.findAll();
    return { ...result };
  }
}
