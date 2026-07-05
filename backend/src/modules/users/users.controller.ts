/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../../common/enums.js';
import { CurrentUser } from '../auth/user.decorator.js';

@Controller('api/v1/users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async getUsers(
    @CurrentUser() user: any,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') search?: string,
  ) {
    const page = parseInt(pageRaw || '1', 10);
    const limit = parseInt(limitRaw || '10', 10);
    const result = await this.usersService.getUsers(user, page, limit, search);
    return { success: true, ...result };
  }

  @Post('developer')
  @Roles(Role.ADMIN, Role.CHEF_PROJET)
  async createDeveloper(@CurrentUser() user: any, @Body() body: any) {
    const { fullName, email } = body;
    if (!fullName || !email) {
      throw new BadRequestException('fullName and email are required');
    }
    const dev = await this.usersService.createDeveloper(fullName, email, user);
    return {
      success: true,
      message: 'Developer account created successfully. Invitation email sent.',
      data: dev,
    };
  }

  @Put(':id/status')
  @Roles(Role.ADMIN)
  async toggleUserStatus(@CurrentUser() user: any, @Param('id') id: string) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const updated = await this.usersService.toggleUserStatus(userId, user);
    return {
      success: true,
      message: `Account has been ${updated.isActive ? 'activated' : 'deactivated'}`,
      data: updated,
    };
  }
}
