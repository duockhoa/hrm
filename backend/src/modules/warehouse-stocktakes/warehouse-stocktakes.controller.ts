import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import {
  CreateWarehouseStocktakeDto,
  ListWarehouseStocktakesDto,
} from './warehouse-stocktakes.dto';
import { WarehouseStocktakesService } from './warehouse-stocktakes.service';

@ApiTags('warehouse-stocktakes')
@ApiBearerAuth()
@UseGuards(jwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller('warehouse-stocktakes')
export class WarehouseStocktakesController {
  constructor(private readonly service: WarehouseStocktakesService) {}

  @Get()
  list(@Query() query: ListWarehouseStocktakesDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(
    @Body() dto: CreateWarehouseStocktakeDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.service.create(dto, req.user.id);
  }
}
