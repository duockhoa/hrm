import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { REGISTRATION_NUMBER_PERMISSIONS } from './registration-numbers.permissions';
import { RegistrationNumbersService } from './registration-numbers.service';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('registration-numbers')
export class RegistrationNumbersController {
  constructor(
    private readonly registrationNumbersService: RegistrationNumbersService,
  ) {}

  @Get()
  @Permissions(REGISTRATION_NUMBER_PERMISSIONS.LIST)
  findAll(@Query('search') search?: string) {
    return this.registrationNumbersService.findAll({
      search,
    });
  }
}
