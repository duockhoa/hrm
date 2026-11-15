import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { USER_PERMISSIONS } from '../users/users.permissions';
import {
  ConnectionApplicationParamsDto,
  EndConnectionSessionDto,
  GetConnectionSessionsDto,
} from './dto/connection-sessions.dto';
import { AppConnectionSessionsService } from './app-connection-sessions.service';

@Controller('ebr-connection-sessions')
@ApiTags('EBR connection sessions')
@ApiBearerAuth()
@UseGuards(jwtAuthGuard, PermissionsGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EbrConnectionSessionsController {
  constructor(private readonly sessions: AppConnectionSessionsService) {}

  @Get()
  @Permissions(USER_PERMISSIONS.LIST)
  @ApiOperation({ summary: 'Lịch sử kết nối EBR của người dùng' })
  findAll(@Query() query: GetConnectionSessionsDto) {
    return this.sessions.findAll('hsl', query);
  }

  @Post('end')
  @ApiOperation({
    summary: 'Kết thúc phiên EBR của chính người dùng khi đăng xuất',
  })
  end(
    @Req() request: { user: { id: number } },
    @Body() body: EndConnectionSessionDto,
  ) {
    return this.sessions.end('hsl', request.user.id, body.client_session_id);
  }
}

@Controller('app-connection-sessions/:applicationKey')
@ApiTags('Application connection sessions')
@ApiBearerAuth()
@UseGuards(jwtAuthGuard, PermissionsGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AppConnectionSessionsController {
  constructor(private readonly sessions: AppConnectionSessionsService) {}

  @Get()
  @Permissions(USER_PERMISSIONS.LIST)
  @ApiOperation({ summary: 'Lịch sử kết nối theo ứng dụng (hsl hoặc wms)' })
  findAll(
    @Param() params: ConnectionApplicationParamsDto,
    @Query() query: GetConnectionSessionsDto,
  ) {
    return this.sessions.findAll(params.applicationKey, query);
  }

  @Post('end')
  @ApiOperation({
    summary: 'Kết thúc phiên của chính người dùng trong ứng dụng',
  })
  end(
    @Param() params: ConnectionApplicationParamsDto,
    @Req() request: { user: { id: number } },
    @Body() body: EndConnectionSessionDto,
  ) {
    return this.sessions.end(
      params.applicationKey,
      request.user.id,
      body.client_session_id,
    );
  }
}
