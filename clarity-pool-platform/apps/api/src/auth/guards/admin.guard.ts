import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminEmails: string[];

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Load admin emails from config
    const adminEmailsConfig = this.configService.get<string>('ADMIN_EMAILS', '');
    this.adminEmails = adminEmailsConfig
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);
    
    // Add default admin email if configured
    const defaultAdminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (defaultAdminEmail && !this.adminEmails.includes(defaultAdminEmail.toLowerCase())) {
      this.adminEmails.push(defaultAdminEmail.toLowerCase());
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Check if user email is in admin list
      const userEmail = payload.email?.toLowerCase();
      if (!userEmail) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const isAdmin = this.adminEmails.includes(userEmail);
      if (!isAdmin) {
        throw new ForbiddenException('Access denied. Admin privileges required.');
      }

      // Attach user to request for use in handlers
      request['user'] = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * Check if an email has admin privileges
   */
  isAdminEmail(email: string): boolean {
    return this.adminEmails.includes(email.toLowerCase());
  }

  /**
   * Get list of admin emails (for display purposes)
   */
  getAdminEmails(): string[] {
    return [...this.adminEmails];
  }
}