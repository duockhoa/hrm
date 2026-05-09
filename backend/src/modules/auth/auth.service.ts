import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { generateOtp } from 'src/common/utils/otp.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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
    console.log(`Generated OTP for ${email}: ${OTP}`);
    const hashOTP = await bcrypt.hash(OTP, 10);
    const expiresInMinutes =
      Number(process.env.PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES) || 5;

    await this.prisma.passwordResetOTPs.create({
      data: {
        user_id: user.id,
        hash_OTP: hashOTP,
        expires_at: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      },
    });
    return hashOTP;
  }
  async verifyResetPasswordOTP(email: string, otp: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });
    if (!user) {
      return false;
    }
    const otpRecord = await this.prisma.passwordResetOTPs.findFirst({
      where: {
        user_id: user.id,
        expires_at: { gt: new Date() },
      },
      orderBy: { expires_at: 'desc' },
    });
    if (!otpRecord) {
      return false;
    }
    const isValid = await bcrypt.compare(otp, otpRecord.hash_OTP);
    return isValid;
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });
    if (!user) {
      return false;
    }
    const isValidOTP = await this.verifyResetPasswordOTP(email, otp);
    if (!isValidOTP) {
      return false;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.users.update({
      where: { email },
      data: { password: hashedPassword },
    });
    return true;  
  }




}
