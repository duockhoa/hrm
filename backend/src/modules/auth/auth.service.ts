import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';

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
}
