import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('unread') unread?: string) {
    return this.service.list(userId, unread === 'true');
  }

  @Get('count')
  count(@CurrentUser('id') userId: string) {
    return this.service.count(userId);
  }

  @Post(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.markRead(userId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.service.markAllRead(userId);
  }
}
