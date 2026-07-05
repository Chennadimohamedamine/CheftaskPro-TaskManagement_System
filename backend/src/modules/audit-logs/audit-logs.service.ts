 

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities'; 

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    actorId: number | null,
    action: string,
    targetType: string | null = null,
    targetId: number | null = null,
    metadata: any = null
  ): Promise<AuditLog> {
    const auditLog = new AuditLog();
    auditLog.actorId = actorId;
    auditLog.action = action;
    auditLog.targetType = targetType;
    auditLog.targetId = targetId;
    auditLog.metadata = metadata ? JSON.stringify(metadata) : null;
    auditLog.createdAt = new Date().toISOString();

    console.log(`[AUDIT LOG] ${action} by actor ${actorId || 'SYSTEM'}:`, metadata);
    return await this.repo.save(auditLog);
  }

  async getLogs(page = 1, limit = 50): Promise<{ data: AuditLog[]; total: number; page: number; totalPages: number }> {
    const [data, total] = await this.repo.findAndCount({
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}
export { AuditLogService as AuditLogsService };
