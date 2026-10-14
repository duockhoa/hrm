import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { EMAIL_SETTINGS_PERMISSIONS } from './constants/email-settings.constants';
import {
  CreateEmailTypeDto,
  SaveEmailRecipientsDto,
  UpdateEmailTypeDto,
} from './dto/email-settings.dto';
import { EmailSettingsService } from './email-settings.service';

type AuthenticatedRequest = { user: { id: number } };

@Controller('email-settings')
@ApiTags('Email settings')
@ApiBearerAuth()
@UseGuards(jwtAuthGuard, PermissionsGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EmailSettingsController {
  constructor(private readonly service: EmailSettingsService) {}

  @Get('types')
  @ApiOperation({ summary: 'Danh sách loại email' })
  findTypes() {
    return this.service.findTypes();
  }

  @Post('types')
  @Permissions(EMAIL_SETTINGS_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Tạo loại email' })
  createType(@Body() dto: CreateEmailTypeDto) {
    return this.service.createType(dto);
  }

  @Patch('types/:id')
  @Permissions(EMAIL_SETTINGS_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Đổi tên loại email; mã loại email giữ cố định' })
  updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmailTypeDto,
  ) {
    return this.service.updateType(id, dto);
  }

  @Get('defaults')
  @Permissions(EMAIL_SETTINGS_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Danh sách loại email và người nhận mặc định' })
  findDefaults() {
    return this.service.findDefaults();
  }

  @Put('types/:id/default')
  @Permissions(EMAIL_SETTINGS_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Lưu người nhận mặc định' })
  saveDefault(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveEmailRecipientsDto,
  ) {
    return this.service.saveDefault(id, dto.email);
  }

  @Delete('types/:id/default')
  @Permissions(EMAIL_SETTINGS_PERMISSIONS.MANAGE)
  @ApiOperation({ summary: 'Xóa người nhận mặc định' })
  deleteDefault(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteDefault(id);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Danh sách cấu hình email cá nhân của tài khoản đăng nhập',
  })
  findPersonal(@Request() request: AuthenticatedRequest) {
    return this.service.findPersonal(request.user.id);
  }

  @Put('types/:id/me')
  @ApiOperation({ summary: 'Lưu người nhận email cá nhân' })
  savePersonal(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveEmailRecipientsDto,
  ) {
    return this.service.savePersonal(request.user.id, id, dto.email);
  }

  @Delete('types/:id/me')
  @ApiOperation({ summary: 'Xóa cấu hình email cá nhân để dùng mặc định' })
  deletePersonal(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deletePersonal(request.user.id, id);
  }
}
