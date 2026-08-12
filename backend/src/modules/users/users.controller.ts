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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  PasswordChangedResponseDto,
  PermissionKeysResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Lấy danh sách người dùng đang hoạt động' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('with-deleted')
  @Permissions(USER_PERMISSIONS.LIST_DELETED)
  @ApiOperation({ summary: 'Lấy danh sách người dùng, bao gồm bản ghi đã xóa' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAllWithDeleted() {
    return this.usersService.findAllWithDeleted();
  }

  @Get('/me')
  @ApiOperation({ summary: 'Lấy hồ sơ của user đang đăng nhập' })
  @ApiOkResponse({ type: UserResponseDto })
  async getProfile(@Request() req: any) {
    const user = req.user;
    return user;
  }

  @Get('/me/applications')
  @ApiOperation({ summary: 'Lấy application được gán cho user đang đăng nhập' })
  async findMyApplications(@Request() req: any) {
    return this.usersService.findApplicationsByUserId(req.user.id);
  }

  @Get('/me/permissions')
  @ApiOperation({ summary: 'Lấy các permission key của user đang đăng nhập' })
  @ApiOkResponse({ type: PermissionKeysResponseDto })
  async findMyPermissionKeys(@Request() req: any) {
    return this.usersService.findPermissionKeysByUserId(req.user.id);
  }

  @Get(':id/roles')
  @Permissions(USER_PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'Lấy role của một user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  async findRolesByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findRolesByUserId(id);
  }

  @Get(':id/permissions')
  @Permissions(USER_PERMISSIONS.PERMISSIONS_READ)
  @ApiOperation({ summary: 'Lấy permission key của một user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: PermissionKeysResponseDto })
  async findPermissionKeysByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findPermissionKeysByUserId(id);
  }

  @Post(':id/roles')
  @Permissions(USER_PERMISSIONS.ROLES_ASSIGN)
  @ApiOperation({ summary: 'Thêm một hoặc nhiều role cho user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiCreatedResponse({ description: 'Danh sách role sau khi thêm' })
  @ApiBadRequestResponse({ description: 'roleId hoặc roleIds không hợp lệ' })
  async addRolesToUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddUserRolesDto,
  ) {
    return this.usersService.addRolesToUser(id, this.getRoleIds(body));
  }

  @Put(':id/roles')
  @Permissions(USER_PERMISSIONS.ROLES_ASSIGN)
  @ApiOperation({ summary: 'Thay thế toàn bộ role của user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ description: 'Danh sách role sau khi đồng bộ' })
  async syncRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SyncUserRolesDto,
  ) {
    return this.usersService.syncRoles(id, body.roleIds);
  }

  @Delete(':id/roles/:roleId')
  @Permissions(USER_PERMISSIONS.ROLES_ASSIGN)
  @ApiOperation({ summary: 'Gỡ một role khỏi user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'roleId', type: Number, example: 2 })
  @ApiOkResponse({ description: 'Danh sách role còn lại' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user hoặc role được gán' })
  async removeRoleFromUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.usersService.removeRoleFromUser(id, roleId);
  }

  @Get(':id/applications')
  @Permissions(USER_PERMISSIONS.APPLICATIONS_READ)
  @ApiOperation({ summary: 'Lấy application được gán cho một user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  async findApplicationsByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findApplicationsByUserId(id);
  }

  @Put(':id/applications')
  @Permissions(USER_PERMISSIONS.APPLICATIONS_ASSIGN)
  @ApiOperation({ summary: 'Thay thế toàn bộ application của user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ description: 'Danh sách application sau khi đồng bộ' })
  async syncApplications(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SyncUserApplicationsDto,
  ) {
    return this.usersService.syncApplications(id, body.applicationIds);
  }

  @Get(':id')
  @Permissions(USER_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Lấy chi tiết user theo ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Tải ảnh đại diện cho user đang đăng nhập' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Không có file avatar được gửi lên' })
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
  @ApiOperation({ summary: 'Đổi mật khẩu cho user đang đăng nhập' })
  @ApiCreatedResponse({ type: PasswordChangedResponseDto })
  @ApiBadRequestResponse({ description: 'Mật khẩu hiện tại không đúng' })
  async changePassword(
    @Body() body: ChangePasswordDto,
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
  @ApiOperation({ summary: 'Tạo user mới' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu user không hợp lệ' })
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
  @ApiOperation({ summary: 'Cập nhật thông tin user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Delete(':id')
  @Permissions(USER_PERMISSIONS.DELETE)
  @ApiOperation({ summary: 'Xóa user' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
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
