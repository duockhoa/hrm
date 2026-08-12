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
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import {
  AccessTokenResponseDto,
  LoginDto,
  MessageResponseDto,
  RefreshTokenDto,
  TokenPairResponseDto,
} from './dto/swagger-auth.dto';

@Controller('auth')
@ApiTags('Authentication')
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
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Tên đăng nhập đã tồn tại hoặc dữ liệu không hợp lệ' })
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
  @ApiOperation({ summary: 'Cấp access token mới từ refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiCreatedResponse({ type: AccessTokenResponseDto })
  @ApiBadRequestResponse({ description: 'Thiếu refresh token' })
  @ApiUnauthorizedResponse({ description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
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
  @ApiOperation({ summary: 'Đăng xuất và thu hồi refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Thiếu refresh token' })
  @ApiUnauthorizedResponse({ description: 'Refresh token không hợp lệ' })
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
  @ApiOperation({ summary: 'Yêu cầu gửi OTP đặt lại mật khẩu' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user theo email' })
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
  @ApiOperation({ summary: 'Gửi OTP đặt lại mật khẩu (endpoint tương thích cũ)' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user theo email' })
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
  @ApiOperation({ summary: 'Xác thực OTP đặt lại mật khẩu' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'OTP không hợp lệ hoặc đã hết hạn' })
  async verifyResetPasswordOTP(@Body() otpData: VerifyResetPasswordOtpDto) {
    const { email, otp } = otpData;
    const isValid = await this.authService.verifyResetPasswordOTP(email, otp);
    if (!isValid) {
      throw new HttpException('Invalid OTP', 400);
    }
    return { message: 'OTP is valid' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng OTP hợp lệ' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'OTP không hợp lệ hoặc đã hết hạn' })
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
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({ description: 'Tên đăng nhập hoặc mật khẩu không đúng' })
  async login(@Request() request) {
    const token = await this.authService.login(request.user);
    if (!token) {
      throw new HttpException('Invalid credentials', 401);
    }

    return token;
  }
}
