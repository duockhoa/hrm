import { Body, Controller, HttpException, Post, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() userData: any) {
    // Implement registration logic here
    const { username } = userData;
    const existingUser = await this.usersService.findByUsername(username);
    if (existingUser) {
      throw new HttpException('User already exists', 400);
    }
    const newUser = await this.usersService.createUser(userData);
    return newUser;
  }

  @Post('refresh-token')
  async refreshToken(@Body() refreshToken: { refreshToken: string }) {
    if (!refreshToken || !refreshToken.refreshToken) {
      throw new HttpException('Refresh token is required', 400);
    }
    const newToken = await this.authService.refreshToken(refreshToken);
    if (!newToken) {
      throw new HttpException('Invalid refresh token', 401);
    }
    return newToken;
  }

  @Post('logout')
  async logout(@Body() refreshToken: { refreshToken: string }) {
    if (!refreshToken || !refreshToken.refreshToken) {
      throw new HttpException('Refresh token is required', 400);
    }
    const result = await this.authService.logout(refreshToken.refreshToken);
    if (!result) {
      throw new HttpException('Invalid refresh token', 401);
    }
    return { message: 'Logged out successfully' };
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() email: { email: string }) {
    const token = await this.authService.createResetPasswordOTP(email.email);
    if (!token) {
      throw new HttpException('User not found', 404);
    }
    // In a real application, you would send an email with the reset link
    return { message: 'Password reset OTP created' };
  }

  @Post('get-reset-password-otp')
  async getResetPasswordOTP(@Body() resetData: { email: string }) {
    const hashOTP = await this.authService.createResetPasswordOTP(
      resetData.email,
    );
    if (!hashOTP) {
      throw new HttpException('User not found', 404);
    }
    return { message: 'Password reset OTP created' };
  }

  @Post('verify-reset-password-otp')
  async verifyResetPasswordOTP(
    @Body() otpData: { email: string; otp: string },
  ) {
    const { email, otp } = otpData;
    const isValid = await this.authService.verifyResetPasswordOTP(email, otp);
    if (!isValid) {
      throw new HttpException('Invalid OTP', 400);
    }
    return { message: 'OTP is valid' };
  }

  @Post('reset-password')
  async resetPassword(
    @Body() resetData: { email: string; otp: string; newPassword: string },
  ) {
    const { email, otp, newPassword } = resetData;
    const isValidOTP = await this.authService.verifyResetPasswordOTP(
      email,
      otp,
    );
    if (!isValidOTP) {
      throw new HttpException('Invalid OTP', 400);
    }
    const result = await this.authService.resetPassword(
      email,
      otp,
      newPassword,
    );
    if (!result) {
      throw new HttpException('Failed to reset password', 500);
    }
    return { message: 'Password reset successfully' };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() request) {
    const token = await this.authService.login(request.user);
    if (!token) {
      throw new HttpException('Invalid credentials', 401);
    }

    return token;
  }
}
