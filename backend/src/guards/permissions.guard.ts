import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }
    const userPermissions = this.getUserPermissions(user);
    return requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }

  private getUserPermissions(user: any): string[] {
    if (Array.isArray(user.permissions)) {
      return user.permissions;
    }
    const userRoles = user.userRoles ?? [];
    const permissions = userRoles.flatMap((ur: any) =>
      (ur?.roles?.rolePermissions ?? []).map(
        (rp: any) => rp?.permissions?.name,
      ),
    );
    return permissions.filter(
      (permission: string | undefined): permission is string =>
        Boolean(permission),
    );
  }
}
