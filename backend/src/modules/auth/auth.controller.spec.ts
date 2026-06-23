import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      createResetPasswordOTP: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      resetPassword: jest.fn(),
      verifyResetPasswordOTP: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            findByUsername: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns success when password reset OTP is sent', async () => {
    authService.createResetPasswordOTP.mockResolvedValue(true);

    await expect(
      controller.requestPasswordReset({ email: 'user@example.com' }),
    ).resolves.toEqual({
      message: 'Password reset OTP sent',
    });
    expect(authService.createResetPasswordOTP).toHaveBeenCalledWith(
      'user@example.com',
    );
  });

  it('resets password when OTP is valid', async () => {
    authService.resetPassword.mockResolvedValue(true);

    await expect(
      controller.resetPassword({
        email: 'user@example.com',
        otp: '123456',
        newPassword: 'new-password',
      }),
    ).resolves.toEqual({
      message: 'Password reset successfully',
    });
    expect(authService.resetPassword).toHaveBeenCalledWith(
      'user@example.com',
      '123456',
      'new-password',
    );
  });
});
