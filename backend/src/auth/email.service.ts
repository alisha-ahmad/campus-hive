import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  
  private async sendMail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Email sending error:', error);
      throw new InternalServerErrorException('Unable to send email');
    }
  }

  async sendVerificationEmail(email: string, firstName: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2> Welcome to Campus-Hive, ${firstName}! </h2>
        <p> Your account has been created successfully. Please verify your email address before logging in. </p>
        <p>
          <a href="${verificationUrl}" style="display:inline-block; padding:12px 20px; background:#333; color:white; text-decoration:none; border-radius:4px;">
            Verify Email
          </a>
        </p>
        <p> This verification link will expire soon. </p>
        <p> If you did not create this account, you can ignore this email. </p>
        <p> — Campus-Hive </p>
      </div>
    `;
    await this.sendMail(email, 'Verify your Campus-Hive account', html);
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2> Password Reset </h2>
        <p> Hello ${firstName}, </p>
        <p> We received a request to reset your Campus-Hive password. </p>
        <p>
          <a href="${resetUrl}" style="display:inline-block; padding:12px 20px; background:#333; color:white; text-decoration:none; border-radius:4px;">
            Reset Password
          </a>
        </p>
        <p> This link will expire soon. </p>
        <p> If you did not request a password reset, you can safely ignore this email. </p>
        <p> — Campus-Hive </p>
      </div>
    `;
    await this.sendMail(email, 'Reset your Campus-Hive password', html);
  }

}

