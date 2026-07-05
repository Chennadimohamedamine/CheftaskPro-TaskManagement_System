 

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller'; 
import { TasksService } from './tasks.service'; 
import { Task, Project, User, Comment, TeamMember } from '../../database/entities'; 
import { MailModule } from '../mail/mail.module'; 
import { NotificationsModule } from '../notifications/notifications.module'; 
import { AuditLogsModule } from '../audit-logs/audit-logs.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, User, Comment, TeamMember]),
    MailModule,
    NotificationsModule,
    AuditLogsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
