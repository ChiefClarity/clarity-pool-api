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
    this.adminEmails = new Set(
      this.configService
        .get('ADMIN_EMAILS', '')
        .split(',')
        .map(email => email.trim().toLowerCase())
    );
    
    this.adminPassword = this.configService.get('ADMIN_PASSWORD', '');
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