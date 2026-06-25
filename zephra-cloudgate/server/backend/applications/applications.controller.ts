import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Application, CreateApplicationData, RequestResponse } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private applications: ApplicationsService) {}

  @Get()
  async findAll(): Promise<RequestResponse<Application[]>> {
    const result = await this.applications.findAll();

    return {
      success: true,
      result,
      result_info: {
        page: 1,
        per_page: result.length,
        total_pages: 1,
        total_count: result.length,
        count: result.length
      }
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RequestResponse<Application>> {
    const result = await this.applications.get(id);
    return { success: true, result: result };
  }

  @Post()
  async create(@Body() body: CreateApplicationData): Promise<RequestResponse<Application>> {
    const result = await this.applications.create(body);
    return { success: true, result: result };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateApplicationData>): Promise<RequestResponse<Application>> {
    const result = await this.applications.update(id, body);
    return { success: true, result: result };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<RequestResponse<{ id: string }>> {
    const result = await this.applications.delete(id);
    return { success: true, result: result };
  }
}
