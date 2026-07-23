import { Controller, Get, Query } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('audit')
@Roles(AppRole.super_admin, AppRole.admin)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '200', 10), 1000),
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
  }
}
