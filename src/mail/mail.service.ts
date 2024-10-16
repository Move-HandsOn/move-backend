import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MailService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mailService: MailerService,
    private readonly usersService: UsersService
  ) {}

  async sendRecoverPasswordEmail(userMail: string) {
    const user = await this.usersService.findUserByEmail(userMail);

    if (!user) {
      return null;
    }

    user.recoveryToken = this.jwtService.sign(
      {
        data: user.id,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '1h',
      }
    );

    await this.usersService.update(userMail, user);

    this.mailService.sendMail({
      to: userMail,
      subject: `Redefinição de senha da sua conta MOVE.`,
      template: 'resetPassword',
      context: {
        frontUrl: process.env.FRONT_URL,
        token: user.recoveryToken,
        firstName: user.name,
        logo: process.env.MOVE_LOGO,
        facebook: process.env.FACEBOOK,
        facebookLink: process.env.FACEBOOK_LINK,
        instagram: process.env.INSTAGRAM,
        instagramLink: process.env.INSTAGRAM_LINK,
        youtube: process.env.YOUTUBE,
        youtubeLink: process.env.YOUTUBE_LINK,
        tiktok: process.env.TIKTOK,
        tiktokLink: process.env.TIKTOK_LINK,
        linkedin: process.env.LINKEDIN,
        linkedinLink: process.env.LINKEDIN_LINK,
      },
    });
  }
}
