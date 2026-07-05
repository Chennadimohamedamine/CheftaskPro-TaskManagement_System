/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, Team, TeamMember, User } from '../../database/entities.js';
import { Role, ProjectStatus } from '../../common/enums.js';
import { checkOwnership } from '../../common/guards.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,

    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly notificationService: NotificationService,
    private readonly auditLogsService: AuditLogService,
  ) {}

  // --- Create Project ---
  async createProject(
    title: string,
    description: string | null,
    status: ProjectStatus,
    teamId: number | null,
    startDate: string | null,
    dueDate: string | null,
    chef: User
  ): Promise<Project> {
    if (teamId) {
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      if (!team) {
        throw new Error('Assigned Team not found');
      }
      checkOwnership(chef, team.chefId);
    }

    const proj = new Project();
    proj.title = title;
    proj.description = description;
    proj.status = status;
    proj.chefId = chef.id;
    proj.teamId = teamId;
    proj.startDate = startDate;
    proj.dueDate = dueDate;

    const saved = await this.projectRepo.save(proj);

    await this.auditLogsService.log(chef.id, 'project_created', 'project', saved.id, {
      title,
      status
    });

    return saved;
  }

  // --- Update Project (with Status Change notification) ---
  async updateProject(
    projectId: number,
    fields: Partial<{ title: string; description: string | null; status: ProjectStatus; teamId: number | null; startDate: string | null; dueDate: string | null }>,
    actor: User
  ): Promise<Project> {
    const proj = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!proj) {
      throw new Error('Project not found');
    }

    checkOwnership(actor, proj.chefId);

    if (fields.teamId) {
      const team = await this.teamRepo.findOne({ where: { id: fields.teamId } });
      if (!team) {
        throw new Error('Assigned Team not found');
      }
      checkOwnership(actor, team.chefId);
    }

    const oldStatus = proj.status;
    
    if (fields.title !== undefined) proj.title = fields.title;
    if (fields.description !== undefined) proj.description = fields.description;
    if (fields.status !== undefined) proj.status = fields.status;
    if (fields.teamId !== undefined) proj.teamId = fields.teamId;
    if (fields.startDate !== undefined) proj.startDate = fields.startDate;
    if (fields.dueDate !== undefined) proj.dueDate = fields.dueDate;

    const updated = await this.projectRepo.save(proj);

    // If status changed, notify team members!
    if (fields.status && fields.status !== oldStatus && updated.teamId) {
      const members = await this.memberRepo.find({ where: { teamId: updated.teamId } });
      const message = `Project "${updated.title}" status has been changed from "${oldStatus}" to "${updated.status}" by Chef ${actor.fullName}.`;
      
      for (const m of members) {
        await this.notificationService.createNotification(m.developerId, 'status_changed', message);
      }
    }

    await this.auditLogsService.log(actor.id, 'project_updated', 'project', updated.id, {
      title: updated.title,
      oldStatus,
      newStatus: updated.status
    });

    return updated;
  }

  // --- Delete Project ---
  async deleteProject(projectId: number, actor: User): Promise<void> {
    const proj = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!proj) {
      throw new Error('Project not found');
    }

    checkOwnership(actor, proj.chefId);

    await this.projectRepo.remove(proj);

    await this.auditLogsService.log(actor.id, 'project_deleted', 'project', projectId, { title: proj.title });
  }

  // --- List Projects ---
  async getProjects(
    actor: User,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const query = this.projectRepo.createQueryBuilder('p');

    if (actor.role === Role.CHEF_PROJET) {
      query.where('p.chefId = :chefId', { chefId: actor.id });
    } else if (actor.role === Role.DEVELOPER) {
      const member = await this.memberRepo.findOne({ where: { developerId: actor.id } });
      if (!member) {
        return { data: [], total: 0, page: 1, totalPages: 0 };
      }
      query.where('p.teamId = :teamId', { teamId: member.teamId });
    } else if (actor.role !== Role.ADMIN) {
      throw new Error('Forbidden: Access denied');
    }

    if (search) {
      query.andWhere('(p.title LIKE :search OR p.description LIKE :search)', { search: `%${search}%` });
    }

    query.orderBy('p.id', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [rawProjs, total] = await query.getManyAndCount();

    // Populate team names
    const populated = await Promise.all(
      rawProjs.map(async (p) => {
        let teamName : string | null = null;
        if (p.teamId) {
          const team = await this.teamRepo.findOne({ where: { id: p.teamId } });
          if (team) {
            teamName = team.name;
          }
        }

        return {
          ...p,
          teamName
        };
      })
    );

    return {
      data: populated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // --- Get Project by ID ---
  async getProjectById(projectId: number, actor: User) {
    const proj = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!proj) return null;

    if (actor.role === Role.CHEF_PROJET) {
      checkOwnership(actor, proj.chefId);
    } else if (actor.role === Role.DEVELOPER) {
      const member = await this.memberRepo.findOne({ where: { developerId: actor.id } });
      if (!member || member.teamId !== proj.teamId) {
        throw new Error('Forbidden: You are not assigned to the team for this project.');
      }
    }

    let teamName : string | null = null;
    if (proj.teamId) {
      const team = await this.teamRepo.findOne({ where: { id: proj.teamId } });
      if (team) {
        teamName = team.name;
      }
    }

    return {
      ...proj,
      teamName
    };
  }

  async getProjectsCountByStatus(): Promise<{ todo: number; in_progress: number; done: number; on_hold: number }> {
    const todo = await this.projectRepo.count({ where: { status: 'todo' } });
    const in_progress = await this.projectRepo.count({ where: { status: 'in_progress' } });
    const done = await this.projectRepo.count({ where: { status: 'done' } });
    const on_hold = await this.projectRepo.count({ where: { status: 'on_hold' } });
    return { todo, in_progress, done, on_hold };
  }
}
export { ProjectsService as ProjectService };
