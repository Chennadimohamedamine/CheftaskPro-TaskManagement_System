 

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller'; 
import { AuthService } from './auth.service'; 
import { AuthGuard } from './auth.guard'; 
import { RolesGuard } from './roles.guard'; 
import { MailModule } from '../mail/mail.module'; 
import { AuditLogsModule } from '../audit-logs/audit-logs.module'; 
import { User, VerificationToken, PasswordResetToken } from '../../database/entities'; 

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
