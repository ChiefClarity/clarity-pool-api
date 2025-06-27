import { 
  Controller, 
  Post, 
  Delete, 
  Body, 
  UseGuards, 
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: string = 'general'
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const validCategories = ['water-chemistry', 'equipment', 'pool', 'general'];
    if (!validCategories.includes(category)) {
      throw new BadRequestException('Invalid category');
    }

    return this.uploadsService.uploadImage(
      file.buffer,
      file.mimetype,
      category as any,
      {
        originalName: file.originalname,
        size: file.size.toString(),
      }
    );
  }

  @Delete('image/:key')
  async deleteImage(@Param('key') key: string) {
    await this.uploadsService.deleteImage(key);
    return { success: true, message: 'Image deleted successfully' };
  }
}