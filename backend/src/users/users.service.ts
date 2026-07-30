import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AppRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { roles: true },
    });
    return users.map(({ passwordHash, ...u }) => ({
      ...u,
      roles: u.roles.map((r) => r.role),
    }));
  }

  async create(data: { email: string; password: string; fullName?: string; roles?: AppRole[] }) {
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new BadRequestException('E-mail já cadastrado');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName || data.email.split('@')[0],
        status: 'active',
      },
    });
    const roles = data.roles?.length ? data.roles : [AppRole.colaborador];
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId: user.id, role })),
      skipDuplicates: true,
    });
    return this.get(user.id);
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!user) throw new NotFoundException();
    const { passwordHash, ...rest } = user;
    return { ...rest, roles: user.roles.map((r) => r.role) };
  }

  async update(id: string, data: Partial<{ fullName: string; phone: string; jobTitle: string; status: any; avatarUrl: string }>) {
    await this.prisma.user.update({ where: { id }, data });
    return this.get(id);
  }

  async resetPassword(id: string, password: string) {
    if (!password || password.length < 6) throw new BadRequestException('Senha deve ter ao menos 6 caracteres');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async setRoles(id: string, roles: AppRole[]) {

    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    if (roles.length) {
      await this.prisma.userRole.createMany({
        data: roles.map((role) => ({ userId: id, role })),
        skipDuplicates: true,
      });
    }
    return this.get(id);
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
