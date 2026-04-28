import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from 'src/event.interface';

@Injectable()
export class EmailService {
  @OnEvent(EventNames.USER_CREATED)
  handleUserCreatedEvent(payload: any) {
    // Here you can implement the logic to send an email notification
  }
}
