import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';

const brandingDir = () => {
  const dir = join(process.env.UPLOADS_DIR || join(process.cwd(), 'uploads'), 'branding');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
};

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, brandingDir()),
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [BrandingController],
  providers: [BrandingService],
})
export class BrandingModule {}
