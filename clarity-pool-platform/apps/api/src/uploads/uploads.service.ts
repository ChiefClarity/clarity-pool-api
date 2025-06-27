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
      this.logger.log(`Starting image upload for category: ${category}`);
      this.logger.log(`Buffer size: ${buffer.length}, MimeType: ${mimeType}`);
      
      // Validate image
      let imageInfo;
      try {
        imageInfo = await sharp(buffer).metadata();
        this.logger.log(`Image metadata: ${JSON.stringify(imageInfo)}`);
      } catch (sharpError) {
        this.logger.error('Sharp metadata extraction failed:', sharpError);
        throw new BadRequestException('Failed to process image file');
      }
      
      if (!imageInfo.width || !imageInfo.height) {
        throw new BadRequestException('Invalid image file - no dimensions');
      }

      // Generate unique key
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      const extension = mimeType.split('/')[1] || 'jpg';
      const key = `${category}/${timestamp}-${uniqueId}.${extension}`;
      this.logger.log(`Generated S3 key: ${key}`);

      // Process image (resize for web, maintain quality)
      let processedImage;
      try {
        processedImage = await sharp(buffer)
          .resize(2048, 2048, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
        this.logger.log(`Processed image size: ${processedImage.length} bytes`);
      } catch (sharpError) {
        this.logger.error('Sharp image processing failed:', sharpError);
        throw new BadRequestException('Failed to process image');
      }

      // Upload main image
      try {
        this.logger.log(`Uploading to S3 bucket: ${this.bucketName}`);
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
        this.logger.log('Main image uploaded successfully');
      } catch (s3Error) {
        this.logger.error('S3 upload failed:', s3Error);
        this.logger.error('S3 Error details:', JSON.stringify(s3Error, null, 2));
        throw new Error(`S3 upload failed: ${s3Error.message}`);
      }

      // Create and upload thumbnail
      const thumbnailKey = key.replace(/\.[^.]+$/, '-thumb.jpg');
      let thumbnail;
      try {
        thumbnail = await sharp(buffer)
          .resize(400, 400, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 70 })
          .toBuffer();
        this.logger.log(`Thumbnail size: ${thumbnail.length} bytes`);
      } catch (sharpError) {
        this.logger.error('Thumbnail generation failed:', sharpError);
        // Don't fail the upload if thumbnail fails
      }

      if (thumbnail) {
        try {
          await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucketName,
            Key: thumbnailKey,
            Body: thumbnail,
            ContentType: 'image/jpeg',
          }));
          this.logger.log('Thumbnail uploaded successfully');
        } catch (s3Error) {
          this.logger.error('Thumbnail S3 upload failed:', s3Error);
          // Don't fail the upload if thumbnail fails
        }
      }

      const baseUrl = `https://${this.bucketName}.s3.amazonaws.com`;
      
      this.logger.log(`Image uploaded successfully: ${key}`);
      
      return {
        url: `${baseUrl}/${key}`,
        key,
        thumbnailUrl: thumbnail ? `${baseUrl}/${thumbnailKey}` : undefined,
      };
    } catch (error) {
      this.logger.error('Image upload failed:', error);
      this.logger.error('Error type:', error.constructor.name);
      this.logger.error('Error stack:', error.stack);
      
      if (error instanceof BadRequestException) throw error;
      
      throw new BadRequestException(`Failed to upload image: ${error.message}`);
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