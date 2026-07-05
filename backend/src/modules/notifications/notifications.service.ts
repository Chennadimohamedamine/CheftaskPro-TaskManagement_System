 

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities'; 
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable()
export class NotificationService {
  private readonly subject = new Subject<Notification>();

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async createNotification(userId: number, type: string, message: string): Promise<Notification> {
    const notif = new Notification();
    notif.userId = userId;
    notif.type = type;
    notif.message = message;
    notif.isRead = false;
    notif.createdAt = new Date().toISOString();

    const saved = await this.repo.save(notif);
    this.subject.next(saved);
    return saved;
  }

  getEventStream(userId: number): Observable<Notification> {
    return this.subject.asObservable().pipe(
      filter((notif) => notif.userId === userId)
    );
  }

  async getNotificationsForUser(userId: number, limit = 50): Promise<Notification[]> {
    return await this.repo.find({
      where: { userId },
      order: { id: 'DESC' },
      take: limit
    });
  }

  async markAsRead(id: number, userId: number): Promise<boolean> {
    const notif = await this.repo.findOne({ where: { id, userId } });
    if (!notif) return false;

    notif.isRead = true;
    await this.repo.save(notif);
    return true;
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repo.update({ userId }, { isRead: true });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return await this.repo.count({ where: { userId, isRead: false } });
  }
}
export { NotificationService as NotificationsService };
