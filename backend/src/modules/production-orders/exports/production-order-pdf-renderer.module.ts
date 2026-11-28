import { Module } from '@nestjs/common';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';

@Module({
  providers: [ProductionOrderPdfRendererService],
  exports: [ProductionOrderPdfRendererService],
})
export class ProductionOrderPdfRendererModule {}
