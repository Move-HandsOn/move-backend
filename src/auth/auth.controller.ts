import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-user.dto';
import { RefreshTokenGuard } from './guards/jwt-refresh.guard';
import { GetUser } from '../decorators/user.decorator';
import { User } from '@prisma/client';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from '../decorators/public.decorator';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Body() user: LoginDto) {
    return await this.authService.login(user);
  }

  @Get('refresh')
  @UseGuards(RefreshTokenGuard)
  refreshTokens(@GetUser() user: User) {
    return this.authService.refreshAccess(user.email, user.refreshToken);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Headers('Authorization') userToken: string,
    @Headers('refresh_token') refreshToken: string
  ) {
    const tokenData = await this.authService.decryptToken(userToken);

    await this.authService.logout(tokenData.email, refreshToken);
    return;
  }
}
