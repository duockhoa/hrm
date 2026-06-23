import {
  Body,
  Controller,
  HttpException,
  Post,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetPasswordOtpDto } from './dto/verify-reset-password-otp.dto';

@Controller('auth')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
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
  async requestPasswordReset(@Body() resetData: RequestPasswordResetDto) {
    const result = await this.authService.createResetPasswordOTP(
      resetData.email,
    );
    if (!result) {
      throw new HttpException('User not found', 404);
    }
    return { message: 'Password reset OTP sent' };
  }

  @Post('get-reset-password-otp')
  async getResetPasswordOTP(@Body() resetData: RequestPasswordResetDto) {
    const result = await this.authService.createResetPasswordOTP(
      resetData.email,
    );
    if (!result) {
      throw new HttpException('User not found', 404);
    }
    return { message: 'Password reset OTP sent' };
  }

  @Post('verify-reset-password-otp')
  async verifyResetPasswordOTP(@Body() otpData: VerifyResetPasswordOtpDto) {
    const { email, otp } = otpData;
    const isValid = await this.authService.verifyResetPasswordOTP(email, otp);
    if (!isValid) {
      throw new HttpException('Invalid OTP', 400);
    }
    return { message: 'OTP is valid' };
  }

  @Post('reset-password')
  async resetPassword(@Body() resetData: ResetPasswordDto) {
    const { email, otp, newPassword } = resetData;
    const result = await this.authService.resetPassword(
      email,
      otp,
      newPassword,
    );
    if (!result) {
      throw new HttpException('Invalid OTP', 400);
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
