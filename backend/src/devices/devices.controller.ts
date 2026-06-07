import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Device, RequestResponse } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll(): Promise<RequestResponse<Device[]>> {
    const res = await this.devicesService.findAll();
    return { result: res.result, success: res.success, message: res.messages.join(', ') };
  }

  @Get('posture')
  async getPostureRules(): Promise<RequestResponse<any[]>> {
    const res = await this.devicesService.getPostureRules();
    return { result: res.result, success: res.success, message: res.messages.join(', ') };
  }
}
