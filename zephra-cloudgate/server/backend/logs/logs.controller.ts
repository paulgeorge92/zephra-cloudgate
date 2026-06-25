import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestResponse } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('dns')
  async getDNSLogs(@Query('query') query: string): Promise<RequestResponse<any>> {
    const result = await this.logsService.getDNSLogs(query);
    return { success: result.success, result: result };
  }

  @Get('network')
  async getNetworkLogs(@Query('query') query: string): Promise<RequestResponse<any>> {
    const result = await this.logsService.getNetworkLogs(query);
    return { success: result.success, result: result };
  }

  @Get('http')
  async getHTTPLogs(@Query('query') query: string): Promise<RequestResponse<any>> {
    const result = await this.logsService.getHTTPLogs(query);
    return { success: result.success, result: result };
  }
}