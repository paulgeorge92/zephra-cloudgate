import { Controller, Get, Post, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { SetupService } from './setup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CloudflareConfigData, SmtpConfigData, ServerProfile, RequestResponse, SetupStatus, SetupVerificationResult } from '../shared/types';

@Controller('setup')
export class SetupController {
  constructor(private setupService: SetupService) {}

  @Get('status')
  async getStatus(): Promise<RequestResponse<SetupStatus>> {
    const result = await this.setupService.getSetupStatus();
    return { success: true, result: result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('cloudflare')
  async saveCloudflare(@Body() body: CloudflareConfigData): Promise<RequestResponse<void>> {
    await this.setupService.saveCloudflareConfig(body);
    return { success: true, result: undefined };
  }

  @UseGuards(JwtAuthGuard)
  @Post('smtp')
  async saveSmtp(@Body() body: SmtpConfigData): Promise<RequestResponse<void>> {
    await this.setupService.saveSmtpConfig(body);
    return { success: true, result: undefined };
  }

  @UseGuards(JwtAuthGuard)
  @Post('server')
  async saveServer(@Body() body: ServerProfile): Promise<RequestResponse<void>> {
    await this.setupService.saveServerProfile(body);
    return { success: true, result: undefined };
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verify(): Promise<RequestResponse<SetupVerificationResult>> {
    return await this.setupService.verifySetup();
  }

  @UseGuards(JwtAuthGuard)
  @Post('complete')
  async completeSetup(): Promise<RequestResponse<void>> {
    await this.setupService.completeSetup();
    return { success: true, result: undefined };
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset')
  async reset(): Promise<RequestResponse<void>> {
    let resetStatus = await this.setupService.resetDatabase();
    return { success: resetStatus, result: undefined };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `logo-${uniqueSuffix}${extname(file.originalname)}`);
        }
      })
    })
  )
  uploadLogo(@UploadedFile() file: { filename: string }): RequestResponse<{ url: string }> {
    return { success: true, result: { url: `/uploads/${file.filename}` } };
  }

  @UseGuards(JwtAuthGuard)
  @Get('cloudflare')
  async getCloudflareConfig(): Promise<RequestResponse<CloudflareConfigData>> {
    const result = await this.setupService.getCloudflareConfig();
    return { success: true, result: result as CloudflareConfigData };
  }

  @UseGuards(JwtAuthGuard)
  @Get('smtp')
  async getSmtpConfig(): Promise<RequestResponse<SmtpConfigData>> {
    const result = await this.setupService.getSmtpConfig();
    return { success: true, result: result as SmtpConfigData };
  }

  @Get('server')
  async getServerProfile(): Promise<RequestResponse<ServerProfile>> {
    const result = await this.setupService.getServerProfile();
    return { success: true, result: result as ServerProfile };
  }
}
