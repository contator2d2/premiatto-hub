import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ALL_MODULE_KEYS, sanitizeModuleKeys } from './access.util';

@Injectable()
export class AccessTemplatesService {
  constructor(private prisma: PrismaService) {}

  availableModules() {
    return [...ALL_MODULE_KEYS];
  }

  async list() {
    const [templates, roleDefaults, overrides] = await Promise.all([
      this.prisma.accessTemplate.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.roleAccessTemplate.findMany(),
      this.prisma.userAccessOverride.findMany(),
    ]);
    return { templates, roleDefaults, overrides };
  }

  async create(data: { name: string; description?: string; moduleKeys: string[] }) {
    if (!data.name?.trim()) throw new BadRequestException('Nome obrigatório');
    return this.prisma.accessTemplate.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        moduleKeys: sanitizeModuleKeys(data.moduleKeys),
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; moduleKeys?: string[] }) {
    const exists = await this.prisma.accessTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();
    return this.prisma.accessTemplate.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? undefined,
        description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
        moduleKeys: data.moduleKeys ? sanitizeModuleKeys(data.moduleKeys) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.accessTemplate.delete({ where: { id } });
    return { ok: true };
  }

  async setRoleDefault(role: AppRole, templateId: string | null) {
    if (!templateId) {
      await this.prisma.roleAccessTemplate.deleteMany({ where: { role } });
      return { ok: true };
    }
    return this.prisma.roleAccessTemplate.upsert({
      where: { role },
      create: { role, templateId },
      update: { templateId },
    });
  }

  async setUserOverride(userId: string, data: { templateId?: string | null; moduleKeys?: string[] | null }) {
    const clear = (data.templateId == null || data.templateId === '') && (!data.moduleKeys || data.moduleKeys.length === 0);
    if (clear) {
      await this.prisma.userAccessOverride.deleteMany({ where: { userId } });
      return { ok: true };
    }
    const payload = {
      templateId: data.templateId || null,
      moduleKeys: data.moduleKeys ? sanitizeModuleKeys(data.moduleKeys) : [],
    };
    return this.prisma.userAccessOverride.upsert({
      where: { userId },
      create: { userId, ...payload },
      update: payload,
    });
  }
}
