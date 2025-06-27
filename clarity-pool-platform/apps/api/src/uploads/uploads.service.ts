import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME')!;
    
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });

    this.validateConfig();
  }

  private validateConfig() {
    const required = ['S3_BUCKET_NAME', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const missing = required.filter(key => !this.configService.get(key));
    
    if (missing.length > 0) {
      this.logger.error(`Missing required environment variables: ${missing.join(', ')}`);
      throw new Error('Upload service configuration incomplete');
    }
  }

  async uploadImage(
    buffer: Buffer,
    mimeType: string,
    category: 'water-chemistry' | 'equipment' | 'pool' | 'general',
    metadata: Record<string, string> = {}
  ): Promise<{ url: string; key: string; thumbnailUrl?: string }> {
    try {
      // Validate image
      const imageInfo = await sharp(buffer).metadata();
      if (!imageInfo.width || !imageInfo.height) {
        throw new BadRequestException('Invalid image file');
      }

      // Generate unique key
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      const extension = mimeType.split('/')[1] || 'jpg';
      const key = `${category}/${timestamp}-${uniqueId}.${extension}`;

      // Process image (resize for web, maintain quality)
      const processedImage = await sharp(buffer)
        .resize(2048, 2048, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Upload main image
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: processedImage,
        ContentType: 'image/jpeg',
        Metadata: {
          ...metadata,
          originalWidth: imageInfo.width.toString(),
          originalHeight: imageInfo.height.toString(),
          uploadedAt: new Date().toISOString(),
        },
      }));

      // Create and upload thumbnail
      const thumbnailKey = key.replace(/\.[^.]+$/, '-thumb.jpg');
      const thumbnail = await sharp(buffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/jpeg',
      }));

      const baseUrl = `https://${this.bucketName}.s3.amazonaws.com`;
      
      this.logger.log(`Image uploaded successfully: ${key}`);
      
      return {
        url: `${baseUrl}/${key}`,
        key,
        thumbnailUrl: `${baseUrl}/${thumbnailKey}`,
      };
    } catch (error) {
      this.logger.error('Image upload failed:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to upload image');
    }
  }

  async deleteImage(key: string): Promise<void> {
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));

      // Also delete thumbnail
      const thumbnailKey = key.replace(/\.[^.]+$/, '-thumb.jpg');
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: thumbnailKey,
      }));

      this.logger.log(`Image deleted: ${key}`);
    } catch (error) {
      this.logger.error('Image deletion failed:', error);
      throw new BadRequestException('Failed to delete image');
    }
  }
}