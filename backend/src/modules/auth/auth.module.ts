/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { MailModule } from '../mail/mail.module.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { User, VerificationToken, PasswordResetToken } from '../../database/entities.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, VerificationToken, PasswordResetToken]),
    MailModule,
    AuditLogsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
