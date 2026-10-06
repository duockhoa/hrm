import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { BusinessPartnersService } from './business-partners.service';

@ApiTags('business-partners')
@UseGuards(jwtAuthGuard)
@Controller('business-partners')
export class BusinessPartnersController {
  constructor(private readonly service: BusinessPartnersService) {}

  @Get()
  @ApiQuery({
    name: 'cardType',
    required: false,
    enum: ['cSupplier', 'cCustomer', 'cLid'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('cardType') cardType?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(cardType, search);
  }

  @Get(':card_code')
  findByCode(@Param('card_code') cardCode: string) {
    return this.service.findByCode(cardCode);
  }
}
