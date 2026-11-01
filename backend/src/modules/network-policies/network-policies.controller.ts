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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { USER_PERMISSIONS } from '../users/users.permissions';
import { NetworkRangeDto } from './network-policies.dto';
import { NetworkPoliciesService } from './network-policies.service';

@Controller('network-policies')
@ApiTags('Network policies')
@ApiBearerAuth()
@UseGuards(jwtAuthGuard, PermissionsGuard)
@Permissions(USER_PERMISSIONS.UPDATE)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class NetworkPoliciesController {
  constructor(private readonly service: NetworkPoliciesService) {}
  @Get()
  list() {
    return this.service.list();
  }
  @Get('ranges')
  ranges() {
    return this.service.ranges();
  }
  @Post('ranges')
  create(@Body() dto: NetworkRangeDto) {
    return this.service.saveRange(dto);
  }
  @Put('ranges/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: NetworkRangeDto) {
    return this.service.saveRange(dto, id);
  }
  @Delete('ranges/:id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteRange(id);
  }
}
