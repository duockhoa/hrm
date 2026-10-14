import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @UseGuards(jwtAuthGuard)
  @Post('send')
  sendEmail(
    @Body() sendEmailDto: SendEmailDto,
    @Request() request: { user: { id: number } },
  ) {
    if (sendEmailDto.emailTypeCode !== undefined) {
      return this.emailService.sendConfiguredEmail(
        sendEmailDto.emailTypeCode,
        request.user.id,
        sendEmailDto,
      );
    }
    return this.emailService.sendEmail(sendEmailDto);
  }
}
