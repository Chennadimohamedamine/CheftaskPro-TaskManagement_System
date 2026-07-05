/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from '../config/typeorm.config.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { UsersModule } from '../modules/users/users.module.js';
import { TeamsModule } from '../modules/teams/teams.module.js';
import { ProjectsModule } from '../modules/projects/projects.module.js';
import { TasksModule } from '../modules/tasks/tasks.module.js';
import { NotificationsModule } from '../modules/notifications/notifications.module.js';
import { AuditLogsModule } from '../modules/audit-logs/audit-logs.module.js';
import { StatsModule } from '../modules/stats/stats.module.js';
import { MailModule } from '../modules/mail/mail.module.js';

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
