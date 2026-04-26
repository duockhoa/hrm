import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from 'src/event.interface';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
@Injectable()
export class ExternalSyncService {
  constructor(
    private usersService: UsersService,
    private departmentsService: DepartmentsService,
  ) {}

  @OnEvent(EventNames.USER_SYNCED)
  async handleUserSyncedEvent(payload: any) {
    console.log('User synced event received:', payload);
    // Here you can implement the logic to sync the user data with the external system
    // For example, you can call an external API to create a user in that system
  }

  @OnEvent(EventNames.DEPARTMENT_SYNCED)
  async handleDepartmentSyncedEvent(payload: any) {
    const departments = await this.departmentsService.findAll();
    console.log('Current departments in the system:', departments);
    // Here you can implement the logic to sync the updated department data with the external system
    // For example, you can call an external API to update the department in that system
  }
}
