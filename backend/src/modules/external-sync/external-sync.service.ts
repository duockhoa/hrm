import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from 'src/event.interface';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { ExternalApiIntegration } from 'src/integrations/external-api.integration';
@Injectable()
export class ExternalSyncService {
  constructor(
    private usersService: UsersService,
    private departmentsService: DepartmentsService,
    private externalApiIntegration: ExternalApiIntegration,
  ) {}

  @OnEvent(EventNames.USER_SYNCED)
  async handleUserSyncedEvent(payload: any) {
    const users = await this.usersService.findAllWithDeleted();
    await this.externalApiIntegration.post('sync/users', users);
  }

  @OnEvent(EventNames.DEPARTMENT_SYNCED)
  async handleDepartmentSyncedEvent(payload: any) {
    const departments = await this.departmentsService.findAll();
    console.log('Current departments in the system:', departments);
    await this.externalApiIntegration.post('sync/departments', departments);
  }
}
