 

import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { TeamsService } from './teams.service'; 
import { AuthGuard } from '../auth/auth.guard'; 
import { RolesGuard } from '../auth/roles.guard'; 
import { Roles } from '../auth/roles.decorator'; 
import { Role } from '../../common/enums'; 
import { CurrentUser } from '../auth/user.decorator'; 

@Controller('api/v1/teams')
@UseGuards(AuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async getTeams(
    @CurrentUser() user: any,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const page = parseInt(pageRaw || '1', 10);
    const limit = parseInt(limitRaw || '50', 10);
    const result = await this.teamsService.getTeams(user, page, limit);
    return { success: true, ...result };
  }

  @Get(':id')
  async getTeamById(@CurrentUser() user: any, @Param('id') id: string) {
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      throw new BadRequestException('Invalid team ID');
    }
    const team = await this.teamsService.getTeamById(teamId, user);
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return { success: true, data: team };
  }

  @Post()
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async createTeam(@CurrentUser() user: any, @Body() body: any) {
    const { name, developerIds } = body;
    if (!name || !developerIds) {
      throw new BadRequestException('name and developerIds are required');
    }
    const team = await this.teamsService.createTeam(name, developerIds, user);
    return { success: true, message: 'Team created successfully', data: team };
  }

  @Put(':id/leader')
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async assignTeamLeader(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const teamId = parseInt(id, 10);
    const leaderId = parseInt(body.leaderId, 10);
    if (isNaN(teamId) || isNaN(leaderId)) {
      throw new BadRequestException('Invalid team ID or leader ID');
    }
    const team = await this.teamsService.assignTeamLeader(teamId, leaderId, user);
    return { success: true, message: 'Team leader assigned successfully', data: team };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async deleteTeam(@CurrentUser() user: any, @Param('id') id: string) {
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      throw new BadRequestException('Invalid team ID');
    }
    await this.teamsService.deleteTeam(teamId, user);
    return { success: true, message: 'Team deleted successfully' };
  }
}
