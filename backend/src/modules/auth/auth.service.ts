import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { generateOtp } from 'src/common/utils/otp.util';
import { EmailService } from '../email/email.service';
import { randomUUID } from 'crypto';

export interface LoginMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}
  async login(user: any, metadata: LoginMetadata = {}) {
    const payload = {
      username: user.username,
      sub: user.id,
    };
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN) || 2592000,
    });
    await this.prisma.$transaction(async (tx) => {
      const storedToken = await tx.tokens.create({
        data: {
          user_id: user.id,
          refreshToken: refreshToken,
        },
      });

      await tx.userLoginSessions.create({
        data: {
          user_id: user.id,
          token_id: storedToken.id,
          session_key: randomUUID(),
          ip_address: metadata.ipAddress?.slice(0, 45),
          user_agent: metadata.userAgent?.slice(0, 1000),
          last_activity_at: new Date(),
        },
      });
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
      console.log("verify failed")
      return null;
    }
    const newAccessToken = this.jwtService.sign({
      username: payload.username,
      sub: payload.sub,
    });
    console.log("verify successfully")
    return {
      accessToken: newAccessToken,
    };
  }

  async logout(refreshToken: string) {
    return this.prisma.$transaction(async (tx) => {
      const storedToken = await tx.tokens.findUnique({
        where: { refreshToken },
      });

      if (!storedToken) {
        return false;
      }

      const logoutAt = new Date();
      await tx.userLoginSessions.updateMany({
        where: { token_id: storedToken.id, logout_at: null },
        data: {
          logout_at: logoutAt,
          last_activity_at: logoutAt,
          logout_reason: 'manual',
        },
      });

      await tx.tokens.delete({
        where: { id: storedToken.id },
      });

      return true;
    });
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
      const resetPasswordOtpEmail = this.buildResetPasswordOtpEmail(
        OTP,
        expiresInMinutes,
        user.name,
      );

      await this.emailService.sendEmail({
        recipients: email,
        subject: resetPasswordOtpEmail.subject,
        message: resetPasswordOtpEmail.message,
        html: resetPasswordOtpEmail.html,
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

  private buildResetPasswordOtpEmail(
    otp: string,
    expiresInMinutes: number,
    recipientName?: string | null,
  ) {
    const subject = 'Mã OTP đặt lại mật khẩu';
    const message = `Mã OTP đặt lại mật khẩu của bạn là: ${otp}. Mã có hiệu lực trong ${expiresInMinutes} phút.`;
    const greetingName = this.escapeHtml(recipientName?.trim() || 'bạn');
    const logoUrl = this.escapeHtml(this.passwordResetEmailLogoUrl);

    return {
      subject,
      message,
      html: `
        <!doctype html>
        <html lang="vi">
          <head>
            <meta charset="UTF-8" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background: #ffffff; font-family: Arial, Helvetica, sans-serif; color: #111111;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; padding: 40px 16px 20px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff;">
                    <tr>
                      <td align="center" style="padding: 0 24px 20px;">
                        <img src="${logoUrl}" width="170" alt="DKPharma" style="display: block; width: 170px; max-width: 70%; height: auto; border: 0; outline: none; text-decoration: none;" />
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0 24px;">
                        <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.6; color: #111111;">
                          Xin chào ${greetingName},
                        </p>
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #111111;">
                          Chúng tôi nhận được yêu cầu thiết lập mật khẩu đăng nhập mới cho tài khoản DKPharma của bạn.<br />
                          Vui lòng nhập mã OTP dưới đây để đặt lại mật khẩu:
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 40px 24px 36px;">
                        <div style="font-size: 38px; line-height: 1.2; letter-spacing: 12px; font-weight: 700; color: #111111;">${otp}</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0 24px 32px;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #111111;">
                          Mã OTP có hiệu lực trong ${expiresInMinutes} phút. Lưu ý: KHÔNG chia sẻ mã này với bất kỳ ai.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0 24px 36px;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #111111;">
                          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ bộ phận hỗ trợ của DKPharma.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top: 1px solid #dddddd; padding: 16px 24px 0;">
                        <p style="margin: 0; text-align: center; font-size: 12px; line-height: 1.5; color: #777777;">
                          Đây là email tự động. Vui lòng không trả lời email này.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };
  }

  private get passwordResetEmailLogoUrl() {
    return (
      process.env.PASSWORD_RESET_EMAIL_LOGO_URL?.trim() ||
      'https://prod-cdn.pharmacity.io/e-com/images/brand-logo/dk-pharma.png'
    );
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
