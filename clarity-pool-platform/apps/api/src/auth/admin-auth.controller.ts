import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Controller('api/auth/admin')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);
  private readonly adminEmails: Set<string>;
  private readonly adminPassword: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Get admin emails with proper type safety
    const adminEmailsConfig = this.configService.get<string>('ADMIN_EMAILS', '');
    
    this.adminEmails = new Set<string>(
      adminEmailsConfig
        .split(',')
        .filter((email: string) => email.length > 0)
        .map((email: string) => email.trim().toLowerCase())
    );
    
    // Validate admin emails configuration
    if (this.adminEmails.size === 0) {
      this.logger.error('No admin emails configured. Check ADMIN_EMAILS environment variable.');
    }
    
    // Get admin password with validation
    this.adminPassword = this.configService.get<string>('ADMIN_PASSWORD', '');
    
    if (!this.adminPassword) {
      this.logger.error('No admin password configured. Check ADMIN_PASSWORD environment variable.');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const email = dto.email.toLowerCase();
    
    if (!this.adminEmails.has(email)) {
      this.logger.warn(`Non-admin login attempt: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!this.adminPassword || dto.password !== this.adminPassword) {
      this.logger.warn(`Invalid password for admin: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Use ADMIN_JWT_SECRET for admin tokens
    const jwtSecret = this.configService.get('ADMIN_JWT_SECRET');
    
    const payload = {
      email,
      role: 'admin',
      isAdmin: true,
      sub: `admin-${email}`,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: '24h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: '7d',
    });

    this.logger.log(`Admin login successful: ${email}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400,
      user: {
        id: `admin-${email}`,
        email,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        permissions: ['*'],
      },
    };
  }
}