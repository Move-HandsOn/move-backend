import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUser } from 'src/decorators/user.decorator';
import { User } from '@prisma/client';
import { Public } from 'src/decorators/public.decorator';
import { UserPresenter } from './presenter/user.presenter';
import { ChangePasswordDto } from './dto/changePasswordDto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadDTO } from 'src/supabase/dto/upload.dto';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('profile_image'))
  @Post('user')
  async create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file: FileUploadDTO
  ) {
    const user = await this.usersService.create(createUserDto, file);

    if (!user) {
      throw new ConflictException('Email already exists.');
    }

    const userPresenter = new UserPresenter(user);
    return userPresenter.toResponse();
  }

  @Get('profile')
  async findOne(@GetUser() user: User) {
    const userFound = await this.usersService.getAllUserData(user.id);

    if (!userFound) {
      throw new NotFoundException('User not found.');
    }

    return userFound;
  }

  @UseInterceptors(FileInterceptor('profile_image'))
  @Patch('profile')
  async update(
    @GetUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: FileUploadDTO
  ) {
    const updatedUser = await this.usersService.update(
      user.email,
      updateUserDto,
      file
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found or email already in use.');
    }

    const userPresenter = new UserPresenter(updatedUser);
    return userPresenter.toResponse();
  }

  @Delete('profile')
  async remove(@GetUser() user: User) {
    await this.usersService.remove(user.id);
    return { message: 'User deleted successfully' };
  }

  @Public()
  @Patch('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    if (changePasswordDto.password !== changePasswordDto.passwordConfirmation) {
      throw new BadRequestException('Passwords do not match');
    }

    const passwordChanged = await this.usersService.changePassword(
      token,
      changePasswordDto.password
    );

    if (!passwordChanged) {
      throw new BadRequestException('Token is invalid.');
    }

    return { message: 'Password changed successfully.' };
  }
}
