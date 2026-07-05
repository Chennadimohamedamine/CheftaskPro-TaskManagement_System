 

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from '../config/typeorm.config'; 
import { AuthModule } from '../modules/auth/auth.module'; 
import { UsersModule } from '../modules/users/users.module'; 
import { TeamsModule } from '../modules/teams/teams.module'; 
import { ProjectsModule } from '../modules/projects/projects.module'; 
import { TasksModule } from '../modules/tasks/tasks.module'; 
import { NotificationsModule } from '../modules/notifications/notifications.module'; 
import { AuditLogsModule } from '../modules/audit-logs/audit-logs.module'; 
import { StatsModule } from '../modules/stats/stats.module'; 
import { MailModule } from '../modules/mail/mail.module'; 

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({}),
      dataSourceFactory: async () => {
        return AppDataSource;
      },
    }),
    AuthModule,
    UsersModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    NotificationsModule,
    AuditLogsModule,
    StatsModule,
    MailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
