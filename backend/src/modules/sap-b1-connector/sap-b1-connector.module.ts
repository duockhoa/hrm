import { Module } from '@nestjs/common';
import { SapB1ConnectorService } from './sap-b1-connector.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [SapB1ConnectorService, 
    PrismaService
  ],
})
export class SapB1ConnectorModule {}
