import { Module } from '@nestjs/common';
import { SapB1ConnectorService } from './sap-b1-connector.service';
import { PrismaService } from 'src/prisma.service';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';
import { SapB1ConnectorController } from './sap-b1-connector.controller';

@Module({
  controllers: [SapB1ConnectorController],
  providers: [SapB1ConnectorService, SapB1ServiceLayerClient, PrismaService],
  exports: [SapB1ServiceLayerClient],
})
export class SapB1ConnectorModule {}
