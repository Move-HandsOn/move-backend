import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from 'src/supabase/supabase.service';
import { FileUploadDTO } from 'src/supabase/dto/upload.dto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly supabaseService: SupabaseService
  ) {}

  async create(createUserDto: CreateUserDto, file: FileUploadDTO) {
    const user = await this.findUserByEmail(createUserDto.email);

    if (user) {
      return null;
    }

    const uploadedFileUrl = await this.supabaseService.upload(file);

    const hashedPass = this.generateHash(createUserDto.password);

    const newUser = await this.prismaService.user.create({
      data: {
        ...createUserDto,
        profile_image: uploadedFileUrl,
        password: hashedPass,
      },
    });

    return newUser;
  }

  async getAllUserData(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profile_image: true,
        bio: true,
        gender: true,
        interests: true,
        activities: true,
        feed: true,
        groups: true,
        followers: true,
        following: true,
        events: true,
      },
    });

    return user;
  }

  async remove(id: string) {
    await this.prismaService.user.delete({
      where: {
        id,
      },
    });
  }

  async update(
    email: string,
    updateUserDto: UpdateUserDto,
    file?: FileUploadDTO
  ) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!this.hasUpdate(updateUserDto, file)) {
      throw new BadRequestException(
        'At least one field or the profile image must be updated.'
      );
    }

    if (updateUserDto.email && updateUserDto.email !== email) {
      const existingEmail = await this.findUserByEmail(updateUserDto.email);
      if (existingEmail) {
        throw new BadRequestException('Email already in use.');
      }
    }

    const updateData = await this.prepareUpdateData(user, updateUserDto, file);

    return this.prismaService.user.update({
      data: updateData,
      where: { id: user.id },
    });
  }

  // validation to ensure at least one field is present in the update
  private hasUpdate(
    updateUserDto: UpdateUserDto,
    file?: FileUploadDTO
  ): boolean {
    return Object.keys(updateUserDto).length > 0 || !!file;
  }

  // function to prepare update data for updating
  private async prepareUpdateData(
    user: User,
    updateUserDto: UpdateUserDto,
    file?: FileUploadDTO
  ) {
    const updateData = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = this.generateHash(updateUserDto.password);
    }

    if (file) {
      await this.handleProfileImageUpdate(user, updateData, file);
    }

    return updateData;
  }

  private async handleProfileImageUpdate(
    user: User,
    updateData: any,
    file: FileUploadDTO
  ) {
    const deletePromise = this.supabaseService.delete(user.profile_image);
    const uploadPromise = this.supabaseService.upload(file);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, uploadedFileUrl] = await Promise.all([
      deletePromise,
      uploadPromise,
    ]);

    updateData.profile_image = uploadedFileUrl;
  }

  async findUserByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    return user;
  }

  async findUserById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    return user;
  }

  async changePassword(recoveryToken: string, password: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        recoveryToken,
      },
    });

    const isValid = await this.jwtService.verifyAsync(recoveryToken, {
      secret: process.env.JWT_SECRET,
    });

    if (!isValid) return null;

    user.recoveryToken = null;

    return await this.update(user.email, { ...user, password });
  }

  generateHash(password: string): string {
    return bcrypt.hashSync(password, 10);
  }
}
