import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RegistrationNumbersService } from './registration-numbers.service';

@UseGuards(jwtAuthGuard)
@Controller('registration-numbers')
export class RegistrationNumbersController {
  constructor(
    private readonly registrationNumbersService: RegistrationNumbersService,
  ) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.registrationNumbersService.findAll({
      search,
    });
  }
}
