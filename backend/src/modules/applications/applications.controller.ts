import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { ApplicationsService } from './applications.service';
import { APPLICATION_PERMISSIONS } from './applications.permissions';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('applications')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @Permissions(APPLICATION_PERMISSIONS.LIST)
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive = true,
  ) {
    return this.applicationsService.findAll(includeInactive);
  }

  @Get(':id')
  @Permissions(APPLICATION_PERMISSIONS.READ)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.findById(id);
  }

  @Post()
  @Permissions(APPLICATION_PERMISSIONS.CREATE)
  create(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(createApplicationDto);
  }

  @Patch(':id')
  @Permissions(APPLICATION_PERMISSIONS.UPDATE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, updateApplicationDto);
  }

  @Delete(':id')
  @Permissions(APPLICATION_PERMISSIONS.DELETE)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.delete(id);
  }
}
