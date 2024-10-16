import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { Public } from 'src/decorators/public.decorator';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Public()
  @Post('/send-recover-email')
  async sendRecoverPasswordEmail(
    @Body('email') email: string
  ): Promise<{ message: string }> {
    const emailSent = await this.mailService.sendRecoverPasswordEmail(email);

    if (!emailSent)
      throw new NotFoundException(
        'There is no registered user with this email.'
      );

    return {
      message: 'The password recovery email has been sent.',
    };
  }
}
