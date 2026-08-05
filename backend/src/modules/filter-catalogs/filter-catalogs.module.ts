import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { FilterCatalogsController } from './filter-catalogs.controller';
import { FilterCatalogsService } from './filter-catalogs.service';

@Module({
  controllers: [FilterCatalogsController],
  providers: [FilterCatalogsService, PrismaService],
})
export class FilterCatalogsModule {}
