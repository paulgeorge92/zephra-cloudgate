import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ListsService } from './lists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestResponse } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  async findAll(): Promise<RequestResponse<any[]>> {
    const res = await this.listsService.findAll();
    return { ...res, success: true };
  }

  @Post()
  async create(@Body() body: any): Promise<RequestResponse<any>> {
    const result = await this.listsService.create(body);
    return { success: true, result: result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RequestResponse<any>> {
    const res = await this.listsService.findOne(id);
    return { ...res };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any): Promise<RequestResponse<any>> {
    const res = await this.listsService.update(id, body);
    return { ...res };
  }

  @Post(':id')
  async updateDetails(@Param('id') id: string, @Body() body: any): Promise<RequestResponse<any>> {
    const res = await this.listsService.updateDetails(id, body);
    return { ...res };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<RequestResponse<any>> {
    const res = await this.listsService.delete(id);
    return { ...res };
  }
}
