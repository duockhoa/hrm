import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { generateOtp } from 'src/common/utils/otp.util';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}
  async login(user: any) {
    const roles = user.userRoles.map((userRole) => userRole.roles.name);
    const permissions = user.userRoles.flatMap((ur) =>
      ur.roles.rolePermissions.map((rp) => rp.permissions.name),
    );
    const payload = {
      username: user.username,
      sub: user.id,
      roles,
      permissions,
    };
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '70d',
    });
    await this.prisma.tokens.create({
      data: {
        user_id: user.id,
        refreshToken: refreshToken,
      },
    });
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshTokenDto: any) {
    const { refreshToken } = refreshTokenDto;
    console.log('Refresh token received:', refreshToken);
    const storedToken = await this.prisma.tokens.findUnique({
      where: { refreshToken },
    });
    if (!storedToken) {
      return null;
    }
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (e) {
      return null;
    }
    const newAccessToken = this.jwtService.sign({
      username: payload.username,
      sub: payload.sub,
      roles: payload.roles,
      permissions: payload.permissions,
    });
    return {
      accessToken: newAccessToken,
    };
  }

  async logout(refreshToken: string) {
    const deleteResponse = await this.prisma.tokens.deleteMany({
      where: { refreshToken },
    });
    return deleteResponse.count > 0;
  }

  async createResetPasswordOTP(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });
    if (!user) {
      return null;
    }
    const OTP = generateOtp();
    const hashOTP = await bcrypt.hash(OTP, 10);
    const expiresInMinutes =
      Number(process.env.PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const otpRecord = await this.prisma.passwordResetOTPs.create({
      data: {
        user_id: user.id,
        hash_OTP: hashOTP,
        expires_at: expiresAt,
      },
    });

    try {
      await this.emailService.sendEmail({
        recipients: email,
        subject: 'Ma OTP dat lai mat khau',
        message: `Ma OTP dat lai mat khau cua ban la: ${OTP}. Ma co hieu luc trong ${expiresInMinutes} phut.`,
        html: `
          <p>Ma OTP dat lai mat khau cua ban la:</p>
          <p><strong style="font-size: 24px; letter-spacing: 4px;">${OTP}</strong></p>
          <p>Ma co hieu luc trong ${expiresInMinutes} phut.</p>
          <p>Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.</p>
        `,
      });
    } catch (error) {
      await this.prisma.passwordResetOTPs
        .delete({
          where: { id: otpRecord.id },
        })
        .catch(() => undefined);
      throw error;
    }

    await this.prisma.passwordResetOTPs.updateMany({
      where: {
        user_id: user.id,
        id: { not: otpRecord.id },
        used_at: null,
      },
      data: { used_at: new Date() },
    });

    return true;
  }

  async verifyResetPasswordOTP(email: string, otp: string) {
    const validation = await this.getValidResetPasswordOTP(email, otp);
    return Boolean(validation);
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const validation = await this.getValidResetPasswordOTP(email, otp);
    if (!validation) {
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const usedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updatedOtp = await tx.passwordResetOTPs.updateMany({
        where: {
          id: validation.otpRecord.id,
          used_at: null,
          expires_at: { gt: new Date() },
        },
        data: { used_at: usedAt },
      });

      if (updatedOtp.count !== 1) {
        return false;
      }

      await tx.users.update({
        where: { id: validation.user.id },
        data: { password: hashedPassword },
      });

      await tx.passwordResetOTPs.updateMany({
        where: {
          user_id: validation.user.id,
          id: { not: validation.otpRecord.id },
          used_at: null,
        },
        data: { used_at: usedAt },
      });

      return true;
    });
  }

  private async getValidResetPasswordOTP(email: string, otp: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });
    if (!user) {
      return null;
    }
    const otpRecord = await this.prisma.passwordResetOTPs.findFirst({
      where: {
        user_id: user.id,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { expires_at: 'desc' },
    });
    if (!otpRecord) {
      return null;
    }
    const isValid = await bcrypt.compare(otp, otpRecord.hash_OTP);
    return isValid ? { user, otpRecord } : null;
  }
}
