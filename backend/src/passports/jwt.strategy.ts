import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt } from 'passport-jwt';
import { Strategy } from 'passport-jwt';
import { UsersService } from 'src/modules/users/users.service';
import { jwtUserId } from 'src/modules/auth/jwt-payload';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }
  async validate(payload: unknown) {
    const userId = jwtUserId(payload, 'access');
    if (userId === null) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userService.findById(userId);
    if (!user || user.deleted_at) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
