import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RolesService } from './roles.service';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  AddRolePermissionsDto,
  SyncRolePermissionsDto,
} from './dto/update-role-permissions.dto';
import { ROLE_PERMISSIONS } from './roles.permissions';

@Controller('roles')
@UseGuards(jwtAuthGuard, PermissionsGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions(ROLE_PERMISSIONS.LIST)
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions(ROLE_PERMISSIONS.READ)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findById(id);
  }

  @Post()
  @Permissions(ROLE_PERMISSIONS.CREATE)
  createRole(@Body() body: CreateRoleDto) {
    return this.rolesService.create(body);
  }

  @Put(':id')
  @Permissions(ROLE_PERMISSIONS.UPDATE)
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  @Permissions(ROLE_PERMISSIONS.DELETE)
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }

  @Post(':roleId/permissions')
  @Permissions(ROLE_PERMISSIONS.PERMISSIONS_ASSIGN)
  addPermissionsToRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() body: AddRolePermissionsDto,
  ) {
    return this.rolesService.addPermissionsToRole(
      roleId,
      this.getPermissionIds(body),
    );
  }

  @Post(':roleId/permission')
  @Permissions(ROLE_PERMISSIONS.PERMISSIONS_ASSIGN)
  addPermissionToRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() body: AddRolePermissionsDto,
  ) {
    return this.rolesService.addPermissionsToRole(
      roleId,
      this.getPermissionIds(body),
    );
  }

  @Put(':roleId/permissions')
  @Permissions(ROLE_PERMISSIONS.PERMISSIONS_ASSIGN)
  syncPermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() body: SyncRolePermissionsDto,
  ) {
    return this.rolesService.syncPermissions(roleId, body.permissionIds);
  }

  @Delete(':roleId/permissions/:permissionId')
  @Permissions(ROLE_PERMISSIONS.PERMISSIONS_ASSIGN)
  removePermissionFromRoleByCanonicalRoute(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rolesService.removePermissionFromRole(roleId, permissionId);
  }

  @Delete(':roleId/remove-permission/:permissionId')
  @Permissions(ROLE_PERMISSIONS.PERMISSIONS_ASSIGN)
  removePermissionFromRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rolesService.removePermissionFromRole(roleId, permissionId);
  }

  private getPermissionIds(body: AddRolePermissionsDto) {
    return body.permissionIds ?? (body.permissionId ? [body.permissionId] : []);
  }
}
