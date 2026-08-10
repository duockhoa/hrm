import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpException,
  Delete,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UsePipes } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UseGuards } from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary.service';
import { AddUserRolesDto, SyncUserRolesDto } from './dto/update-user-roles.dto';
import { SyncUserApplicationsDto } from './dto/update-user-applications.dto';
import { USER_PERMISSIONS } from './users.permissions';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('users')
@UsePipes(
  new ValidationPipe({
    transform: true,
  }),
)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @Permissions(USER_PERMISSIONS.LIST)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('with-deleted')
  @Permissions(USER_PERMISSIONS.LIST_DELETED)
  findAllWithDeleted() {
    return this.usersService.findAllWithDeleted();
  }

  @Get('/me')
  async getProfile(@Request() req: any) {
    const user = req.user;
    return user;
  }

  @Get('/me/applications')
  async findMyApplications(@Request() req: any) {
    return this.usersService.findApplicationsByUserId(req.user.id);
  }

  @Get('/me/permissions')
  async findMyPermissionKeys(@Request() req: any) {
    return this.usersService.findPermissionKeysByUserId(req.user.id);
  }

  @Get(':id/roles')
  @Permissions(USER_PERMISSIONS.ROLES_READ)
  async findRolesByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findRolesByUserId(id);
  }

  @Get(':id/permissions')
  @Permissions(USER_PERMISSIONS.PERMISSIONS_READ)
  async findPermissionKeysByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findPermissionKeysByUserId(id);
  }

  @Post(':id/roles')
  @Permissions(USER_PERMISSIONS.ROLES_ASSIGN)
  async addRolesToUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddUserRolesDto,
  ) {
    return this.usersService.addRolesToUser(id, this.getRoleIds(body));
  }

  @Put(':id/roles')
  @Permissions(USER_PERMISSIONS.ROLES_ASSIGN)
  async syncRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SyncUserRolesDto,
  ) {
    return this.usersService.syncRoles(id, body.roleIds);
  }

  @Delete(':id/roles/:roleId')
  @Permissions(USER_PERMISSIONS.ROLES_ASSIGN)
  async removeRoleFromUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.usersService.removeRoleFromUser(id, roleId);
  }

  @Get(':id/applications')
  @Permissions(USER_PERMISSIONS.APPLICATIONS_READ)
  async findApplicationsByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findApplicationsByUserId(id);
  }

  @Put(':id/applications')
  @Permissions(USER_PERMISSIONS.APPLICATIONS_ASSIGN)
  async syncApplications(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SyncUserApplicationsDto,
  ) {
    return this.usersService.syncApplications(id, body.applicationIds);
  }

  @Get(':id')
  @Permissions(USER_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    console.log('Uploaded file:', file.originalname, file.mimetype);
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      'avatars',
    );
    if (uploadResult && uploadResult['secure_url']) {
      const url = uploadResult['secure_url'];
      const updatedUser = await this.usersService.uploadAvatar(
        req.user.id,
        url,
      );
      return updatedUser;
    }

    return new HttpException(
      'Avatar upload failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @UseGuards(jwtAuthGuard)
  @Post('me/change-password')
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Request() req: any,
  ) {
    const { currentPassword, newPassword } = body;
    const hashedPassword = await this.usersService.changePassword(
      currentPassword,
      newPassword,
      req.user,
    );
    if (!hashedPassword) {
      throw new HttpException('Password change failed', HttpStatus.BAD_REQUEST);
    }
    return { hashedPassword };
  }

  @Post()
  @Permissions(USER_PERMISSIONS.CREATE)
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    if (!user) {
      throw new HttpException(
        'User could not be created',
        HttpStatus.BAD_REQUEST,
      );
    }
    return user;
  }

  @Put(':id')
  @Permissions(USER_PERMISSIONS.UPDATE)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: Partial<CreateUserDto>,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Delete(':id')
  @Permissions(USER_PERMISSIONS.DELETE)
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.deleteUser(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private getRoleIds(body: AddUserRolesDto) {
    return body.roleIds ?? (body.roleId ? [body.roleId] : []);
  }
}
