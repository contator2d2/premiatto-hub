import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PolicyExceptionStatus, PolicyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type UpsertPolicyInput = {
  name: string;
  description?: string;
  category?: string;
  status?: PolicyStatus;
  priority?: number;
  responsibleId?: string | null;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  conditions?: any;
  permissions?: any;
  sharingRules?: any;
  securityRules?: any;
  readingRules?: any;
  versioningRules?: any;
  retentionRules?: any;
};

@Injectable()
export class PoliciesService {
  constructor(private prisma: PrismaService) {}

  // ------- Policies -------
  list(filter?: { status?: PolicyStatus; q?: string }) {
    return this.prisma.documentPolicy.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.q
          ? {
              OR: [
                { name: { contains: filter.q, mode: 'insensitive' } },
                { description: { contains: filter.q, mode: 'insensitive' } },
                { category: { contains: filter.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { folders: true, documents: true, exceptions: true } },
      },
    });
  }

  async get(id: string) {
    const policy = await this.prisma.documentPolicy.findUnique({
      where: { id },
      include: {
        folders: { select: { id: true, name: true } },
        documents: { select: { id: true, name: true } },
        exceptions: { orderBy: { createdAt: 'desc' } },
        audits: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!policy) throw new NotFoundException();
    return policy;
  }

  async create(userId: string, data: UpsertPolicyInput) {
    if (!data.name?.trim()) throw new BadRequestException('Nome obrigatório');
    const policy = await this.prisma.documentPolicy.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category?.trim() || null,
        status: data.status ?? PolicyStatus.draft,
        priority: data.priority ?? 100,
        responsibleId: data.responsibleId || null,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
        effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : null,
        conditions: data.conditions ?? {},
        permissions: data.permissions ?? {},
        sharingRules: data.sharingRules ?? {},
        securityRules: data.securityRules ?? {},
        readingRules: data.readingRules ?? {},
        versioningRules: data.versioningRules ?? {},
        retentionRules: data.retentionRules ?? {},
        createdBy: userId,
      },
    });
    await this.audit(userId, policy.id, 'create', null, policy);
    return policy;
  }

  async update(userId: string, id: string, data: Partial<UpsertPolicyInput>) {
    const before = await this.prisma.documentPolicy.findUnique({ where: { id } });
    if (!before) throw new NotFoundException();
    if (before.isSystem && data.name && data.name !== before.name) {
      throw new ForbiddenException('Não é possível renomear uma política do sistema');
    }
    const policy = await this.prisma.documentPolicy.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? undefined,
        description: data.description !== undefined ? data.description?.trim() || null : undefined,
        category: data.category !== undefined ? data.category?.trim() || null : undefined,
        status: data.status ?? undefined,
        priority: data.priority ?? undefined,
        responsibleId: data.responsibleId !== undefined ? data.responsibleId || null : undefined,
        effectiveFrom: data.effectiveFrom !== undefined ? (data.effectiveFrom ? new Date(data.effectiveFrom) : null) : undefined,
        effectiveUntil: data.effectiveUntil !== undefined ? (data.effectiveUntil ? new Date(data.effectiveUntil) : null) : undefined,
        conditions: data.conditions ?? undefined,
        permissions: data.permissions ?? undefined,
        sharingRules: data.sharingRules ?? undefined,
        securityRules: data.securityRules ?? undefined,
        readingRules: data.readingRules ?? undefined,
        versioningRules: data.versioningRules ?? undefined,
        retentionRules: data.retentionRules ?? undefined,
      },
    });
    await this.audit(userId, id, 'update', before, policy);
    return policy;
  }

  async remove(userId: string, id: string) {
    const before = await this.prisma.documentPolicy.findUnique({ where: { id } });
    if (!before) throw new NotFoundException();
    if (before.isSystem) throw new ForbiddenException('Política do sistema não pode ser removida — desative-a.');
    await this.prisma.documentPolicy.delete({ where: { id } });
    await this.audit(userId, null, 'delete', before, null, { policyId: id });
    return { ok: true };
  }

  async duplicate(userId: string, id: string) {
    const src = await this.prisma.documentPolicy.findUnique({ where: { id } });
    if (!src) throw new NotFoundException();
    let name = `${src.name} (cópia)`;
    for (let i = 2; i < 20; i++) {
      const clash = await this.prisma.documentPolicy.findUnique({ where: { name } });
      if (!clash) break;
      name = `${src.name} (cópia ${i})`;
    }
    const copy = await this.prisma.documentPolicy.create({
      data: {
        name,
        description: src.description,
        category: src.category,
        status: PolicyStatus.draft,
        priority: src.priority,
        conditions: src.conditions as any,
        permissions: src.permissions as any,
        sharingRules: src.sharingRules as any,
        securityRules: src.securityRules as any,
        readingRules: src.readingRules as any,
        versioningRules: src.versioningRules as any,
        retentionRules: src.retentionRules as any,
        createdBy: userId,
      },
    });
    await this.audit(userId, copy.id, 'duplicate', null, copy, { sourceId: id });
    return copy;
  }

  async setStatus(userId: string, id: string, status: PolicyStatus) {
    const before = await this.prisma.documentPolicy.findUnique({ where: { id } });
    if (!before) throw new NotFoundException();
    const policy = await this.prisma.documentPolicy.update({ where: { id }, data: { status } });
    await this.audit(userId, id, `status:${status}`, before, policy);
    return policy;
  }

  // ------- Test policy (dry-run) -------
  async test(id: string, sample: any) {
    const policy = await this.prisma.documentPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException();
    const cond = (policy.conditions as any) || {};
    const reasons: string[] = [];
    let matches = true;

    if (cond.categories?.length && !cond.categories.includes(sample?.category)) {
      matches = false;
      reasons.push(`Categoria não corresponde (esperado: ${cond.categories.join(', ')})`);
    }
    if (cond.confidentiality?.length && !cond.confidentiality.includes(sample?.confidentiality)) {
      matches = false;
      reasons.push(`Confidencialidade não corresponde`);
    }
    if (cond.isOfficial && !sample?.isOfficial) {
      matches = false;
      reasons.push('Documento não é oficial');
    }
    if (cond.folders?.length && !cond.folders.includes(sample?.folderId)) {
      matches = false;
      reasons.push('Pasta não corresponde');
    }

    return {
      matches,
      reasons,
      wouldApply: matches
        ? {
            permissions: policy.permissions,
            sharing: policy.sharingRules,
            security: policy.securityRules,
            reading: policy.readingRules,
            versioning: policy.versioningRules,
            retention: policy.retentionRules,
          }
        : null,
    };
  }

  // ------- Share Presets -------
  listPresets() {
    return this.prisma.sharePreset.findMany({ orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
  }

  async createPreset(data: { key: string; name: string; description?: string; config?: any }) {
    if (!data.key?.trim() || !data.name?.trim()) throw new BadRequestException('Chave e nome obrigatórios');
    return this.prisma.sharePreset.create({
      data: {
        key: data.key.trim(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        config: data.config ?? {},
      },
    });
  }

  async updatePreset(id: string, data: { name?: string; description?: string; config?: any }) {
    return this.prisma.sharePreset.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? undefined,
        description: data.description !== undefined ? data.description?.trim() || null : undefined,
        config: data.config ?? undefined,
      },
    });
  }

  async removePreset(id: string) {
    const p = await this.prisma.sharePreset.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    if (p.isSystem) throw new ForbiddenException('Preset do sistema não pode ser removido');
    await this.prisma.sharePreset.delete({ where: { id } });
    return { ok: true };
  }

  // ------- Exceptions -------
  listExceptions(status?: PolicyExceptionStatus) {
    return this.prisma.policyException.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: { policy: { select: { id: true, name: true } } },
    });
  }

  async requestException(userId: string, data: {
    policyId: string;
    documentId?: string;
    reason: string;
    requestedAction: string;
    expiresAt?: string | null;
  }) {
    if (!data.reason?.trim() || !data.requestedAction?.trim()) {
      throw new BadRequestException('Justificativa e ação são obrigatórias');
    }
    const exc = await this.prisma.policyException.create({
      data: {
        policyId: data.policyId,
        documentId: data.documentId || null,
        requestedBy: userId,
        reason: data.reason.trim(),
        requestedAction: data.requestedAction.trim(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
    await this.audit(userId, data.policyId, 'exception:request', null, exc);
    return exc;
  }

  async reviewException(userId: string, id: string, decision: 'approve' | 'reject', notes?: string) {
    const before = await this.prisma.policyException.findUnique({ where: { id } });
    if (!before) throw new NotFoundException();
    const exc = await this.prisma.policyException.update({
      where: { id },
      data: {
        status: decision === 'approve' ? PolicyExceptionStatus.approved : PolicyExceptionStatus.rejected,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes?.trim() || null,
      },
    });
    await this.audit(userId, before.policyId, `exception:${decision}`, before, exc);
    return exc;
  }

  // ------- Attach policy to folder / document -------
  async attachToFolder(userId: string, folderId: string, policyId: string | null, inheritance?: string) {
    const folder = await this.prisma.folder.update({
      where: { id: folderId },
      data: {
        policyId,
        ...(inheritance ? { policyInheritance: inheritance as any } : {}),
      },
    });
    await this.audit(userId, policyId, 'attach:folder', null, folder, { folderId });
    return folder;
  }

  async attachToDocument(userId: string, documentId: string, policyId: string | null, inheritance?: string, locked?: boolean) {
    const doc = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        policyId,
        ...(inheritance ? { policyInheritance: inheritance as any } : {}),
        ...(typeof locked === 'boolean' ? { policyLocked: locked } : {}),
      },
    });
    await this.audit(userId, policyId, 'attach:document', null, doc, { documentId });
    return doc;
  }

  // ------- Reports -------
  async reports() {
    const [active, exceptions, withoutPolicy, byCategory] = await Promise.all([
      this.prisma.documentPolicy.count({ where: { status: PolicyStatus.active } }),
      this.prisma.policyException.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.document.count({ where: { policyId: null, isDeleted: false } }),
      this.prisma.documentPolicy.groupBy({ by: ['category'], _count: { _all: true } }),
    ]);
    return { active, exceptions, documentsWithoutPolicy: withoutPolicy, byCategory };
  }

  // ------- Audit -------
  async listAudit(policyId?: string, take = 200) {
    return this.prisma.policyAudit.findMany({
      where: policyId ? { policyId } : {},
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  private async audit(
    userId: string | null,
    policyId: string | null,
    action: string,
    before: any,
    after: any,
    metadata: Record<string, any> = {},
  ) {
    try {
      await this.prisma.policyAudit.create({
        data: {
          userId: userId || null,
          policyId: policyId || null,
          action,
          before: before ?? undefined,
          after: after ?? undefined,
          metadata,
        },
      });
    } catch {
      /* auditoria não deve quebrar operação */
    }
  }
}
