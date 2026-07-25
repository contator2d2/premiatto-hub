import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FoldersService {
  constructor(private prisma: PrismaService) {}

  async list(query: { parentId: string | null; includeDeleted: boolean }) {
    return this.prisma.folder.findMany({
      where: {
        parentId: query.parentId,
        ...(query.includeDeleted ? {} : { isDeleted: false }),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { documents: true, children: true } } },
    });
  }

  async tree() {
    const all = await this.prisma.folder.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, parentId: true, isOfficial: true, departmentId: true },
    });
    const byParent = new Map<string | null, typeof all>();
    for (const f of all) {
      const key = f.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(f);
    }
    const build = (parentId: string | null): any[] =>
      (byParent.get(parentId) ?? []).map((f) => ({ ...f, children: build(f.id) }));
    return build(null);
  }

  async get(id: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: { parent: true, department: true },
    });
    if (!folder) throw new NotFoundException();
    // Breadcrumb
    const breadcrumb: { id: string; name: string }[] = [{ id: folder.id, name: folder.name }];
    let cur = folder.parent;
    while (cur) {
      breadcrumb.unshift({ id: cur.id, name: cur.name });
      const next = await this.prisma.folder.findUnique({ where: { id: cur.id }, include: { parent: true } });
      cur = next?.parent ?? null;
    }
    return { ...folder, breadcrumb };
  }

  async create(userId: string, data: { name: string; parentId?: string; description?: string; tags?: string[]; isOfficial?: boolean; departmentId?: string }) {
    return this.prisma.folder.create({
      data: {
        name: data.name.trim(),
        parentId: data.parentId || null,
        description: data.description?.trim() || null,
        tags: data.tags ?? [],
        isOfficial: !!data.isOfficial,
        departmentId: data.departmentId || null,
        createdBy: userId,
      },
    });
  }

  async update(id: string, data: { name?: string; parentId?: string; description?: string; tags?: string[]; isOfficial?: boolean; departmentId?: string }) {
    const exists = await this.prisma.folder.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();
    return this.prisma.folder.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? undefined,
        parentId: data.parentId === undefined ? undefined : (data.parentId || null),
        description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
        tags: data.tags,
        isOfficial: data.isOfficial,
        departmentId: data.departmentId === undefined ? undefined : (data.departmentId || null),
      },
    });
  }

  async softDelete(id: string) {
    await this.prisma.folder.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
    return { ok: true };
  }

  async restore(id: string) {
    await this.prisma.folder.update({ where: { id }, data: { isDeleted: false, deletedAt: null } });
    return { ok: true };
  }
}
