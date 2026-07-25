import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AppRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseTtlToMs(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) return 7 * 24 * 3600 * 1000;
    const n = parseInt(m[1], 10);
    const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
    return n * mult!;
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('E-mail já cadastrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName || dto.email.split('@')[0],
        status: 'active',
      },
    });
    await this.prisma.userRole.create({
      data: { userId: user.id, role: AppRole.colaborador },
    });
    return this.issueTokens(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status !== 'active') throw new UnauthorizedException('Conta inativa');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user.id);
  }

  async issueTokens(userId: string) {
    const roles = await this.prisma.userRole.findMany({ where: { userId } });
    const roleList = roles.map((r) => r.role);
    const accessToken = this.jwt.sign(
      { sub: userId, roles: roleList },
      {
        secret: process.env.JWT_SECRET || 'dev-secret',
        expiresIn: process.env.JWT_ACCESS_TTL || '15m',
      },
    );
    const refreshRaw = crypto.randomBytes(48).toString('hex');
    const ttlMs = this.parseTtlToMs(process.env.JWT_REFRESH_TTL || '7d');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshRaw),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return { accessToken, refreshToken: refreshRaw, refreshTtlMs: ttlMs };
  }

  async refresh(refreshRaw: string) {
    if (!refreshRaw) throw new UnauthorizedException('Sem refresh token');
    const tokenHash = this.hashToken(refreshRaw);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh inválido');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(record.userId);
  }

  async logout(refreshRaw?: string) {
    if (!refreshRaw) return;
    const tokenHash = this.hashToken(refreshRaw);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, department: true, company: true },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...rest } = user;
    const roles = user.roles.map((r) => r.role);
    const { computeAllowedModules } = await import('../access-templates/access.util');
    const allowedModules = await computeAllowedModules(this.prisma, user.id, roles);
    return { ...rest, roles, allowedModules };
  }

  async changePassword(userId: string, current: string, next: string) {
    if (!next || next.length < 6) throw new BadRequestException('Senha curta');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Senha atual incorreta');
    const passwordHash = await bcrypt.hash(next, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
