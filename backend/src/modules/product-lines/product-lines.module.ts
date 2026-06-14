import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductLinesController } from './product-lines.controller';
import { ProductLinesService } from './product-lines.service';

@Module({
  controllers: [ProductLinesController],
  providers: [ProductLinesService, PrismaService],
  exports: [ProductLinesService],
})
export class ProductLinesModule {}
