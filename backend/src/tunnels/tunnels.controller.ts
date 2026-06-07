import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TunnelsService } from './tunnels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IngressRule, Tunnel, TunnelDetail, RequestResponse } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('tunnels')
export class TunnelsController {
  constructor(private tunnels: TunnelsService) {}

  @Get()
  async findAll(@Query('page') page?: number, @Query('per_page') per_page?: number): Promise<RequestResponse<Tunnel[]>> {
    const response = await this.tunnels.findAll(page, per_page);
    return { ...response, success: true };
  }

  @Get(':id/detail')
  async getDetail(@Param('id') id: string): Promise<RequestResponse<TunnelDetail>> {
    const result = await this.tunnels.getDetail(id);
    return { success: true, result: result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RequestResponse<Tunnel>> {
    const result = await this.tunnels.findOne(id);
    return { success: true, result: result };
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string): Promise<RequestResponse<any>> {
    const result = await this.tunnels.getStatus(id);
    return { success: true, result: result };
  }

  @Get(':id/token')
  async getToken(
    @Param('id') id: string,
  ): Promise<RequestResponse<{ token: string | undefined; cfTunnelId: string }>> {
    const result = await this.tunnels.getToken(id);
    return { success: true, result: result };
  }

  @Post()
  async create(@Body() body: { name: string }): Promise<RequestResponse<Tunnel>> {
    const result = await this.tunnels.create(body.name);
    return { success: true, result: result };
  }

  @Post(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name: string },
  ): Promise<RequestResponse<{ id: string; name: string }>> {
    const result = await this.tunnels.update(id, body.name);
    return { success: true, result: result };
  }

  @Post(':id/routes')
  async manageRoutes(
    @Param('id') id: string,
    @Body() body: { action: 'ADD' | 'DELETE'; cidr?: string; routeId?: string },
  ): Promise<RequestResponse<any>> {
    const result = await this.tunnels.manageRoutes(id, body.action, body.cidr, body.routeId);
    return { success: true, result: result };
  }

  @Post(':id/config')
  async manageConfig(
    @Param('id') id: string,
    @Body() body: { ingressRules: IngressRule[] },
  ): Promise<RequestResponse<any>> {
    const result = await this.tunnels.manageConfig(id, body.ingressRules);
    return { success: true, result: result };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<RequestResponse<{ id: string; success: boolean }>> {
    const result = await this.tunnels.delete(id);
    return { success: true, result: result };
  }
}
