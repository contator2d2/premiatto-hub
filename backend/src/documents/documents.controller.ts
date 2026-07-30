import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, existsSync } from 'fs';
import { basename, extname, join } from 'path';
import { AppRole, SharePriority } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';


@Controller()
export class DocumentsController {
  constructor(private docs: DocumentsService) {}

  // ==== Auth: /documents ====

  @Get('documents')
  list(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('folderId') folderId?: string,
    @Query('official') official?: string,
    @Query('scope') scope?: any,
  ) {
    return this.docs.list(userId, {
      search,
      folderId: folderId === 'root' ? null : folderId,
      official: official === undefined ? undefined : official === 'true',
      scope,
    });
  }

  @Get('documents/:id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.get(userId, id);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
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
      folderId: body.folderId || undefined,
      categoryId: body.categoryId || undefined,
      responsibleId: body.responsibleId || undefined,
      author: body.author,
      tags: body.tags ? (Array.isArray(body.tags) ? body.tags : String(body.tags).split(',').map((s: string) => s.trim()).filter(Boolean)) : undefined,
      confidentiality: body.confidentiality,
      isOfficial: body.isOfficial === 'true' || body.isOfficial === true,
      requiresAcknowledgement: body.requiresAcknowledgement === 'true' || body.requiresAcknowledgement === true,
      allowDownload: body.allowDownload !== 'false' && body.allowDownload !== false,
      allowShare: body.allowShare !== 'false' && body.allowShare !== false,
      validUntil: body.validUntil || null,
      publishedAt: body.publishedAt || null,
    });
  }

  @Post('documents/:id/version')
  @UseInterceptors(FileInterceptor('file'))
  async addVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) return { error: 'Sem arquivo' };
    const ext = file.originalname.split('.').pop();
    return this.docs.addVersion(userId, id, {
      filePath: `/api/files/documents/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileType: ext,
      changeReason: body.changeReason,
      notes: body.notes,
    });
  }

  @Get('documents/:id/versions')
  versions(@Param('id') id: string) {
    return this.docs.listVersions(id);
  }

  @Post('documents/:id/versions/:v/restore')
  restoreVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('v') v: string,
    @Body() body: { reason?: string },
  ) {
    return this.docs.restoreVersion(userId, id, parseInt(v, 10), body?.reason);
  }

  @Put('documents/:id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.docs.updateMeta(userId, id, body);
  }

  @Post('documents/:id/view')
  view(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.recordView(userId, id);
  }

  @Post('documents/:id/download')
  download(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.recordDownload(userId, id);
  }

  // Stream do arquivo com nome amigável (download em 1 clique)
  @Get('documents/:id/file')
  async file(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('download') dl: string,
    @Res() res: any,
  ) {
    const doc: any = await this.docs.get(userId, id);
    const wantsDownload = dl === '1' || dl === 'true';
    if (wantsDownload) await this.docs.recordDownload(userId, id);
    const root = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
    const rel = String(doc.filePath || '').replace(/^\/api\/files\//, '');
    const abs = join(root, 'documents', basename(rel));
    if (!existsSync(abs)) throw new NotFoundException('Arquivo não encontrado');
    const ext = (doc.fileType ? `.${doc.fileType}` : extname(abs)) || '';
    const safeName = String(doc.name || 'documento').replace(/[\r\n"]/g, '');
    const fileName = safeName.toLowerCase().endsWith(ext.toLowerCase()) ? safeName : `${safeName}${ext}`;
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${wantsDownload ? 'attachment' : 'inline'}; filename="${fileName.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    createReadStream(abs).pipe(res);
  }


  @Post('documents/:id/acknowledge')
  ack(@CurrentUser('id') userId: string, @Param('id') id: string, @Ip() ip: string, @Req() req: any) {
    return this.docs.acknowledge(userId, id, ip, req.headers['user-agent']);
  }

  @Post('documents/:id/favorite')
  fav(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.toggleFavorite(userId, id);
  }

  @Delete('documents/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.softDelete(userId, id);
  }

  @Post('documents/:id/restore')
  restore(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.restore(userId, id);
  }

  @Get('documents/:id/timeline')
  timeline(@Param('id') id: string) {
    return this.docs.timeline(id);
  }

  // ---- Shares ----

  @Get('documents/:id/shares')
  listShares(@Param('id') id: string) {
    return this.docs.listShares(id);
  }

  @Post('documents/:id/shares')
  createShare(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: {
      targetUserIds?: string[];
      targetDepartmentIds?: string[];
      targetRoles?: AppRole[];
      scopeAll?: boolean;
      message?: string;
      priority?: SharePriority;
      requireAck?: boolean;
      allowDownload?: boolean;
      allowReshare?: boolean;
      dueAt?: string | null;
    },
  ) {
    return this.docs.createShare(userId, id, body);
  }

  @Post('documents/:id/shares/mark-viewed')
  markShareViewed(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.docs.markShareViewed(userId, id);
  }

  @Delete('shares/:shareId')
  revokeShare(@CurrentUser('id') userId: string, @Param('shareId') shareId: string) {
    return this.docs.revokeShare(userId, shareId);
  }

  // ---- Public links ----

  @Get('public-links')
  listPublicLinks(@CurrentUser('id') userId: string, @Query('documentId') documentId?: string) {
    return this.docs.listPublicLinks(documentId, undefined);
  }

  @Post('documents/:id/public-links')
  createPublicLink(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.docs.createPublicLink(userId, id, body);
  }

  @Put('public-links/:linkId')
  updatePublicLink(@CurrentUser('id') userId: string, @Param('linkId') linkId: string, @Body() body: any) {
    return this.docs.updatePublicLink(userId, linkId, body);
  }

  @Delete('public-links/:linkId')
  revokePublicLink(@CurrentUser('id') userId: string, @Param('linkId') linkId: string) {
    return this.docs.revokePublicLink(userId, linkId);
  }

  // ==== Public (no auth) ====

  @Public()
  @Get('p/:token')
  publicInfo(@Param('token') token: string) {
    return this.docs.publicLinkInfo(token);
  }

  @Public()
  @Post('p/:token/open')
  publicOpen(@Param('token') token: string, @Body() body: { password?: string; name?: string; email?: string }, @Ip() ip: string, @Req() req: any) {
    return this.docs.publicLinkOpen(token, { ...body, ip, userAgent: req.headers['user-agent'] });
  }

  @Public()
  @Post('p/:token/download')
  publicDownload(@Param('token') token: string, @Body() body: { name?: string }, @Ip() ip: string, @Req() req: any) {
    return this.docs.publicLinkDownload(token, { ...body, ip, userAgent: req.headers['user-agent'] });
  }

  @Public()
  @Post('p/:token/acknowledge')
  publicAck(@Param('token') token: string, @Body() body: { name?: string; email?: string }, @Ip() ip: string, @Req() req: any) {
    return this.docs.publicLinkAck(token, { ...body, ip, userAgent: req.headers['user-agent'] });
  }
}
