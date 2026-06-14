import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService, RolesGuard, PermissionsGuard, PrismaService],
})
export class ItemsModule {}
