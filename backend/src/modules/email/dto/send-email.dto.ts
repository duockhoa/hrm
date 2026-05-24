export class SendEmailDto {
  recipients!: string | string[];
  subject!: string;
  message?: string;
  html?: string;
  senderName?: string;
}
