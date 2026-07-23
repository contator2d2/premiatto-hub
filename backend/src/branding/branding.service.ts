import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandingService {
  constructor(private prisma: PrismaService) {}

  async get() {
    let b = await this.prisma.branding.findUnique({ where: { id: 'singleton' } });
    if (!b) {
      b = await this.prisma.branding.create({ data: { id: 'singleton' } });
    }
    return b;
  }

  async update(data: Partial<{ appName: string; primaryColor: string; accentColor: string; logoUrl: string; logoDarkUrl: string; faviconUrl: string; tagline: string }>, userId: string) {
    return this.prisma.branding.upsert({
      where: { id: 'singleton' },
      update: { ...data, updatedBy: userId },
      create: { id: 'singleton', ...data, updatedBy: userId },
    });
  }
}
