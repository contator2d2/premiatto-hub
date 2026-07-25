import { Controller, Get, Query } from '@nestjs/common';
import { AppRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('audit')
@Roles(AppRole.super_admin, AppRole.admin)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as any).gte = new Date(from);
      if (to) (where.createdAt as any).lte = new Date(to);
    }
    if (q) {
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '200', 10), 1000),
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
  }

  @Get('summary')
  async summary() {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total, last30, byAction] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: since30 } } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { _all: true },
        where: { createdAt: { gte: since30 } },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
    ]);
    return {
      total,
      last30,
      topActions: byAction.map((b) => ({ action: b.action, count: b._count._all })),
    };
  }
}
