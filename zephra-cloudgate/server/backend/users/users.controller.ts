import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserData, RequestResponse, UpdateUserData, User } from '../shared/types';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  async findAll(@Query('page') page?: number, @Query('per_page') per_page?: number): Promise<RequestResponse<User[]>> {
    const p = page && parseInt(page.toString()) || 1;
    const pp = per_page && parseInt(per_page.toString()) || 10;
    
    const { response, total_count } = await this.users.findAll(p, pp);
    return {
      success: true,
      result: response,
      result_info: {
        page: p,
        per_page: pp,
        total_pages: Math.ceil(total_count / pp),
        total_count,
        count: response.length
      }
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RequestResponse<User>> {
    const result = await this.users.findOne(id);
    return { success: true, result: result };
  }

  @Post()
  async create(@Body() body: CreateUserData): Promise<RequestResponse<User>> {
    const result = await this.users.create(body);
    return { success: true, result: result };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateUserData): Promise<RequestResponse<User>> {
    const result = await this.users.update(id, body);
    return { success: true, result: result };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<RequestResponse<void>> {
    await this.users.delete(id);
    return { success: true, result: undefined };
  }
}
