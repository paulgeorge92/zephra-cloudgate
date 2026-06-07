import { Controller, Post, Body, UseGuards, Delete } from '@nestjs/common';
import { DnsService } from './dns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestResponse } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('dns')
export class DnsController {
  constructor(private readonly dnsService: DnsService) {}

  @Post()
  async create(@Body() body: { zoneId: string; name: string, tunnelId: string, comment?: string }): Promise<RequestResponse<any>> {
    const result = await this.dnsService.create(body.zoneId, body.name, body.tunnelId, body.comment);
    return { success: true, result: result };
  }

  @Delete()
  async delete(@Body() body: { zoneId: string; recordId: string }): Promise<RequestResponse<any>> {
    const result = await this.dnsService.delete(body.zoneId, body.recordId);
    return { success: true, result: result };
  }
}
