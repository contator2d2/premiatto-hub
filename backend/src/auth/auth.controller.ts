import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const REFRESH_COOKIE = 'pc_refresh';

function setRefreshCookie(res: Response, token: string, ttlMs: number) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: ttlMs,
  });
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // Registro público desabilitado. Novos usuários são criados via /users por admins.


  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const t = await this.auth.login(dto);
    setRefreshCookie(res, t.refreshToken, t.refreshTtlMs);
    return { accessToken: t.accessToken };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const t = await this.auth.refresh(raw);
    setRefreshCookie(res, t.refreshToken, t.refreshTtlMs);
    return { accessToken: t.accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    await this.auth.changePassword(userId, body.currentPassword, body.newPassword);
    return { ok: true };
  }
}
