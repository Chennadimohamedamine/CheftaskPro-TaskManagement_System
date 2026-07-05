 

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller'; 
import { ProjectsService } from './projects.service'; 
import { Project, Team, TeamMember, User } from '../../database/entities'; 
import { NotificationsModule } from '../notifications/notifications.module'; 
import { AuditLogsModule } from '../audit-logs/audit-logs.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Team, TeamMember, User]),
    NotificationsModule,
    AuditLogsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
