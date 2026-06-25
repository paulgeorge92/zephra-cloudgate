import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FirewallService } from './firewall.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FirewallPolicy, RequestResponse, FirewallContentCategory, FirewallAppType } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('firewall/policies')
export class FirewallController {
  constructor(private readonly firewallService: FirewallService) {}

  @Get()
  async getPolicies(): Promise<RequestResponse<FirewallPolicy[]>> {
    return this.firewallService.getFirewallPolicies();
  }

  @Get('app_types')
  async getAppTypes(): Promise<RequestResponse<FirewallAppType[]>> {
    return this.firewallService.getAppTypes();
  }

  @Get('categories')
  async getCategories(): Promise<RequestResponse<FirewallContentCategory[]>> {
    return this.firewallService.getCategories();
  }

  @Get('ui_options')
  async getUiOptions(): Promise<RequestResponse<any>> {
    return this.firewallService.getUiOptions();
  }

  @Get('dlp/file_types')
  async getFileTypes(): Promise<RequestResponse<any>> {
    return this.firewallService.getFileTypes();
  }

  @Get(':id')
  async getPolicy(@Param('id') id: string): Promise<RequestResponse<FirewallPolicy>> {
    return this.firewallService.getFirewallPolicy(id);
  }

  @Post()
  async createPolicy(@Body() data: Partial<FirewallPolicy>): Promise<RequestResponse<FirewallPolicy>> {
    return this.firewallService.createFirewallPolicy(data);
  }

  @Delete(':id')
  async deletePolicy(@Param('id') id: string): Promise<RequestResponse<null>> {
    return this.firewallService.deleteFirewallPolicy(id);
  }
}
