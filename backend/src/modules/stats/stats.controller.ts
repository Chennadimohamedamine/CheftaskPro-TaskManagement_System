 

import { Controller, Get, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../auth/auth.guard'; 
import { UsersService } from '../users/users.service'; 
import { TeamsService } from '../teams/teams.service'; 
import { ProjectsService } from '../projects/projects.service'; 
import { Task } from '../../database/entities'; 

@Controller('api/v1/stats')
@UseGuards(AuthGuard)
export class StatsController {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  @Get()
  async getStats() {
    const userCount = await this.usersService.getChefsAndDevsCount();
    const teamCount = await this.teamsService.getTeamsCount();
    const projectStats = await this.projectsService.getProjectsCountByStatus();

    // Query for total tasks counts
    const totalTasks = await this.taskRepo.count();
    const todoTasks = await this.taskRepo.count({ where: { status: 'todo' } });
    const inProgressTasks = await this.taskRepo.count({ where: { status: 'in_progress' } });
    const doneTasks = await this.taskRepo.count({ where: { status: 'done' } });

    return {
      success: true,
      data: {
        users: userCount,
        teamsCount: teamCount,
        projects: projectStats,
        tasks: {
          total: totalTasks,
          todo: todoTasks,
          in_progress: inProgressTasks,
          done: doneTasks
        }
      }
    };
  }
}
