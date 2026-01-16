import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';

@Controller('roles')
@UseGuards(jwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
  @Post()
  createRole(@Body() body: { roleName: string; description?: string }) {
    return this.rolesService.createRole(body.roleName, body.description);
  }
  @Post(':roleId/permission')
  addPermissionToRole(
    @Param('roleId') roleId: number,
    @Body() body: { permissionId: number },
  ) {
    return this.rolesService.addPermissionToRole(roleId, body.permissionId);
  }

  @Delete(':roleId/remove-permission/:permissionId')
  removePermissionFromRole(
    @Param('roleId') roleId: number,
    @Param('permissionId') permissionId: number,
  ) {
    return this.rolesService.removePermissionFromRole(roleId, permissionId);
  }
}
