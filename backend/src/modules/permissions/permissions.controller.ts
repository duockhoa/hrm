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
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PERMISSION_MANAGEMENT_PERMISSIONS } from './permissions.permissions';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionsService } from './permissions.service';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('permissions')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions(PERMISSION_MANAGEMENT_PERMISSIONS.LIST)
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Permissions(PERMISSION_MANAGEMENT_PERMISSIONS.READ)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.findById(id);
  }

  @Post()
  @Permissions(PERMISSION_MANAGEMENT_PERMISSIONS.CREATE)
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Put(':id')
  @Permissions(PERMISSION_MANAGEMENT_PERMISSIONS.UPDATE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @Permissions(PERMISSION_MANAGEMENT_PERMISSIONS.DELETE)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.delete(id);
  }
}
