/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller.js';
import { UsersModule } from '../users/users.module.js';
import { TeamsModule } from '../teams/teams.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { Task } from '../../database/entities.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    forwardRef(() => UsersModule),
    forwardRef(() => TeamsModule),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [StatsController],
})
export class StatsModule {}
