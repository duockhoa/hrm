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
