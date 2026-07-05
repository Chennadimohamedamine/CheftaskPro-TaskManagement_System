 

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service'; 
import { AuthGuard } from '../auth/auth.guard'; 
import { RolesGuard } from '../auth/roles.guard'; 
import { Roles } from '../auth/roles.decorator'; 
import { Role } from '../../common/enums'; 

@Controller('api/v1/audit-logs')
@UseGuards(AuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(Role.ADMIN)
  async getLogs(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const page = parseInt(pageRaw || '1', 10);
    const limit = parseInt(limitRaw || '50', 10);
    const result = await this.auditLogsService.getLogs(page, limit);
    return { success: true, ...result };
  }
}
