import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@Controller('api/auth/admin')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);
  private readonly adminEmails: Set<string>;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    // Load admin emails from environment
    const adminEmailsConfig = this.configService.get<string>('ADMIN_EMAILS', '');
    
    this.adminEmails = new Set<string>(
      adminEmailsConfig
        .split(',')
        .filter((email: string) => email.length > 0)
        .map((email: string) => email.trim().toLowerCase())
    );
    
    if (this.adminEmails.size === 0) {
      this.logger.error('No admin emails configured. Check ADMIN_EMAILS environment variable.');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const email = dto.email.toLowerCase();
    
    // First check if email is in admin whitelist
    if (!this.adminEmails.has(email)) {
      this.logger.warn(`Non-admin login attempt: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      // Use the existing validateUser method that checks database
      const user = await this.authService.validateUser(dto.email, dto.password);
      
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Use the existing login method but add admin flag
      const loginResult = await this.authService.login(user);
      
      // Add admin-specific properties
      return {
        ...loginResult,
        user: {
          ...loginResult.user,
          role: 'admin',
          isAdmin: true,
          permissions: ['*'], // Full admin permissions
        },
      };
      
    } catch (error) {
      this.logger.error(`Admin login failed for ${email}:`, error.message);
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}