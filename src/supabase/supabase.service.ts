import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FileUploadDTO } from './dto/upload.dto';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    this.supabase = createClient(this.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  async upload(file: FileUploadDTO) {
    const fileName = this.handleGenerateRandomFileName(file);

    const { data, error } = await this.supabase.storage
      .from('move')
      .upload(fileName, file.buffer, {
        upsert: true,
        contentType: file.mimetype,
      });

    if (error) {
      throw new BadRequestException('Error uploading image. Please try again.');
    }

    const imgUrl = `${this.supabaseUrl}/storage/v1/object/public/${data.fullPath}`;

    return imgUrl;
  }

  async delete(imgUrl: string) {
    const fileName = imgUrl.split('/').pop();
    const { error } = await this.supabase.storage
      .from('move')
      .remove([fileName]);

    if (error) {
      throw new BadRequestException('Error deleting image. Please try again.');
    }

    return;
  }

  handleGenerateRandomFileName(file: FileUploadDTO) {
    const fileExtension = file.originalname.split('.').pop();
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;
  }
}
