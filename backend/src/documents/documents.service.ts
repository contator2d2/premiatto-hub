import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { AppRole, Prisma, ShareScope, SharePriority, PublicLinkStatus, Confidentiality } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type UploadInput = {
  name: string;
  description?: string;
  filePath: string;
  fileType?: string;
  fileSize?: number;
  mimeType?: string;
  folderId?: string;
  categoryId?: string;
  responsibleId?: string;
  author?: string;
  tags?: string[];
  confidentiality?: Confidentiality;
  isOfficial?: boolean;
  requiresAcknowledgement?: boolean;
  allowDownload?: boolean;
  allowShare?: boolean;
  validUntil?: string | null;
  publishedAt?: string | null;
};

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  private async logEvent(
    documentId: string,
    action: string,
    userId?: string | null,
    metadata?: any,
    versionId?: string | null,
    actorType: 'user' | 'public' = 'user',
    actorLabel?: string | null,
  ) {
    await this.prisma.documentEvent.create({
      data: {
        documentId,
        action,
        userId: userId ?? null,
        metadata: metadata ?? undefined,
        versionId: versionId ?? null,
        actorType,
        actorLabel: actorLabel ?? null,
      },
    });
  }

  // ---- Listagens principais ----

  async list(userId: string, query: {
    search?: string;
    folderId?: string | null;
    official?: boolean;
    scope?: 'all' | 'shared-with-me' | 'shared-by-me' | 'official' | 'pending-ack' | 'favorites' | 'recent' | 'trash';
    includeDeleted?: boolean;
  }) {
    const where: Prisma.DocumentWhereInput = {
      isDeleted: query.scope === 'trash' ? true : false,
      ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
      ...(query.folderId !== undefined && { folderId: query.folderId }),
      ...(query.official && { isOfficial: true }),
    };

    if (query.scope === 'shared-with-me') {
      where.shares = { some: { targetUserId: userId } };
    } else if (query.scope === 'shared-by-me') {
      where.createdBy = userId;
      where.shares = { some: {} };
    } else if (query.scope === 'official') {
      where.isOfficial = true;
    } else if (query.scope === 'favorites') {
      where.favorites = { some: { userId } };
    } else if (query.scope === 'pending-ack') {
      where.requiresAcknowledgement = true;
      where.NOT = {
        acknowledgements: { some: { userId } },
      };
    }

    const docs = await this.prisma.document.findMany({
      where,
      include: {
        category: true,
        folder: true,
        creator: { select: { id: true, fullName: true, email: true } },
        _count: { select: { shares: true, versions: true, publicLinks: true, acknowledgements: true } },
        favorites: { where: { userId }, select: { userId: true } },
      },
      orderBy: query.scope === 'recent' ? { updatedAt: 'desc' } : { createdAt: 'desc' },
      take: query.scope === 'recent' ? 30 : 500,
    });

    return docs.map((d) => ({ ...d, isFavorite: d.favorites.length > 0, favorites: undefined }));
  }

  async get(userId: string, id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        category: true,
        folder: true,
        creator: { select: { id: true, fullName: true, email: true } },
        versions: { orderBy: { version: 'desc' } },
        favorites: { where: { userId } },
      },
    });
    if (!doc) throw new NotFoundException();
    return { ...doc, isFavorite: doc.favorites.length > 0, favorites: undefined };
  }

  // ---- Upload / versionamento ----

  async create(userId: string, data: UploadInput) {
    const doc = await this.prisma.document.create({
      data: {
        name: data.name,
        description: data.description || null,
        filePath: data.filePath,
        fileType: data.fileType,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        folderId: data.folderId || null,
        categoryId: data.categoryId || null,
        responsibleId: data.responsibleId || null,
        author: data.author || null,
        tags: data.tags ?? [],
        confidentiality: data.confidentiality ?? 'internal',
        isOfficial: !!data.isOfficial,
        requiresAcknowledgement: !!data.requiresAcknowledgement,
        allowDownload: data.allowDownload ?? true,
        allowShare: data.allowShare ?? true,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
        version: 1,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    const version = await this.prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        version: 1,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileType: data.fileType,
        isCurrent: true,
        createdBy: userId,
      },
    });
    await this.logEvent(doc.id, 'document.created', userId, { name: doc.name }, version.id);
    await this.prisma.auditLog.create({
      data: { userId, action: 'document.upload', entityType: 'document', entityId: doc.id, metadata: { name: doc.name, size: doc.fileSize } },
    });
    return doc;
  }

  async addVersion(userId: string, id: string, data: {
    filePath: string;
    fileSize?: number;
    mimeType?: string;
    fileType?: string;
    changeReason?: string;
    notes?: string;
    requireNewAck?: boolean;
  }) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException();
    const next = doc.version + 1;

    // Archive current versions
    await this.prisma.documentVersion.updateMany({
      where: { documentId: id, isCurrent: true },
      data: { isCurrent: false },
    });
    const version = await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version: next,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileType: data.fileType,
        isCurrent: true,
        changeReason: data.changeReason,
        notes: data.notes,
        createdBy: userId,
      },
    });
    await this.prisma.document.update({
      where: { id },
      data: {
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileType: data.fileType,
        version: next,
        updatedBy: userId,
        publishedAt: new Date(),
      },
    });
    await this.logEvent(id, 'document.version_published', userId, { version: next, changeReason: data.changeReason }, version.id);

    // Notify users who had it shared with them
    const shares = await this.prisma.documentShare.findMany({
      where: { documentId: id, targetUserId: { not: null } },
      select: { targetUserId: true },
    });
    const notifiedSet = new Set<string>();
    for (const s of shares) {
      if (s.targetUserId && !notifiedSet.has(s.targetUserId)) {
        notifiedSet.add(s.targetUserId);
        await this.notifications.create({
          userId: s.targetUserId,
          type: 'document.new_version',
          title: `Nova versão: ${doc.name}`,
          body: `Versão ${next} publicada${data.changeReason ? ` — ${data.changeReason}` : ''}.`,
          entityType: 'document',
          entityId: id,
          url: `/documents?doc=${id}`,
        });
      }
    }
    return version;
  }

  async restoreVersion(userId: string, id: string, versionNumber: number, reason?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException();
    const target = await this.prisma.documentVersion.findFirst({ where: { documentId: id, version: versionNumber } });
    if (!target) throw new NotFoundException('Versão não encontrada');
    // Create a new version copy pointing to the target file
    return this.addVersion(userId, id, {
      filePath: target.filePath,
      fileSize: target.fileSize ?? undefined,
      mimeType: target.mimeType ?? undefined,
      fileType: target.fileType ?? undefined,
      changeReason: reason || `Restauração da versão ${versionNumber}`,
    });
  }

  async listVersions(id: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
    });
  }

  // ---- Ações ----

  async recordView(userId: string, id: string) {
    await this.prisma.document.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    // Transition shares to 'opened' for this target user
    const now = new Date();
    await this.prisma.documentShare.updateMany({
      where: {
        documentId: id,
        targetUserId: userId,
        openedAt: null,
      },
      data: { openedAt: now, status: 'opened' },
    });
    await this.logEvent(id, 'document.opened', userId);
    return { ok: true };
  }

  async recordDownload(userId: string, id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException();
    if (!doc.allowDownload) throw new ForbiddenException('Download bloqueado');
    await this.prisma.document.update({ where: { id }, data: { downloadCount: { increment: 1 } } });
    await this.logEvent(id, 'document.downloaded', userId);
    await this.prisma.auditLog.create({ data: { userId, action: 'document.download', entityType: 'document', entityId: id } });
    return { ok: true };
  }

  async acknowledge(userId: string, id: string, ip?: string, userAgent?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException();
    const protocolo = crypto.randomBytes(6).toString('hex').toUpperCase();
    const ack = await this.prisma.documentAcknowledgement.upsert({
      where: { documentId_userId_version: { documentId: id, userId, version: doc.version } },
      update: { acknowledgedAt: new Date(), ip, userAgent },
      create: { documentId: id, userId, version: doc.version, ip, userAgent },
    });
    await this.prisma.documentShare.updateMany({
      where: { documentId: id, targetUserId: userId, acknowledgedAt: null },
      data: { acknowledgedAt: new Date(), status: 'acknowledged' },
    });
    await this.logEvent(id, 'document.acknowledged', userId, { version: doc.version, protocolo });
    await this.prisma.auditLog.create({
      data: { userId, action: 'document.acknowledge', entityType: 'document', entityId: id, metadata: { version: doc.version, protocolo }, ip, userAgent },
    });
    return { ...ack, protocolo };
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

  async softDelete(userId: string, id: string) {
    await this.prisma.document.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
    });
    await this.logEvent(id, 'document.trashed', userId);
    await this.prisma.auditLog.create({ data: { userId, action: 'document.delete', entityType: 'document', entityId: id } });
    return { ok: true };
  }

  async restore(userId: string, id: string) {
    await this.prisma.document.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null, updatedBy: userId },
    });
    await this.logEvent(id, 'document.restored', userId);
    return { ok: true };
  }

  async updateMeta(userId: string, id: string, data: Partial<UploadInput>) {
    const doc = await this.prisma.document.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? (data.description || null) : undefined,
        folderId: data.folderId === undefined ? undefined : (data.folderId || null),
        categoryId: data.categoryId === undefined ? undefined : (data.categoryId || null),
        responsibleId: data.responsibleId === undefined ? undefined : (data.responsibleId || null),
        author: data.author,
        tags: data.tags,
        confidentiality: data.confidentiality,
        isOfficial: data.isOfficial,
        requiresAcknowledgement: data.requiresAcknowledgement,
        allowDownload: data.allowDownload,
        allowShare: data.allowShare,
        validUntil: data.validUntil !== undefined ? (data.validUntil ? new Date(data.validUntil) : null) : undefined,
        updatedBy: userId,
      },
    });
    await this.logEvent(id, 'document.updated', userId);
    return doc;
  }

  // ---- Confirmações de leitura ----

  async acknowledgements(id: string) {
    return this.prisma.documentAcknowledgement.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { acknowledgedAt: 'desc' },
      take: 500,
    });
  }

  // ---- Timeline / eventos ----

  async timeline(id: string) {
    return this.prisma.documentEvent.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // ---- Shares internos ----

  async createShare(userId: string, id: string, data: {
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
  }) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException();
    if (!doc.allowShare) throw new ForbiddenException('Compartilhamento bloqueado neste documento');

    const created: any[] = [];
    const notifyUsers = new Set<string>();

    const push = async (row: Prisma.DocumentShareUncheckedCreateInput) => {
      const s = await this.prisma.documentShare.create({ data: row });
      created.push(s);
    };

    if (data.scopeAll) {
      await push({
        documentId: id, scope: 'all', createdBy: userId,
        message: data.message, priority: data.priority ?? 'normal',
        requireAck: !!data.requireAck, allowDownload: data.allowDownload ?? true,
        allowReshare: !!data.allowReshare, dueAt: data.dueAt ? new Date(data.dueAt) : null,
        versionAtShare: doc.version,
      });
    }
    for (const uid of data.targetUserIds ?? []) {
      await push({
        documentId: id, scope: 'user', targetUserId: uid, createdBy: userId,
        message: data.message, priority: data.priority ?? 'normal',
        requireAck: !!data.requireAck, allowDownload: data.allowDownload ?? true,
        allowReshare: !!data.allowReshare, dueAt: data.dueAt ? new Date(data.dueAt) : null,
        versionAtShare: doc.version,
      });
      notifyUsers.add(uid);
    }
    for (const dep of data.targetDepartmentIds ?? []) {
      await push({
        documentId: id, scope: 'department', targetDepartmentId: dep, createdBy: userId,
        message: data.message, priority: data.priority ?? 'normal',
        requireAck: !!data.requireAck, allowDownload: data.allowDownload ?? true,
        allowReshare: !!data.allowReshare, dueAt: data.dueAt ? new Date(data.dueAt) : null,
        versionAtShare: doc.version,
      });
      const users = await this.prisma.user.findMany({ where: { departmentId: dep }, select: { id: true } });
      users.forEach((u) => notifyUsers.add(u.id));
    }
    for (const r of data.targetRoles ?? []) {
      await push({
        documentId: id, scope: 'role', targetRole: r, createdBy: userId,
        message: data.message, priority: data.priority ?? 'normal',
        requireAck: !!data.requireAck, allowDownload: data.allowDownload ?? true,
        allowReshare: !!data.allowReshare, dueAt: data.dueAt ? new Date(data.dueAt) : null,
        versionAtShare: doc.version,
      });
    }

    for (const uid of notifyUsers) {
      if (uid === userId) continue;
      await this.notifications.create({
        userId: uid,
        type: 'document.shared',
        title: `Documento compartilhado: ${doc.name}`,
        body: data.message || 'Você recebeu um documento.',
        entityType: 'document',
        entityId: id,
        url: `/documents?doc=${id}`,
      });
    }
    await this.logEvent(id, 'document.shared', userId, { count: created.length, notified: notifyUsers.size });
    return created;
  }

  async listShares(documentId: string) {
    return this.prisma.documentShare.findMany({
      where: { documentId },
      include: {
        target: { select: { id: true, fullName: true, email: true } },
        creator: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markShareViewed(userId: string, documentId: string) {
    const now = new Date();
    await this.prisma.documentShare.updateMany({
      where: { documentId, targetUserId: userId, viewedAt: null },
      data: { viewedAt: now, status: 'viewed' },
    });
    return { ok: true };
  }

  async revokeShare(userId: string, shareId: string) {
    await this.prisma.documentShare.delete({ where: { id: shareId } });
    return { ok: true };
  }

  // ---- Public links ----

  async createPublicLink(userId: string, documentId: string, data: {
    password?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientCompany?: string;
    allowDownload?: boolean;
    requireAck?: boolean;
    requireIdentify?: boolean;
    blockPrint?: boolean;
    expiresAt?: string | null;
    maxAccesses?: number | null;
    notes?: string;
  }) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException();

    const token = crypto.randomBytes(24).toString('base64url');
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    const link = await this.prisma.documentPublicLink.create({
      data: {
        documentId,
        token,
        passwordHash,
        recipientName: data.recipientName || null,
        recipientEmail: data.recipientEmail || null,
        recipientPhone: data.recipientPhone || null,
        recipientCompany: data.recipientCompany || null,
        allowDownload: !!data.allowDownload,
        requireAck: !!data.requireAck,
        requireIdentify: !!data.requireIdentify,
        blockPrint: !!data.blockPrint,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        maxAccesses: data.maxAccesses ?? null,
        notes: data.notes || null,
        createdBy: userId,
      },
    });
    await this.logEvent(documentId, 'public_link.created', userId, { linkId: link.id, recipient: data.recipientName });
    return link;
  }

  async listPublicLinks(documentId?: string, userId?: string) {
    return this.prisma.documentPublicLink.findMany({
      where: {
        ...(documentId && { documentId }),
        ...(userId && { createdBy: userId }),
      },
      include: {
        document: { select: { id: true, name: true } },
        _count: { select: { accesses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokePublicLink(userId: string, id: string) {
    const link = await this.prisma.documentPublicLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException();
    await this.prisma.documentPublicLink.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date() },
    });
    await this.logEvent(link.documentId, 'public_link.revoked', userId, { linkId: id });
    return { ok: true };
  }

  async updatePublicLink(userId: string, id: string, data: {
    password?: string | null;
    expiresAt?: string | null;
    maxAccesses?: number | null;
    allowDownload?: boolean;
    status?: PublicLinkStatus;
  }) {
    const link = await this.prisma.documentPublicLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException();
    const patch: any = {};
    if (data.password !== undefined) patch.passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    if (data.expiresAt !== undefined) patch.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.maxAccesses !== undefined) patch.maxAccesses = data.maxAccesses;
    if (data.allowDownload !== undefined) patch.allowDownload = data.allowDownload;
    if (data.status !== undefined) patch.status = data.status;
    const updated = await this.prisma.documentPublicLink.update({ where: { id }, data: patch });
    await this.logEvent(link.documentId, 'public_link.updated', userId, { linkId: id });
    return updated;
  }

  // ---- Public access (unauth) ----

  async publicLinkInfo(token: string) {
    const link = await this.prisma.documentPublicLink.findUnique({
      where: { token },
      include: { document: { select: { id: true, name: true, description: true } }, creator: { select: { fullName: true, email: true } } },
    });
    if (!link) throw new NotFoundException('Link inválido');
    if (link.status !== 'active') throw new ForbiddenException('Link não está mais disponível');
    if (link.expiresAt && link.expiresAt < new Date()) {
      await this.prisma.documentPublicLink.update({ where: { id: link.id }, data: { status: 'expired' } });
      throw new ForbiddenException('Link expirado');
    }
    if (link.maxAccesses && link.accessCount >= link.maxAccesses) {
      throw new ForbiddenException('Limite de acessos atingido');
    }
    return {
      id: link.id,
      documentName: link.document.name,
      documentDescription: link.document.description,
      createdByName: link.creator.fullName || link.creator.email,
      hasPassword: !!link.passwordHash,
      requireIdentify: link.requireIdentify,
      requireAck: link.requireAck,
      allowDownload: link.allowDownload,
      blockPrint: link.blockPrint,
      recipientName: link.recipientName,
      expiresAt: link.expiresAt,
    };
  }

  async publicLinkOpen(token: string, data: { password?: string; name?: string; email?: string; ip?: string; userAgent?: string }) {
    const link = await this.prisma.documentPublicLink.findUnique({ where: { token }, include: { document: true } });
    if (!link) throw new NotFoundException('Link inválido');
    if (link.status !== 'active') throw new ForbiddenException('Link indisponível');
    if (link.expiresAt && link.expiresAt < new Date()) throw new ForbiddenException('Link expirado');
    if (link.maxAccesses && link.accessCount >= link.maxAccesses) throw new ForbiddenException('Limite atingido');
    if (link.passwordHash) {
      const ok = data.password ? await bcrypt.compare(data.password, link.passwordHash) : false;
      if (!ok) {
        await this.prisma.documentPublicLink.update({
          where: { id: link.id },
          data: { failedAttempts: { increment: 1 } },
        });
        await this.prisma.publicLinkAccess.create({
          data: { linkId: link.id, action: 'password_fail', ip: data.ip, userAgent: data.userAgent, actorName: data.name, actorEmail: data.email },
        });
        await this.logEvent(link.documentId, 'public_link.password_fail', null, { linkId: link.id }, null, 'public', data.name || 'anônimo');
        throw new ForbiddenException('Senha incorreta');
      }
    }
    if (link.requireIdentify && (!data.name || !data.email)) {
      throw new BadRequestException('Identifique-se para continuar');
    }
    await this.prisma.documentPublicLink.update({
      where: { id: link.id },
      data: { accessCount: { increment: 1 } },
    });
    await this.prisma.publicLinkAccess.create({
      data: { linkId: link.id, action: 'opened', ip: data.ip, userAgent: data.userAgent, actorName: data.name, actorEmail: data.email },
    });
    await this.logEvent(link.documentId, 'public_link.opened', null, { linkId: link.id }, null, 'public', data.name || 'anônimo');
    return {
      documentName: link.document.name,
      filePath: link.document.filePath,
      mimeType: link.document.mimeType,
      fileType: link.document.fileType,
      allowDownload: link.allowDownload,
      requireAck: link.requireAck,
      blockPrint: link.blockPrint,
      version: link.document.version,
      linkId: link.id,
      documentId: link.documentId,
    };
  }

  async publicLinkDownload(token: string, data: { ip?: string; userAgent?: string; name?: string }) {
    const link = await this.prisma.documentPublicLink.findUnique({ where: { token }, include: { document: true } });
    if (!link || link.status !== 'active') throw new ForbiddenException();
    if (!link.allowDownload) throw new ForbiddenException('Download não autorizado');
    await this.prisma.document.update({ where: { id: link.documentId }, data: { downloadCount: { increment: 1 } } });
    await this.prisma.publicLinkAccess.create({
      data: { linkId: link.id, action: 'downloaded', ip: data.ip, userAgent: data.userAgent, actorName: data.name },
    });
    await this.logEvent(link.documentId, 'public_link.downloaded', null, { linkId: link.id }, null, 'public', data.name || 'anônimo');
    return { filePath: link.document.filePath };
  }

  async publicLinkAck(token: string, data: { ip?: string; userAgent?: string; name?: string; email?: string }) {
    const link = await this.prisma.documentPublicLink.findUnique({ where: { token }, include: { document: true } });
    if (!link || link.status !== 'active') throw new ForbiddenException();
    if (!link.requireAck) throw new BadRequestException('Este link não exige confirmação de leitura');
    const protocolo = crypto.randomBytes(6).toString('hex').toUpperCase();
    await this.prisma.publicLinkAccess.create({
      data: {
        linkId: link.id,
        action: 'acknowledged',
        ip: data.ip,
        userAgent: data.userAgent,
        actorName: data.name,
        actorEmail: data.email,
        metadata: { protocolo, version: link.document.version },
      },
    });
    await this.logEvent(link.documentId, 'public_link.acknowledged', null, { linkId: link.id, protocolo }, null, 'public', data.name || 'anônimo');
    return { protocolo };
  }
}
