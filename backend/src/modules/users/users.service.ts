/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, PasswordResetToken, Team, TeamMember } from '../../database/entities.js';
import { Role } from '../../common/enums.js';
import { MailService } from '../mail/mail.service.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,

    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,

    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,

    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogService,
  ) {}

  // --- Create Developer (By Chef or Admin) ---
  async createDeveloper(fullName: string, email: string, creator: User): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new Error('Email is already registered on the platform.');
    }

    const passwordHash = await crypto.randomBytes(32).toString('hex'); // Stub hash until they set their password

    const user = new User();
    user.fullName = fullName;
    user.email = email;
    user.passwordHash = passwordHash; // placeholder
    user.role = Role.DEVELOPER;
    user.isEmailVerified = true; // Created by chef, verified implicitly
    user.mustChangePassword = true;
    user.isActive = true;
    user.createdById = creator.id;
    user.createdAt = new Date().toISOString();

    const savedUser = await this.userRepo.save(user);

    // Create a Password Reset / Setup Token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const resetToken = new PasswordResetToken();
    resetToken.userId = savedUser.id;
    resetToken.tokenHash = tokenHash;
    resetToken.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    await this.resetTokenRepo.save(resetToken);

    // Send Invitation Email
    const setupUrl = `${APP_URL}/auth/reset-password?token=${rawToken}`;
    await this.mailService.sendDeveloperInvitation(savedUser.email, creator.fullName, setupUrl);

    await this.auditLogsService.log(creator.id, 'developer_created', 'user', savedUser.id, {
      developerEmail: savedUser.email,
      createdBy: creator.fullName
    });

    return savedUser;
  }

  // --- Deactivate / Reactivate User (Admin Only) ---
  async toggleUserStatus(userId: number, actor: User): Promise<User> {
    if (actor.role !== Role.ADMIN) {
      throw new Error('Forbidden: Only Administrators can change account statuses');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === Role.ADMIN) {
      throw new Error('Forbidden: Cannot deactivate System Administrator');
    }

    user.isActive = !user.isActive;
    
    // Revoke refresh token on deactivation
    if (!user.isActive) {
      user.refreshTokenHash = null;
    }

    const updatedUser = await this.userRepo.save(user);
    
    await this.auditLogsService.log(
      actor.id,
      user.isActive ? 'user_activated' : 'user_deactivated',
      'user',
      user.id,
      { email: user.email }
    );

    return updatedUser;
  }

  // --- List Users (Admin: All, Chef: Created Developers Only) ---
  async getUsers(
    actor: User,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const query = this.userRepo.createQueryBuilder('u');

    if (actor.role === Role.CHEF_PROJET) {
      // Scoped: Chef can only see developers they created
      query.where('u.createdById = :chefId', { chefId: actor.id });
    } else if (actor.role !== Role.ADMIN) {
      throw new Error('Forbidden: Access denied');
    }

    if (search) {
      query.andWhere('(u.fullName LIKE :search OR u.email LIKE :search)', { search: `%${search}%` });
    }

    query.orderBy('u.id', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [rawUsers, total] = await query.getManyAndCount();

    // Attach developer team details if role is developer
    const usersWithTeam = await Promise.all(
      rawUsers.map(async (u) => {
        let teamInfo : { id: number; name: string } | null = null;
        let creatorEmail : string | null = null;

        if (u.role === Role.DEVELOPER) {
          const member = await this.memberRepo.findOne({ where: { developerId: u.id } });
          if (member) {
            const team = await this.teamRepo.findOne({ where: { id: member.teamId } });
            if (team) {
              teamInfo = { id: team.id, name: team.name };
            }
          }
          if (u.createdById) {
            const creator = await this.userRepo.findOne({ where: { id: u.createdById } });
            if (creator) {
              creatorEmail = creator.email;
            }
          }
        }

        return {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          isEmailVerified: u.isEmailVerified,
          createdAt: u.createdAt,
          team: teamInfo,
          creatorEmail
        };
      })
    );

    return {
      data: usersWithTeam,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getChefsAndDevsCount(): Promise<{ totalChefs: number; totalDevs: number }> {
    const totalChefs = await this.userRepo.count({ where: { role: Role.CHEF_PROJET } });
    const totalDevs = await this.userRepo.count({ where: { role: Role.DEVELOPER } });
    return { totalChefs, totalDevs };
  }
}
export { UsersService as UserService };
