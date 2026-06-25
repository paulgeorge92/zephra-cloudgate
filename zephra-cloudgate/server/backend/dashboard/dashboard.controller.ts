import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardSummary, SystemStats, WeatherStats, RequestResponse, DiskStats } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get()
  async getSummary(): Promise<RequestResponse<DashboardSummary>> {
    const result = await this.dashboard.getSummary();
    return { success: true, result: result };
  }

  @Get('system')
  async getSystem(): Promise<RequestResponse<SystemStats>> {
    const result = await this.dashboard.getSystemStats();
    return { success: true, result: result };
  }

  @Get('storage')
  async getStorage(): Promise<RequestResponse<DiskStats[]>> {
    const result = await this.dashboard.getStorageStats();
    return { success: true, result: result };
  }

  @Get('weather')
  async getWeather(@Query('lat') lat?: string, @Query('lon') lon?: string): Promise<RequestResponse<WeatherStats>> {
    const stats = await this.dashboard.getWeather(
      lat ? parseFloat(lat) : undefined,
      lon ? parseFloat(lon) : undefined,
    );
    return { success: true, result: stats as WeatherStats };
  }
}
