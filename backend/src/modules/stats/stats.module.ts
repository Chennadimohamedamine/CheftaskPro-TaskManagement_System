 

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller'; 
import { UsersModule } from '../users/users.module'; 
import { TeamsModule } from '../teams/teams.module'; 
import { ProjectsModule } from '../projects/projects.module'; 
import { Task } from '../../database/entities'; 

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
