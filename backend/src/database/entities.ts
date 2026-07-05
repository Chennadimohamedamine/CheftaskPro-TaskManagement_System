/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  fullName!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 50 })
  role!: string; // 'admin' | 'chef_projet' | 'developer'

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'integer', nullable: true })
  @Index()
  createdById!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenHash!: string | null;

  @Column({ type: 'integer', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lockedUntil!: string | null;

  @Column({ type: 'varchar', length: 100 })
  createdAt!: string;
}

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'integer' })
  @Index()
  chefId!: number;

  @Column({ type: 'integer', nullable: true })
  @Index()
  leaderId!: number | null;

  @Column({ type: 'varchar', length: 100 })
  createdAt!: string;
}

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  @Index()
  teamId!: number;

  @Column({ type: 'integer' })
  @Index()
  developerId!: number;
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50 })
  status!: string; // 'todo' | 'in_progress' | 'done' | 'on_hold'

  @Column({ type: 'integer' })
  @Index()
  chefId!: number;

  @Column({ type: 'integer', nullable: true })
  @Index()
  teamId!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  startDate!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dueDate!: string | null;
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50 })
  status!: string; // 'todo' | 'in_progress' | 'done'

  @Column({ type: 'varchar', length: 50 })
  priority!: string; // 'low' | 'medium' | 'high'

  @Column({ type: 'varchar', length: 100, nullable: true })
  dueDate!: string | null;

  @Column({ type: 'integer' })
  @Index()
  projectId!: number;

  @Column({ type: 'integer', nullable: true })
  @Index()
  assigneeId!: number | null;

  @Column({ type: 'varchar', length: 100 })
  createdAt!: string;

  @Column({ type: 'varchar', length: 100 })
  updatedAt!: string;
}

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  @Index()
  taskId!: number;

  @Column({ type: 'integer' })
  @Index()
  userId!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 100 })
  createdAt!: string;
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  @Index()
  userId!: number;

  @Column({ type: 'varchar', length: 100 })
  type!: string; // 'task_assigned' | 'status_changed' | 'reminder'

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'varchar', length: 100 })
  createdAt!: string;
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer', nullable: true })
  @Index()
  actorId!: number | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string; // 'login' | 'failed_login' | 'password_reset' | 'dev_created' | ...

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetType!: string | null; // 'user' | 'project' | 'task' | ...

  @Column({ type: 'integer', nullable: true })
  targetId!: number | null;

  @Column({ type: 'text', nullable: true })
  metadata!: string | null; // JSON string

  @Column({ type: 'varchar', length: 100 })
  createdAt!: string;
}

@Entity('verification_tokens')
export class VerificationToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  @Index()
  userId!: number;

  @Column({ type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 100 })
  expiresAt!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  usedAt!: string | null;
}

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  @Index()
  userId!: number;

  @Column({ type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 100 })
  expiresAt!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  usedAt!: string | null;
}
