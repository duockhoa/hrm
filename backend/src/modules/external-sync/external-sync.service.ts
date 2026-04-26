import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNames } from 'src/event.interface';

@Injectable()
export class ExternalSyncService {
  constructor(private eventEmitter: EventEmitter2) {}

  syncUserCreated(user: any) {
    this.eventEmitter.emit(EventNames.USER_CREATED, user);
  }

  syncUserUpdated(user: any) {
    this.eventEmitter.emit(EventNames.USER_UPDATED, user);
  }

  syncUserDeleted(user: any) {
    this.eventEmitter.emit(EventNames.USER_DELETED, user);
  }

  syncDepartmentCreated(department: any) {
    this.eventEmitter.emit(EventNames.DEPARTMENT_CREATED, department);
  }

  syncDepartmentUpdated(department: any) {
    this.eventEmitter.emit(EventNames.DEPARTMENT_UPDATED, department);
  }

  syncDepartmentDeleted(department: any) {
    this.eventEmitter.emit(EventNames.DEPARTMENT_DELETED, department);
  }
}
