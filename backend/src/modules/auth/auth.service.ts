 

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { Response } from 'express';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/typeorm.config'; 
import { User, VerificationToken, PasswordResetToken } from '../../database/entities'; 
import { Role } from '../../common/enums'; 
import { MailService } from '../mail/mail.service'; 
import { AuditLogService } from '../audit-logs/audit-logs.service'; 

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-access-key-123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-456';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(VerificationToken)
    private readonly verifyTokenRepo: Repository<VerificationToken>,

    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,

    private readonly mailService: MailService,

    private readonly auditLogService: AuditLogService,
  ) {}

  private get auditLogsService(): AuditLogService {
    return this.auditLogService;
  }

  // Helper to hash token
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Helper to generate access + refresh tokens
  private generateTokens(user: User) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  // Set HTTP-only Cookie for refresh token
  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  // Clear cookie
  clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
  }

  // --- 1. Register Chef ---
  async registerChef(fullName: string, email: string, password: string): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new Error('Email is already registered');
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User();
    user.fullName = fullName;
    user.email = email;
    user.passwordHash = passwordHash;
    user.role = Role.CHEF_PROJET;
    user.isEmailVerified = false;
    user.mustChangePassword = false;
    user.isActive = true;
    user.createdById = null;
    user.createdAt = new Date().toISOString();

    const savedUser = await this.userRepo.save(user);

    // Generate Verification Token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const vToken = new VerificationToken();
    vToken.userId = savedUser.id;
    vToken.tokenHash = tokenHash;
    vToken.expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    await this.verifyTokenRepo.save(vToken);

    // Send Verification Email
    const verificationUrl = `${APP_URL}/verify-email?token=${rawToken}`;
    await this.mailService.sendChefVerification(savedUser.email, verificationUrl);

    await this.auditLogsService.log(savedUser.id, 'chef_register', 'user', savedUser.id, { email: savedUser.email });

    return savedUser;
  }

  // --- 2. Verify Email ---
  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const vToken = await this.verifyTokenRepo.findOne({ where: { tokenHash } });

    if (!vToken || vToken.usedAt || new Date(vToken.expiresAt) < new Date()) {
      throw new Error('Verification token is invalid or has expired');
    }

    const user = await this.userRepo.findOne({ where: { id: vToken.userId } });
    if (!user) {
      throw new Error('User not found');
    }

    user.isEmailVerified = true;
    await this.userRepo.save(user);

    vToken.usedAt = new Date().toISOString();
    await this.verifyTokenRepo.save(vToken);

    await this.auditLogsService.log(user.id, 'email_verified', 'user', user.id, { email: user.email });
  }

  // --- 3. Resend Verification ---
  async resendVerification(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email, role: Role.CHEF_PROJET } });
    if (!user) {
      throw new Error('No chef registration found for this email');
    }

    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    // Rate limit check: max 3 per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const sentCount = await this.verifyTokenRepo.createQueryBuilder('vt')
      .where('vt.userId = :userId', { userId: user.id })
      .andWhere('vt.expiresAt > :oneHourAgo', { oneHourAgo })
      .getCount();

    if (sentCount >= 3) {
      throw new Error('Verification limit reached. Please wait an hour before requesting again.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const vToken = new VerificationToken();
    vToken.userId = user.id;
    vToken.tokenHash = tokenHash;
    vToken.expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await this.verifyTokenRepo.save(vToken);

    const verificationUrl = `${APP_URL}/verify-email?token=${rawToken}`;
    await this.mailService.sendChefVerification(user.email, verificationUrl);

    await this.auditLogsService.log(user.id, 'resend_verification', 'user', user.id);
  }

  // --- 4. Login ---
  async login(email: string, password: string, res: Response) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      await this.auditLogsService.log(null, 'failed_login', null, null, { email, reason: 'user_not_found' });
      throw new Error('Invalid email or password');
    }

    // Account active check
    if (!user.isActive) {
      throw new Error('Your account has been deactivated. Please contact your administrator.');
    }

    // Account lockout check
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / (60 * 1000));
      throw new Error(`Account temporarily locked. Try again in ${waitMinutes} minutes.`);
    }

    // Compare Password
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
        user.failedLoginAttempts = 0; // reset counter after lock
        await this.userRepo.save(user);
        await this.auditLogsService.log(user.id, 'account_locked', 'user', user.id);
        throw new Error('Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.');
      }
      await this.userRepo.save(user);
      await this.auditLogsService.log(user.id, 'failed_login', 'user', user.id, { reason: 'invalid_password' });
      throw new Error('Invalid email or password');
    }

    // Email verification check (Chef only)
    if (user.role === Role.CHEF_PROJET && !user.isEmailVerified) {
      await this.auditLogsService.log(user.id, 'failed_login', 'user', user.id, { reason: 'email_not_verified' });
      const err: any = new Error('Email not verified');
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }

    // Clear failed login state
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    // Generate & Rotate Tokens
    const { accessToken, refreshToken } = this.generateTokens(user);
    user.refreshTokenHash = this.hashToken(refreshToken);
    await this.userRepo.save(user);

    this.setRefreshTokenCookie(res, refreshToken);

    await this.auditLogsService.log(user.id, 'login', 'user', user.id);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      },
      accessToken
    };
  }

  // --- 5. Refresh Token (Rotated on each use) ---
  async refresh(refreshToken: string, res: Response) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: number };
      const user = await this.userRepo.findOne({ where: { id: decoded.userId } });

      if (!user || !user.isActive || !user.refreshTokenHash) {
        throw new Error('Unauthorized');
      }

      // Match refresh token hash
      const tokenHash = this.hashToken(refreshToken);
      if (user.refreshTokenHash !== tokenHash) {
        user.refreshTokenHash = null;
        await this.userRepo.save(user);
        await this.auditLogsService.log(user.id, 'token_reuse_detected', 'user', user.id);
        throw new Error('Token reuse detected. Access revoked.');
      }

      // Generate rotated tokens
      const tokens = this.generateTokens(user);
      user.refreshTokenHash = this.hashToken(tokens.refreshToken);
      await this.userRepo.save(user);

      this.setRefreshTokenCookie(res, tokens.refreshToken);

      return { accessToken: tokens.accessToken };
    } catch (err) {
      this.clearRefreshTokenCookie(res);
      throw new Error('Invalid or expired refresh token');
    }
  }

  // --- 6. Forgot Password (Anti-enumeration) ---
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    
    console.log(`🔒 Password reset requested for ${email}`);

    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);

      const rToken = new PasswordResetToken();
      rToken.userId = user.id;
      rToken.tokenHash = tokenHash;
      rToken.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
      await this.resetTokenRepo.save(rToken);

      const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
      await this.mailService.sendForgotPassword(user.email, resetUrl);
      
      await this.auditLogsService.log(user.id, 'password_reset_request', 'user', user.id);
    }
  }

  // --- 7. Reset Password ---
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const rToken = await this.resetTokenRepo.findOne({ where: { tokenHash } });

    if (!rToken || rToken.usedAt || new Date(rToken.expiresAt) < new Date()) {
      throw new Error('Reset token is invalid or has expired');
    }

    const user = await this.userRepo.findOne({ where: { id: rToken.userId } });
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error('Password must meet the strong guidelines (min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol)');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.refreshTokenHash = null; // Revoke all active sessions
    await this.userRepo.save(user);

    rToken.usedAt = new Date().toISOString();
    await this.resetTokenRepo.save(rToken);

    await this.mailService.sendForgotPasswordConfirm(user.email);
    await this.auditLogsService.log(user.id, 'password_reset_success', 'user', user.id);
  }

  // --- 8. Force Change Password ---
  async forceChangePassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new Error('User not found');
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error('Password must meet strength requirements (min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol)');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.refreshTokenHash = null; // Invalidate current session
    await this.userRepo.save(user);

    await this.auditLogsService.log(user.id, 'force_password_change_success', 'user', user.id);
  }

  // --- 9. Logout ---
  async logout(userId: number, res: Response): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.refreshTokenHash = null;
      await this.userRepo.save(user);
      await this.auditLogsService.log(user.id, 'logout', 'user', user.id);
    }
    this.clearRefreshTokenCookie(res);
  }

  // --- 10. Social Auth URLs ---
  getGoogleAuthUrl(origin: string): string {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    const redirectUri = `${origin}/api/v1/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  getFacebookAuthUrl(origin: string): string {
    const facebookClientId = process.env.FACEBOOK_CLIENT_ID || '';
    const redirectUri = `${origin}/api/v1/auth/facebook/callback`;
    const params = new URLSearchParams({
      client_id: facebookClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile'
    });
    return `https://www.facebook.com/v12.0/dialog/oauth?${params.toString()}`;
  }

  // --- 11. Google Callback Handler ---
  async handleGoogleCallback(code: string, origin: string, res: Response) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/v1/auth/google/callback`;

    if (!googleClientId || !googleClientSecret) {
      return this.handleSocialUserSuccess('google', 'google-test-user@example.com', 'Google Test User', res);
    }

    try {
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const { access_token } = tokenRes.data as { access_token: string };

      const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const { email, name, sub } = userRes.data as { email: string; name: string; sub: string };
      if (!email) {
        throw new Error('Google did not return an email address');
      }

      return this.handleSocialUserSuccess('google', email, name || `Google User ${sub}`, res);
    } catch (err: any) {
      console.error('❌ Google OAuth Exchange Error:', err.response?.data || err.message);
      throw new Error(`Google login failed: ${err.message}`);
    }
  }

  // --- 12. Facebook Callback Handler ---
  async handleFacebookCallback(code: string, origin: string, res: Response) {
    const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
    const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = `${origin}/api/v1/auth/facebook/callback`;

    if (!facebookClientId || !facebookClientSecret) {
      return this.handleSocialUserSuccess('facebook', 'facebook-test-user@example.com', 'Facebook Test User', res);
    }

    try {
      const tokenRes = await axios.get('https://graph.facebook.com/v12.0/oauth/access_token', {
        params: {
          client_id: facebookClientId,
          redirect_uri: redirectUri,
          client_secret: facebookClientSecret,
          code
        }
      });

      const { access_token } = tokenRes.data as { access_token: string };

      const userRes = await axios.get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,name,email',
          access_token
        }
      });

      const { email, name, id } = userRes.data as { email: string; name: string; id: string };
      const userEmail = email || `fb-${id}@example.com`;

      return this.handleSocialUserSuccess('facebook', userEmail, name || `Facebook User ${id}`, res);
    } catch (err: any) {
      console.error('❌ Facebook OAuth Exchange Error:', err.response?.data || err.message);
      throw new Error(`Facebook login failed: ${err.message}`);
    }
  }

  // Helper to complete login/signup for social users
  private async handleSocialUserSuccess(provider: string, email: string, name: string, res: Response) {
    let user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      user = new User();
      user.fullName = name;
      user.email = email;
      user.passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user.role = Role.CHEF_PROJET;
      user.isEmailVerified = true;
      user.mustChangePassword = false;
      user.isActive = true;
      user.createdById = null;
      user.createdAt = new Date().toISOString();

      user = await this.userRepo.save(user);
      await this.auditLogsService.log(user.id, `social_signup_${provider}`, 'user', user.id, { email });
    } else {
      if (!user.isActive) {
        throw new Error('This account has been deactivated. Please contact your administrator.');
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        await this.userRepo.save(user);
      }
      await this.auditLogsService.log(user.id, `social_login_${provider}`, 'user', user.id, { email });
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    user.refreshTokenHash = this.hashToken(refreshToken);
    await this.userRepo.save(user);

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      },
      accessToken
    };
  }
}
