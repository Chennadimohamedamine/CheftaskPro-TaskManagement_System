/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Put, Param, UseGuards, BadRequestException, Sse, MessageEvent } from '@nestjs/common';
import { NotificationService } from './notifications.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/user.decorator.js';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('api/v1/notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Sse('sse')
  sse(@CurrentUser() user: any): Observable<MessageEvent> {
    return this.notificationService.getEventStream(user.id).pipe(
      map((notif) => {
        return {
          data: notif
        } as MessageEvent;
      })
    );
  }

  @Get()
  async getNotifications(@CurrentUser() user: any) {
    const list = await this.notificationService.getNotificationsForUser(user.id);
    return { success: true, data: list };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { success: true, data: { count } };
  }

  @Put(':id/read')
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    const notificationId = parseInt(id, 10);
    if (isNaN(notificationId)) {
      throw new BadRequestException('Invalid notification ID');
    }
    const success = await this.notificationService.markAsRead(notificationId, user.id);
    return { success };
  }

  @Put('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationService.markAllAsRead(user.id);
    return { success: true };
  }
}
