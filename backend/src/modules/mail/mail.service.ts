 

import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      console.log('📬 SMTP Transporter initialized successfully.');
    }
    return this.transporter;
  }

  private getBaseHtml(title: string, bodyContent: string, ctaLink?: string, ctaText?: string): string {
    const buttonHtml = ctaLink && ctaText ? `
      <div style="margin: 30px 0; text-align: center;">
        <a href="${ctaLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.15);">
          ${ctaText}
        </a>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">TaskFlow Pro</h1>
                    <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 14px;">Enterprise Task Management</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 32px; color: #334155;">
                    <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600;">${title}</h2>
                    <div style="font-size: 16px; line-height: 1.6; color: #475569;">
                      ${bodyContent}
                    </div>
                    ${buttonHtml}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; line-height: 1.5;">
                    <p style="margin: 0;">This is an automated notification from TaskFlow Pro.</p>
                    <p style="margin: 4px 0 0 0;">If you did not request this email, please ignore it or contact system support.</p>
                    <p style="margin: 12px 0 0 0; font-weight: 600;">&copy; 2026 TaskFlow Pro Inc.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  async sendMail(
    to: string,
    subject: string,
    title: string,
    bodyContent: string,
    ctaLink?: string,
    ctaText?: string
  ): Promise<boolean> {
    const html = this.getBaseHtml(title, bodyContent, ctaLink, ctaText);
    const transporter = this.getTransporter();

    try {
      if (transporter) {
        await transporter.sendMail({
          from: `"TaskFlow Pro" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html
        });
        console.log(`✉️ Email successfully sent to ${to} [SMTP]`);
        return true;
      } else {
        // Fallback: log elegantly to console
        console.log('\n' + '='.repeat(80));
        console.log(`📬 [EMAIL SIMULATOR] TO: ${to}`);
        console.log(`📬 [EMAIL SIMULATOR] SUBJECT: ${subject}`);
        console.log(`📬 [EMAIL SIMULATOR] TITLE: ${title}`);
        console.log(`📬 [EMAIL SIMULATOR] CONTENT:`);
        console.log(bodyContent.replace(/<[^>]*>/g, ' ').trim());
        if (ctaLink) {
          console.log(`📬 [EMAIL SIMULATOR] CTA LINK: ${ctaLink}`);
          console.log(`📬 [EMAIL SIMULATOR] CTA TEXT: ${ctaText}`);
        }
        console.log('='.repeat(80) + '\n');
        return true;
      }
    } catch (err) {
      console.error(`❌ Failed to send email to ${to}:`, err);
      return false;
    }
  }

  // --- Core flows ---

  async sendChefVerification(to: string, verificationUrl: string) {
    await this.sendMail(
      to,
      'Verify Your Chef de Projet Account',
      'Account Verification Required',
      `<p>Thank you for registering as a <strong>Chef de Projet</strong> on TaskFlow Pro!</p>
       <p>To finalize your registration and activate your account, please click the verification button below. This link is valid for <strong>30 minutes</strong>.</p>`,
      verificationUrl,
      'Verify Account'
    );
  }

  async sendDeveloperInvitation(to: string, creatorName: string, setupUrl: string) {
    await this.sendMail(
      to,
      'Welcome to TaskFlow Pro - Complete Your Developer Account Setup',
      'Welcome to the Team!',
      `<p>Hello and welcome!</p>
       <p><strong>${creatorName}</strong> has created a Developer account for you on TaskFlow Pro.</p>
       <p>To complete your account setup and choose your secure password, please click the setup button below. This invitation is valid for <strong>24 hours</strong>.</p>
       <p>Upon your first login, you will be prompted to set a permanent password.</p>`,
      setupUrl,
      'Setup Your Account'
    );
  }

  async sendForgotPassword(to: string, resetUrl: string) {
    await this.sendMail(
      to,
      'Reset Your Password',
      'Password Reset Request',
      `<p>We received a request to reset your password for your TaskFlow Pro account.</p>
       <p>Please click the button below to set a new password. This link is valid for <strong>15 minutes</strong>.</p>
       <p>If you did not make this request, you can safely ignore this email; your password will remain unchanged.</p>`,
      resetUrl,
      'Reset Password'
    );
  }

  async sendForgotPasswordConfirm(to: string) {
    await this.sendMail(
      to,
      'Your Password Has Been Reset',
      'Password Reset Completed',
      `<p>Your TaskFlow Pro account password was successfully changed.</p>
       <p>If you did not perform this change, please immediately contact your Administrator.</p>`
    );
  }

  async sendTaskAssigned(to: string, taskTitle: string, projectName: string, dueDate: string | null, taskUrl: string) {
    const dueStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date';
    await this.sendMail(
      to,
      `New Task Assigned: ${taskTitle}`,
      'You Have Been Assigned a New Task',
      `<p>A new task has been assigned to you by your Chef de Projet.</p>
       <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin: 15px 0;">
         <tr><td style="font-weight: bold; width: 120px;">Task:</td><td>${taskTitle}</td></tr>
         <tr><td style="font-weight: bold;">Project:</td><td>${projectName}</td></tr>
         <tr><td style="font-weight: bold;">Due Date:</td><td>${dueStr}</td></tr>
       </table>
       <p>Click the button below to view and start working on your task.</p>`,
      taskUrl,
      'View Task'
    );
  }

  async sendDueReminder(to: string, taskTitle: string, projectName: string, dueDate: string) {
    await this.sendMail(
      to,
      `Task Due Reminder: ${taskTitle}`,
      'Task Approaching Due Date',
      `<p>This is a reminder that the task <strong>${taskTitle}</strong> under project <strong>${projectName}</strong> is due within the next 24 hours (Due: ${new Date(dueDate).toLocaleDateString()}).</p>
       <p>Please ensure you update the task progress on the platform.</p>`
    );
  }

  static async sendTaskAssigned(to: string, taskTitle: string, projectName: string, dueDate: string | null, taskUrl: string) {
    const service = new MailService();
    await service.sendTaskAssigned(to, taskTitle, projectName, dueDate, taskUrl);
  }

  static async sendDueReminder(to: string, taskTitle: string, projectName: string, dueDate: string) {
    const service = new MailService();
    await service.sendDueReminder(to, taskTitle, projectName, dueDate);
  }
}
