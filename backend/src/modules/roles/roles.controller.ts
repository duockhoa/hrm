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
import { RolesService } from './roles.service';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  AddRolePermissionsDto,
  SyncRolePermissionsDto,
} from './dto/update-role-permissions.dto';

@Controller('roles')
@UseGuards(jwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findById(id);
  }

  @Post()
  createRole(@Body() body: CreateRoleDto) {
    return this.rolesService.create(body);
  }

  @Put(':id')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }

  @Post(':roleId/permissions')
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
  syncPermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() body: SyncRolePermissionsDto,
  ) {
    return this.rolesService.syncPermissions(roleId, body.permissionIds);
  }

  @Delete(':roleId/permissions/:permissionId')
  removePermissionFromRoleByCanonicalRoute(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rolesService.removePermissionFromRole(roleId, permissionId);
  }

  @Delete(':roleId/remove-permission/:permissionId')
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
