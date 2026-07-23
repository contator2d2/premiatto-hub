import { Body, Controller, Get, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppRole } from '@prisma/client';
import { BrandingService } from './branding.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('branding')
export class BrandingController {
  constructor(private branding: BrandingService) {}

  @Public()
  @Get()
  get() {
    return this.branding.get();
  }

  @Put()
  @Roles(AppRole.super_admin, AppRole.admin)
  update(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.branding.update(body, userId);
  }

  @Post('upload')
  @Roles(AppRole.super_admin, AppRole.admin)
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { error: 'Sem arquivo' };
    return { url: `/api/files/branding/${file.filename}` };
  }
}
