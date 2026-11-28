import {
  Body,
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { PrismaService } from 'src/prisma.service';
import {
  CreateVerificationDetailDto,
  UpdateVerificationDetailDto,
  VerificationDetailParamsDto,
} from './warehouse-verification-record-details.dto';
import {
  CreateVerificationRecordDto,
  VerificationListQueryDto,
  VerificationRecordIdDto,
  VerificationSubjectsQueryDto,
} from './warehouse-verification-records.dto';
import {
  VerificationUser,
  WarehouseVerificationRecordsService,
} from './warehouse-verification-records.service';

@Injectable()
export class VerificationRecordsWmsGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user: VerificationUser }>();
    const assignment = await this.prisma.userApplications.findFirst({
      where: {
        user_id: user.id,
        application: { key: 'wms', is_active: true },
      },
      select: { id: true },
    });
    return Boolean(assignment);
  }
}

@ApiTags('warehouse-verification-records')
@ApiBearerAuth()
@UseGuards(jwtAuthGuard, VerificationRecordsWmsGuard, NetworkPolicyGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller('warehouse-verification-records')
export class WarehouseVerificationRecordsController {
  constructor(private readonly service: WarehouseVerificationRecordsService) {}

  @Get()
  list(
    @Query() query: VerificationListQueryDto,
    @Request() req: { user: VerificationUser },
  ) {
    return this.service.list(query, req.user);
  }

  @Get('subjects')
  subjects(
    @Query() query: VerificationSubjectsQueryDto,
    @Request() req: { user: VerificationUser },
  ) {
    return this.service.subjects(query, req.user);
  }

  @Get('participant-options')
  participantOptions(
    @Query() query: VerificationListQueryDto,
    @Request() req: { user: VerificationUser },
  ) {
    return this.service.participantOptions(query, req.user);
  }

  @Get(':id')
  detail(
    @Param() params: VerificationRecordIdDto,
    @Request() req: { user: VerificationUser },
  ) {
    return this.service.detail(params.id, req.user);
  }

  @Post()
  create(
    @Body() dto: CreateVerificationRecordDto,
    @Request() req: { user: VerificationUser },
  ) {
    return this.service.create(dto, req.user);
  }

  @Post(':id/details')
  createDetail(
    @Param() params: VerificationRecordIdDto,
    @Body() dto: CreateVerificationDetailDto,
    @Request() req: { user: VerificationUser },
  ) {
    return this.service.createDetail(params.id, dto, req.user);
  }

  @Patch(':id/details/:detailId')
  updateDetail(
    @Param() params: VerificationDetailParamsDto,
    @Body() dto: UpdateVerificationDetailDto,
    @Request() req: { user: VerificationUser },
  ) {
    return this.service.updateDetail(params.id, params.detailId, dto, req.user);
  }

  @Delete(':id/details/:detailId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDetail(
    @Param() params: VerificationDetailParamsDto,
    @Request() req: { user: VerificationUser },
  ) {
    return this.service.deleteDetail(params.id, params.detailId, req.user);
  }
}
