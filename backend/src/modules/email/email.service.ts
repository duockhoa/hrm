import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from 'src/event.interface';

@Injectable()
export class EmailService {
  @OnEvent(EventNames.USER_CREATED)
  handleUserCreatedEvent(payload: any) {
    console.log('User created event received:', payload);
    // Here you can implement the logic to send an email notification
  }
  @OnEvent(EventNames.USER_UPDATED)
  handleUserUpdatedEvent(payload: any) {
    console.log('User updated event received:', payload);
    // Here you can implement the logic to send an email notification
  }
  @OnEvent(EventNames.USER_DELETED)
  handleUserDeletedEvent(payload: any) {
    console.log('User deleted event received:', payload);
    // Here you can implement the logic to send an email notification
  }
}
