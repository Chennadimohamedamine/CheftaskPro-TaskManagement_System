/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Get, Body, Req, Res, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { CurrentUser } from './user.decorator.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    const { fullName, email, password } = body;
    if (!fullName || !email || !password) {
      throw new BadRequestException('All registration fields are required');
    }
    const user = await this.authService.registerChef(fullName, email, password);
    return {
      success: true,
      message: 'Chef account registered successfully. Please check your email for the verification link.',
      data: { id: user.id, email: user.email }
    };
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: any) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    try {
      const result = await this.authService.login(email, password, res);
      return { success: true, message: 'Logged in successfully', data: result };
    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        res.status(403);
        return { success: false, message: err.message, code: 'EMAIL_NOT_VERIFIED' };
      }
      throw err;
    }
  }

  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token missing');
    }
    const result = await this.authService.refresh(refreshToken, res);
    return { success: true, data: result };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@CurrentUser() user: any, @Res({ passthrough: true }) res: any) {
    await this.authService.logout(user.id, res);
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }
    await this.authService.verifyEmail(token);
    return { success: true, message: 'Email verified successfully! You can now log in.' };
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: any) {
    const { email } = body;
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    await this.authService.resendVerification(email);
    return { success: true, message: 'Verification email resent successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: any) {
    const { email } = body;
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    await this.authService.forgotPassword(email);
    return { success: true, message: 'If an active account exists under this email address, a password reset instruction has been sent.' };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    const { token, password } = body;
    if (!token || !password) {
      throw new BadRequestException('Token and new password are required');
    }
    await this.authService.resetPassword(token, password);
    return { success: true, message: 'Password reset successfully' };
  }

  @Post('force-change-password')
  @UseGuards(AuthGuard)
  async forceChangePassword(@CurrentUser() user: any, @Body() body: any) {
    const { password } = body;
    if (!password) {
      throw new BadRequestException('New password is required');
    }
    await this.authService.forceChangePassword(user.id, password);
    return { success: true, message: 'Password updated successfully. Please log in again.' };
  }

  @Get('google/url')
  async googleUrl(@Query('origin') originRaw?: string) {
    const origin = originRaw || 'http://localhost:3000';
    const url = this.authService.getGoogleAuthUrl(origin);
    return { success: true, url };
  }

  @Get('facebook/url')
  async facebookUrl(@Query('origin') originRaw?: string) {
    const origin = originRaw || 'http://localhost:3000';
    const url = this.authService.getFacebookAuthUrl(origin);
    return { success: true, url };
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Req() req: any,
    @Res() res: any
  ) {
    const origin = `${req.protocol}://${req.get('host')}`;
    try {
      if (!code) {
        throw new Error('Code query parameter is missing');
      }
      const result = await this.authService.handleGoogleCallback(code, origin, res);
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0;">
            <div style="text-align: center; padding: 24px; background-color: white; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <h2 style="color: #1e293b; margin-bottom: 8px;">Connexion Google réussie</h2>
              <p style="color: #64748b; font-size: 14px;">Cette fenêtre se ferme automatiquement...</p>
              <script>
                if (window.opener) {
                   window.opener.postMessage({
                     type: 'OAUTH_AUTH_SUCCESS',
                     accessToken: '${result.accessToken}',
                     user: ${JSON.stringify(result.user)}
                   }, '*');
                   window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (err: any) {
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0;">
            <div style="text-align: center; padding: 24px; background-color: white; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px;">
              <h2 style="color: #ef4444; margin-bottom: 8px;">Échec de la connexion</h2>
              <p style="color: #64748b; font-size: 14px;">${err.message}</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Cette fenêtre se ferme automatiquement...</p>
              <script>
                if (window.opener) {
                   window.opener.postMessage({
                     type: 'OAUTH_AUTH_FAILURE',
                     message: '${err.message}'
                   }, '*');
                   window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }
  }

  @Get('facebook/callback')
  async facebookCallback(
    @Query('code') code: string,
    @Req() req: any,
    @Res() res: any
  ) {
    const origin = `${req.protocol}://${req.get('host')}`;
    try {
      if (!code) {
        throw new Error('Code query parameter is missing');
      }
      const result = await this.authService.handleFacebookCallback(code, origin, res);
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0;">
            <div style="text-align: center; padding: 24px; background-color: white; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <h2 style="color: #1e293b; margin-bottom: 8px;">Connexion Facebook réussie</h2>
              <p style="color: #64748b; font-size: 14px;">Cette fenêtre se ferme automatiquement...</p>
              <script>
                if (window.opener) {
                   window.opener.postMessage({
                     type: 'OAUTH_AUTH_SUCCESS',
                     accessToken: '${result.accessToken}',
                     user: ${JSON.stringify(result.user)}
                   }, '*');
                   window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (err: any) {
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0;">
            <div style="text-align: center; padding: 24px; background-color: white; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px;">
              <h2 style="color: #ef4444; margin-bottom: 8px;">Échec de la connexion</h2>
              <p style="color: #64748b; font-size: 14px;">${err.message}</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Cette fenêtre se ferme automatiquement...</p>
              <script>
                if (window.opener) {
                   window.opener.postMessage({
                     type: 'OAUTH_AUTH_FAILURE',
                     message: '${err.message}'
                   }, '*');
                   window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }
  }
}
