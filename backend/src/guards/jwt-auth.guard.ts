import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class jwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || info || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
