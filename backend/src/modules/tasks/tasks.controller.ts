 

import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service'; 
import { AuthGuard } from '../auth/auth.guard'; 
import { RolesGuard } from '../auth/roles.guard'; 
import { Roles } from '../auth/roles.decorator'; 
import { Role, TaskStatus, TaskPriority } from '../../common/enums'; 
import { CurrentUser } from '../auth/user.decorator'; 

@Controller('api/v1/tasks')
@UseGuards(AuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks(
    @CurrentUser() user: any,
    @Query('projectId') projectIdRaw?: string,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('search') search?: string,
  ) {
    const projectId = projectIdRaw ? parseInt(projectIdRaw, 10) : undefined;
    const page = parseInt(pageRaw || '1', 10);
    const limit = parseInt(limitRaw || '50', 10);

    const result = await this.tasksService.getTasks(user, projectId, page, limit, status, priority, search);
    return { success: true, ...result };
  }

  @Get(':id')
  async getTaskById(@CurrentUser() user: any, @Param('id') id: string) {
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    const task = await this.tasksService.getTaskById(taskId, user);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return { success: true, data: task };
  }

  @Post()
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async createTask(@CurrentUser() user: any, @Body() body: any) {
    const { title, description, priority, dueDate, projectId, assigneeId } = body;
    if (!title || !priority || !projectId) {
      throw new BadRequestException('title, priority, and projectId are required');
    }
    const task = await this.tasksService.createTask(
      title,
      description,
      priority as TaskPriority,
      dueDate,
      parseInt(projectId, 10),
      assigneeId ? parseInt(assigneeId, 10) : null,
      user,
    );
    return { success: true, message: 'Task created and assigned successfully', data: task };
  }

  @Put(':id')
  async updateTask(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() fields: any,
  ) {
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    const task = await this.tasksService.updateTask(taskId, fields, user);
    return { success: true, message: 'Task updated successfully', data: task };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async deleteTask(@CurrentUser() user: any, @Param('id') id: string) {
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    await this.tasksService.deleteTask(taskId, user);
    return { success: true, message: 'Task deleted successfully' };
  }

  @Get(':id/comments')
  async getComments(@CurrentUser() user: any, @Param('id') id: string) {
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    const comments = await this.tasksService.getComments(taskId, user);
    return { success: true, data: comments };
  }

  @Post(':id/comments')
  async addComment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const taskId = parseInt(id, 10);
    const { content } = body;
    if (isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    if (!content) {
      throw new BadRequestException('comment content is required');
    }
    const comment = await this.tasksService.addComment(taskId, content, user);
    return { success: true, message: 'Comment added successfully', data: comment };
  }
}
