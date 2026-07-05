/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role, ProjectStatus } from '../../common/enums.js';
import { CurrentUser } from '../auth/user.decorator.js';

@Controller('api/v1/projects')
@UseGuards(AuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getProjects(
    @CurrentUser() user: any,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') search?: string,
  ) {
    const page = parseInt(pageRaw || '1', 10);
    const limit = parseInt(limitRaw || '50', 10);
    const result = await this.projectsService.getProjects(user, page, limit, search);
    return { success: true, ...result };
  }

  @Get(':id')
  async getProjectById(@CurrentUser() user: any, @Param('id') id: string) {
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }
    const project = await this.projectsService.getProjectById(projectId, user);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return { success: true, data: project };
  }

  @Post()
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async createProject(@CurrentUser() user: any, @Body() body: any) {
    const { title, description, status, teamId, startDate, dueDate } = body;
    if (!title || !status) {
      throw new BadRequestException('title and status are required');
    }
    const project = await this.projectsService.createProject(
      title,
      description,
      status as ProjectStatus,
      teamId ? parseInt(teamId, 10) : null,
      startDate,
      dueDate,
      user,
    );
    return { success: true, message: 'Project created successfully', data: project };
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async updateProject(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() fields: any,
  ) {
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }
    const updated = await this.projectsService.updateProject(projectId, fields, user);
    return { success: true, message: 'Project updated successfully', data: updated };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async deleteProject(@CurrentUser() user: any, @Param('id') id: string) {
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }
    await this.projectsService.deleteProject(projectId, user);
    return { success: true, message: 'Project deleted successfully' };
  }
}
