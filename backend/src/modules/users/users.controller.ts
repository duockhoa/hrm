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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UsePipes } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UseGuards } from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Permissions } from 'src/decorators/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary.service';
@UseGuards(jwtAuthGuard, RolesGuard)
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
  @Permissions('USER_VIEW')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('/me')
  async getProfile(@Request() req: any) {
    const user = req.user;
    return user;
  }

  @Get(':id')
  async findById(@Param('id') id: number) {
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

  @UseGuards(jwtAuthGuard, PermissionsGuard)
  @Post('change-password')
  async changePassword(
    @Body() body: { oldPassword: string; newPassword: string },
    @Request() req: any,
  ) {
    const { oldPassword, newPassword } = body;
    const hashedPassword = await this.usersService.changePassword(
      oldPassword,
      newPassword,
      req.user,
    );
    if (!hashedPassword) {
      throw new HttpException('Password change failed', HttpStatus.BAD_REQUEST);
    }
    return { hashedPassword };
  }

  @Roles('admin')
  @Post()
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

  @UseGuards(jwtAuthGuard, PermissionsGuard)
  @Permissions('USER_DELETE')
  @Delete(':id')
  async deleteUser(@Param('id') id: number) {
    const user = await this.usersService.deleteUser(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }
}
