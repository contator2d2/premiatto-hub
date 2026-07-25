import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async stats(@CurrentUser('id') userId: string) {
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalDocs,
      officialDocs,
      newDocs7,
      totalUsers,
      pendingAcks,
      mySharesToAck,
      unreadNotifications,
      recentEvents,
      topDocs,
    ] = await Promise.all([
      this.prisma.document.count({ where: { deletedAt: null } as any }).catch(() =>
        this.prisma.document.count(),
      ),
      this.prisma.document.count({ where: { isOfficial: true } }),
      this.prisma.document.count({ where: { createdAt: { gte: since7 } } }),
      this.prisma.user.count(),
      this.prisma.documentShare.count({
        where: { requireAck: true, acknowledgedAt: null },
      }),
      this.prisma.documentShare.count({
        where: { targetUserId: userId, requireAck: true, acknowledgedAt: null },
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.auditLog.findMany({
        where: { createdAt: { gte: since30 } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { fullName: true, email: true } } },
      }),
      this.prisma.document.findMany({
        orderBy: [{ viewCount: 'desc' }, { downloadCount: 'desc' }],
        take: 5,
        select: {
          id: true,
          name: true,
          viewCount: true,
          downloadCount: true,
          isOfficial: true,
          updatedAt: true,
        },
      }),
    ]);

    // Uploads timeline (last 14 days)
    const rawUploads = await this.prisma.document.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true },
    });
    const timeline: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      timeline.push({
        date: d.toISOString().slice(0, 10),
        count: rawUploads.filter(
          (u) => u.createdAt >= d && u.createdAt < next,
        ).length,
      });
    }

    return {
      totals: {
        documents: totalDocs,
        officials: officialDocs,
        newLast7: newDocs7,
        users: totalUsers,
        pendingAcksGlobal: pendingAcks,
        pendingAcksMine: mySharesToAck,
        unreadNotifications,
      },
      timeline,
      recentEvents,
      topDocs,
    };
  }
}
