import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }
    const userRoles = this.getUserRoles(user);
    return requiredRoles.some((role) => userRoles.includes(role));
  }

  private getUserRoles(user: any): string[] {
    if (Array.isArray(user.roles)) {
      return user.roles;
    }
    const userRoles = user.userRoles ?? [];
    return userRoles
      .map((ur: any) => ur?.roles?.name)
      .filter((role: string | undefined): role is string => Boolean(role));
  }
}
