import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

const docsDir = () => {
  const dir = join(process.env.UPLOADS_DIR || join(process.cwd(), 'uploads'), 'documents');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
};

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, docsDir()),
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
