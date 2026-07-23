import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async list(query: { search?: string; folderId?: string; official?: boolean }) {
    return this.prisma.document.findMany({
      where: {
        ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
        ...(query.folderId && { folderId: query.folderId }),
        ...(query.official !== undefined && { isOfficial: query.official }),
      },
      include: { category: true, folder: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { category: true, folder: true, versions: true },
    });
    if (!doc) throw new NotFoundException();
    return doc;
  }

  async create(userId: string, data: {
    name: string;
    description?: string;
    filePath: string;
    fileType?: string;
    fileSize?: number;
    mimeType?: string;
    isOfficial?: boolean;
    requiresAcknowledgement?: boolean;
    categoryId?: string;
    folderId?: string;
  }) {
    const doc = await this.prisma.document.create({
      data: {
        ...data,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'document.upload',
        entityType: 'document',
        entityId: doc.id,
        metadata: { name: doc.name, size: doc.fileSize },
      },
    });
    return doc;
  }

  async recordDownload(userId: string, id: string) {
    await this.prisma.document.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'document.download', entityType: 'document', entityId: id },
    });
  }

  async acknowledge(userId: string, id: string) {
    await this.prisma.documentAcknowledgement.upsert({
      where: { documentId_userId: { documentId: id, userId } },
      update: { acknowledgedAt: new Date() },
      create: { documentId: id, userId },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'document.acknowledge', entityType: 'document', entityId: id },
    });
  }

  async toggleFavorite(userId: string, id: string) {
    const existing = await this.prisma.documentFavorite.findUnique({
      where: { documentId_userId: { documentId: id, userId } },
    });
    if (existing) {
      await this.prisma.documentFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.documentFavorite.create({ data: { documentId: id, userId } });
    return { favorited: true };
  }

  async remove(userId: string, id: string) {
    await this.prisma.document.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'document.delete', entityType: 'document', entityId: id },
    });
    return { ok: true };
  }
}
