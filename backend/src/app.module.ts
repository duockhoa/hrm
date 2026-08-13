import { Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { MiddlewareConsumer } from '@nestjs/common';
import { AuthenticationMiddleware } from './middleware/authentication/authentication.middleware';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { MulterModule } from '@nestjs/platform-express';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailModule } from './modules/email/email.module';
import { ExternalSyncModule } from './modules/external-sync/external-sync.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SapB1ConnectorModule } from './modules/sap-b1-connector/sap-b1-connector.module';
import { ItemsModule } from './modules/items/items.module';
import { ProductionOrdersModule } from './modules/production-orders/production-orders.module';
import { ProductionSpecificationsModule } from './modules/production-specifications/production-specifications.module';
import { ProductionOrderDeviationsModule } from './modules/production-order-deviations/production-order-deviations.module';
import { FeaturesModule } from './modules/features/features.module';
import { ProductLinesModule } from './modules/product-lines/product-lines.module';
import { ProductionWorkshopsModule } from './modules/production-workshops/production-workshops.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { RegistrationNumbersSyncModule } from './modules/registration-numbers-sync/registration-numbers-sync.module';
import { RegistrationNumbersModule } from './modules/registration-numbers/registration-numbers.module';
import { FilterCatalogsModule } from './modules/filter-catalogs/filter-catalogs.module';
import { CleaningObjectsModule } from './modules/cleaning-objects/cleaning-objects.module';
import { CleaningRequirementsModule } from './modules/cleaning-requirements/cleaning-requirements.module';

@Module({
  imports: [
    ConfigModule.forRoot({}),
    EventEmitterModule.forRoot(),
    UsersModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    MulterModule.register({
      dest: './uploads',
    }),
    DepartmentsModule,
    CompaniesModule,
    EmailModule,
    ExternalSyncModule,
    ScheduleModule.forRoot(),
    SapB1ConnectorModule,
    ItemsModule,
    ProductionOrdersModule,
    ProductionOrderDeviationsModule,
    ProductionSpecificationsModule,
    FeaturesModule,
    ProductLinesModule,
    ProductionWorkshopsModule,
    EquipmentModule,
    ApplicationsModule,
    RegistrationNumbersSyncModule,
    RegistrationNumbersModule,
    FilterCatalogsModule,
    CleaningObjectsModule,
    CleaningRequirementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthenticationMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
