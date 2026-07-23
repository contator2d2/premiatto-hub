import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private docs: DocumentsService) {}

  @Get()
  list(@Query('search') search?: string, @Query('folderId') folderId?: string, @Query('official') official?: string) {
    return this.docs.list({
      search,
      folderId,
      official: official === undefined ? undefined : official === 'true',
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.docs.get(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      name?: string;
      description?: string;
      isOfficial?: string;
      requiresAcknowledgement?: string;
      categoryId?: string;
      folderId?: string;
    },
  ) {
    if (!file) return { error: 'Sem arquivo' };
    const ext = file.originalname.split('.').pop();
    return this.docs.create(userId, {
      name: body.name || file.originalname,
      description: body.description,
      filePath: `/api/files/documents/${file.filename}`,
      fileType: ext,
      fileSize: file.size,
      mimeType: file.mimetype,
      isOfficial: body.isOfficial === 'true',
      requiresAcknowledgement: body.requiresAcknowledgement === 'true',
      categoryId: body.categoryId || undefined,
      folderId: body.folderId || undefined,
    });
  }

  @Post(':id/download')
  download(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.recordDownload(userId, id).then(() => ({ ok: true }));
  }

  @Post(':id/acknowledge')
  ack(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.acknowledge(userId, id).then(() => ({ ok: true }));
  }

  @Post(':id/favorite')
  fav(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.toggleFavorite(userId, id);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.remove(userId, id);
  }
}
