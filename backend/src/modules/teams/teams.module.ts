 

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsController } from './teams.controller'; 
import { TeamsService } from './teams.service'; 
import { Team, TeamMember, User } from '../../database/entities'; 
import { AuditLogsModule } from '../audit-logs/audit-logs.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, User]),
    AuditLogsModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
