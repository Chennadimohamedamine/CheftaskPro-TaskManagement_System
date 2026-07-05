/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamMember, User } from '../../database/entities.js';
import { Role } from '../../common/enums.js';
import { checkOwnership } from '../../common/guards.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,

    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly auditLogsService: AuditLogService,
  ) {}

  // --- Create Team ---
  async createTeam(name: string, developerIds: number[], chef: User): Promise<Team> {
    // 1. Verify all developers belong to this chef (if creator is Chef)
    for (const devId of developerIds) {
      const dev = await this.userRepo.findOne({ where: { id: devId, role: Role.DEVELOPER } });
      if (!dev) {
        throw new Error(`Developer with ID ${devId} not found`);
      }
      if (chef.role === Role.CHEF_PROJET && dev.createdById !== chef.id) {
        throw new Error(`Developer ${dev.fullName} is not under your management`);
      }

      // 2. Enforce: "Belongs to one Team"
      const existingMember = await this.memberRepo.findOne({ where: { developerId: devId } });
      if (existingMember) {
        const otherTeam = await this.teamRepo.findOne({ where: { id: existingMember.teamId } });
        throw new Error(`Developer ${dev.fullName} already belongs to team "${otherTeam?.name || 'Another Team'}"`);
      }
    }

    // 3. Create Team
    const team = new Team();
    team.name = name;
    team.chefId = chef.id; // Chef owns it
    team.leaderId = developerIds.length > 0 ? developerIds[0] : null; // Default first developer as leader
    team.createdAt = new Date().toISOString();

    const savedTeam = await this.teamRepo.save(team);

    // 4. Save Team Members
    const members = developerIds.map((devId) => {
      const m = new TeamMember();
      m.teamId = savedTeam.id;
      m.developerId = devId;
      return m;
    });

    if (members.length > 0) {
      await this.memberRepo.save(members);
    }

    await this.auditLogsService.log(chef.id, 'team_created', 'team', savedTeam.id, {
      name,
      membersCount: developerIds.length
    });

    return savedTeam;
  }

  // --- Assign Team Leader ---
  async assignTeamLeader(teamId: number, leaderId: number, actor: User): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new Error('Team not found');
    }

    // Ownership check
    checkOwnership(actor, team.chefId);

    // Verify leader is in the team
    const isMember = await this.memberRepo.findOne({
      where: { teamId, developerId: leaderId }
    });

    if (!isMember) {
      throw new Error('Developer must be a member of the team to be designated as the Team Leader.');
    }

    team.leaderId = leaderId;
    const updatedTeam = await this.teamRepo.save(team);

    const leaderUser = await this.userRepo.findOne({ where: { id: leaderId } });

    await this.auditLogsService.log(actor.id, 'team_leader_assigned', 'team', team.id, {
      leaderName: leaderUser?.fullName,
      teamName: team.name
    });

    return updatedTeam;
  }

  // --- Delete Team ---
  async deleteTeam(teamId: number, actor: User): Promise<void> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new Error('Team not found');
    }

    // Ownership check
    checkOwnership(actor, team.chefId);

    // Delete members
    await this.memberRepo.delete({ teamId });

    // Delete Team
    await this.teamRepo.remove(team);

    await this.auditLogsService.log(actor.id, 'team_deleted', 'team', teamId, { name: team.name });
  }

  // --- List Teams ---
  async getTeams(
    actor: User,
    page = 1,
    limit = 10
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const query = this.teamRepo.createQueryBuilder('t');

    if (actor.role === Role.CHEF_PROJET) {
      query.where('t.chefId = :chefId', { chefId: actor.id });
    } else if (actor.role === Role.DEVELOPER) {
      // Find developer's team
      const member = await this.memberRepo.findOne({ where: { developerId: actor.id } });
      if (!member) {
        return { data: [], total: 0, page: 1, totalPages: 0 };
      }
      query.where('t.id = :teamId', { teamId: member.teamId });
    } else if (actor.role !== Role.ADMIN) {
      throw new Error('Forbidden: Access denied');
    }

    query.orderBy('t.id', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [rawTeams, total] = await query.getManyAndCount();

    // Populate members and leaders for response
    const populated = await Promise.all(
      rawTeams.map(async (t) => {
        const members = await this.memberRepo.find({ where: { teamId: t.id } });
        const devIds = members.map((m) => m.developerId);

        let developers: any[] = [];
        if (devIds.length > 0) {
          developers = await this.userRepo.createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: devIds })
            .select(['u.id', 'u.fullName', 'u.email', 'u.isActive'])
            .getMany();
        }

        let leader = null;
        if (t.leaderId) {
          leader = developers.find((d) => d.id === t.leaderId) || await this.userRepo.findOne({
            where: { id: t.leaderId },
            select: { id: true, fullName: true, email: true }
          });
        }

        return {
          id: t.id,
          name: t.name,
          chefId: t.chefId,
          leader,
          createdAt: t.createdAt,
          developers
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

  // --- Get Single Team ---
  async getTeamById(teamId: number, actor: User) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) return null;

    if (actor.role === Role.CHEF_PROJET) {
      checkOwnership(actor, team.chefId);
    }

    const members = await this.memberRepo.find({ where: { teamId: team.id } });
    const devIds = members.map((m) => m.developerId);

    let developers: any[] = [];
    if (devIds.length > 0) {
      developers = await this.userRepo.createQueryBuilder('u')
        .where('u.id IN (:...ids)', { ids: devIds })
        .select(['u.id', 'u.fullName', 'u.email'])
        .getMany();
    }

    let leader = null;
    if (team.leaderId) {
      leader = developers.find((d) => d.id === team.leaderId);
    }

    return {
      id: team.id,
      name: team.name,
      chefId: team.chefId,
      leader,
      createdAt: team.createdAt,
      developers
    };
  }

  async getTeamsCount(): Promise<number> {
    return await this.teamRepo.count();
  }
}
