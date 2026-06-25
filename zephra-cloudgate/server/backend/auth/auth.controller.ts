import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginData, RequestResponse, SetupAdminData, User, AuthResponse } from '../shared/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: LoginData): Promise<RequestResponse<AuthResponse>> {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const result = await this.authService.login(user);
    return { success: true, result: result };
  }

  @Post('setup')
  async setupAdmin(@Body() body: SetupAdminData): Promise<RequestResponse<AuthResponse>> {
    const result = await this.authService.createAdmin(body);
    return { success: true, result: result };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: { user: User }): RequestResponse<User> {
    return { success: true, result: req.user };
  }
}
