import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { USER_PERMISSIONS } from 'src/modules/users/users.permissions';
import { GetUserLoginSessionsDto } from './dto/get-user-login-sessions.dto';
import { UserLoginSessionsService } from './user-login-sessions.service';

@Controller('user-login-sessions')
@UseGuards(jwtAuthGuard, PermissionsGuard)
@ApiTags('User login sessions')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class UserLoginSessionsController {
  constructor(
    private readonly userLoginSessionsService: UserLoginSessionsService,
  ) {}

  @Get()
  @Permissions(USER_PERMISSIONS.LIST)
  @ApiOperation({ summary: 'Lấy lịch sử đăng nhập và đăng xuất' })
  @ApiOkResponse({
    description: 'Danh sách lịch sử phiên đăng nhập có phân trang',
  })
  findAll(@Query() query: GetUserLoginSessionsDto) {
    return this.userLoginSessionsService.findAll(query);
  }
}
