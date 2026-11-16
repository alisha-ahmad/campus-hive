import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailDto } from './dto/email.dto';
// import { ResetPasswordDto } from './dto/reset-password.dto';
// import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from './email.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.verificationToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now()+24*60*60*1000),
      },
    });
    await this.emailService.sendVerificationEmail(user.email, user.firstName, rawToken);
    return {
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(dto: LoginDto){
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials'); 
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    if (!dto.token) {
      throw new BadRequestException('Verification token is required');
    }
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification link');
    }
    if (verificationToken.expiresAt < new Date()) {
      await this.prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });
      throw new BadRequestException('Invalid or expired verification link');
    }
    if (verificationToken.user.emailVerified) {
      await this.prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });
      return {
        message: 'Email is already verified',
      };
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      this.prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);
    return {
      message: 'Email verified successfully. You can now log in.',
    };
  }

  async resendVerification(dto: EmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return {
        message: 'If an account exists with this email, a verification email has been sent.',
      };
    }
    if (user.emailVerified) {
      return {
        message: 'Email is already verified.',    //reveals existence of account, change to generic upar wala msg??
      };
    }
    await this.prisma.verificationToken.deleteMany({
      where: { userId: user.id },
    });
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.verificationToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now()+24*60*60*1000),
      },
    });
    await this.emailService.sendVerificationEmail(user.email, user.firstName, token);
    return {
      message: 'If an account exists with this email, a verification email has been sent',
    };
  }
  
  async forgotPassword(dto: EmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return {
        message: 'If a user exists with this email, a password reset link has been sent.',
      };
    }
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now()+60*60*1000),
      },
    });
    await this.emailService.sendPasswordResetEmail(user.email, user.firstName, token);
    return {
      message: 'If an account with this email exists, a password reset link has been sent.',
    };
  }

  // async resetPassword(dto: ResetPasswordDto) {
  //   const tokenHash = this.hashToken(dto.token);
  //   const resetToken = await this.prisma.passwordResetToken.findUnique({
  //     where: { tokenHash },
  //   });
  //   if (!resetToken) {
  //     throw new BadRequestException('Invalid or expired password reset link');
  //   }
  //   if (resetToken.expiresAt < new Date()) {
  //     await this.prisma.passwordResetToken.delete({
  //       where: { id: resetToken.id },
  //     });
  //     throw new BadRequestException('Invalid or expired password reset link');
  //   }
  //   const hashedPassword = await bcrypt.hash(dto.password, 10);
  //   await this.prisma.$transaction([
  //     this.prisma.user.update({
  //       where: { id: resetToken.userId },
  //       data: { password: hashedPassword },
  //     }),
  //     // this.prisma.passwordResetToken.delete({
  //     //   where: { id: resetToken.id },
  //     // }),
  //     this.prisma.passwordResetToken.deleteMany({
  //       where: { userId: resetToken.userId },
  //     }),
  //   ]);
  //   return {
  //     message: 'Password reset successfully. You can now log in.',
  //   };
  // }

  // async changePassword(userId: string, dto: ChangePasswordDto) {
  //   const user = await this.prisma.user.findUnique({
  //     where: { id: userId },
  //   });
  //   if (!user) {
  //     throw new UnauthorizedException('User not found');
  //   }
  //   const passwordMatches = await bcrypt.compare(dto.currentPassword, user.password);
  //   if (!passwordMatches) {
  //     throw new UnauthorizedException('Current password is incorrect');
  //   }
  //   if (dto.currentPassword === dto.newPassword) {
  //     throw new BadRequestException('New password must be different from current password');
  //   }
  //   const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
  //   await this.prisma.user.update({
  //     where: { id: userId },
  //     data: { password: hashedPassword },
  //   });
  //   return {
  //     message: 'Password changed successfully',
  //   };
  // }
}
