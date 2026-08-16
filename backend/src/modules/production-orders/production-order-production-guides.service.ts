import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  getProductionGuideMimeType,
  getProductionGuideOriginalFilename,
  getProductionGuidePath,
  removeStoredProductionGuide,
  resolveProductionGuideFile,
} from './production-order-production-guide-upload.config';

@Injectable()
export class ProductionOrderProductionGuidesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderProductionGuides.findUnique({
      where: { production_order_id: productionOrderId },
    });
  }

  async upload(productionOrderId: number, file: Express.Multer.File) {
    await this.ensureProductionOrderExists(productionOrderId);

    const existingGuide =
      await this.prismaService.productionOrderProductionGuides.findUnique({
        where: { production_order_id: productionOrderId },
        select: { file_path: true },
      });

    const productionGuide =
      await this.prismaService.productionOrderProductionGuides.upsert({
        where: { production_order_id: productionOrderId },
        create: {
          production_order_id: productionOrderId,
          original_filename: getProductionGuideOriginalFilename(file),
          file_path: getProductionGuidePath(file),
          mime_type: getProductionGuideMimeType(file),
          file_size: file.size,
        },
        update: {
          original_filename: getProductionGuideOriginalFilename(file),
          file_path: getProductionGuidePath(file),
          mime_type: getProductionGuideMimeType(file),
          file_size: file.size,
        },
      });

    if (existingGuide?.file_path !== productionGuide.file_path) {
      await removeStoredProductionGuide(existingGuide?.file_path);
    }

    return productionGuide;
  }

  async getFile(productionOrderId: number) {
    const productionGuide = await this.findByProductionOrder(productionOrderId);

    if (!productionGuide) {
      throw new NotFoundException('Production guide not found');
    }

    const file = await resolveProductionGuideFile(productionGuide.file_path);

    if (!file) {
      throw new NotFoundException('Production guide file not found');
    }

    return { productionGuide, file };
  }

  async delete(productionOrderId: number) {
    const productionGuide = await this.findByProductionOrder(productionOrderId);

    if (!productionGuide) {
      throw new NotFoundException('Production guide not found');
    }

    await this.prismaService.productionOrderProductionGuides.delete({
      where: { id: productionGuide.id },
    });
    await removeStoredProductionGuide(productionGuide.file_path);

    return { message: 'Production guide deleted' };
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { id: true },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }
}
