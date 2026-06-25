import { Controller, Get, Post, Body, Param, UseGuards, Delete, Patch, Query } from '@nestjs/common';
import { CloudflareService } from './cloudflare.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { RequestResponse } from '../shared/types';
import { CloudflareAccessApplication } from './cloudflare.types';

@UseGuards(JwtAuthGuard)
@Controller('cloudflare')
export class CloudflareController {
  constructor(
    private cloudflare: CloudflareService,
    private prisma: PrismaService,
  ) {}

  @Get('access/groups')
  async getAccessGroups(): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.getAccessGroups();
    return { ...result, success: result.success };
  }

  @Get('tunnels')
  async getTunnels(@Query('page') page?: number, @Query('per_page') per_page?: number): Promise<RequestResponse<any[]>> {
    const result = await this.cloudflare.getTunnels(page, per_page);
    return { ...result, success: result.success };
  }

  @Get('tunnel')
  async getTunnel(@Query('tunnelId') id:string){
    const result = await this.cloudflare.getTunnel(id);
    return {...result, success: result.success}
  }

  @Post('tunnels')
  async createTunnel(@Body() body: { name: string }): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.createTunnel(body.name);
    return { success: true, result: result };
  }

  @Get('access/apps')
  async getAccessApps(@Query('page') page?: number, @Query('per_page') per_page?: number): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.getAccessApps();
    return { ...result, success: result.success };
  }

  @Get('access/apps/:id')
  async getAccessApp(@Param('id') id:string): Promise<RequestResponse<CloudflareAccessApplication>> {
    return await this.cloudflare.getAccessApp(id);
    
  }

  @Post('access/apps')
  async createAccessApp(@Body() body: any): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.createAccessApp(body);
    return { success: result.success, result: result };
  }

  @Post('access/policies')
  async createAccessPolicy(@Body() body: any): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.createAccessPolicy(body);
    return { success: result.success, result: result };
  }

  @Post('networks/routes')
  async createPrivateNetwork(@Body() body: { cidr: string; tunnelId: string }): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.createPrivateNetwork(body.cidr, body.tunnelId);
    return { success: result.success, result: result };
  }

  @Get('networks/routes')
  async getPrivateNetworks(): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.getPrivateNetworks();
    return { success: result.success, result: result };
  }

  @Get('accounts/members')
  async getAccountMembers(@Query('page') page?: number, @Query('per_page') per_page?: number): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.getAccountMembers(page, per_page);
    return { ...result, success: result.success };
  }

  @Post('accounts/members')
  async addAccountMember(@Body() body: {name: string, email: string; roles: string[] }): Promise<RequestResponse<any>> {
    const result = await this.cloudflare.addAccountMember(body.name, body.email, body.roles);
    return { success: result.success, result: result };
  }

  @Post('import')
  async importData(): Promise<RequestResponse<{ result: any; logs: string[] }>> {
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    console.error = (...args) => {
      logs.push('ERROR: ' + args.join(' '));
      originalError(...args);
    };

    try {
      const data = await this.cloudflare.importData();
      return { success: true, result: { result: data, logs } };
    } catch (e: unknown) {
      // Re-throw so the Exception Filter handles it uniformly
      throw e;
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  }
}
