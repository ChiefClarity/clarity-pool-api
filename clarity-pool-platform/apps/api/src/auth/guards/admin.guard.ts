// apps/api/src/auth/guards/admin.guard.ts
// ENTERPRISE GRADE - Proper admin authentication guard
import { 
  CanActivate, 
  ExecutionContext, 
  Injectable, 
  UnauthorizedException,
  Logger,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as Sentry from '@sentry/node';

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

interface AdminRequest extends Request {
  user?: JwtPayload;
  isAdmin?: boolean;
}

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly adminEmails: Set<string>;
  private readonly jwtSecret: string;
  
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Load admin emails from config
    const adminEmailsConfig = this.configService.get<string>('ADMIN_EMAILS', '');
    this.adminEmails = new Set(
      adminEmailsConfig
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(email => email.length > 0)
    );
    
    // Get JWT secret
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', '');
    
    if (this.adminEmails.size === 0) {
      this.logger.warn('No admin emails configured - admin endpoints will reject all requests');
    }
    
    if (!this.jwtSecret) {
      this.logger.error('JWT_SECRET not configured - admin endpoints will not work');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    
    // Log request details for debugging
    this.logger.debug('Admin guard checking request', {
      path: request.path,
      method: request.method,
      headers: {
        authorization: request.headers.authorization ? 'Present' : 'Missing',
      },
    });

    // Extract token
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      this.logger.warn('No token provided for admin endpoint', {
        path: request.path,
        method: request.method,
        ip: request.ip,
      });
      throw new UnauthorizedException('Authentication token required');
    }

    try {
      // Verify token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtSecret,
      });

      // Check token expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token has expired');
      }

      // Check if user is an admin
      const userEmail = payload.email?.toLowerCase();
      
      if (!userEmail) {
        this.logger.warn('Token payload missing email', {
          payload,
          path: request.path,
        });
        throw new UnauthorizedException('Invalid token payload');
      }

      // Check admin access
      const isAdmin = this.adminEmails.has(userEmail) || payload.role === 'admin';
      
      if (!isAdmin) {
        this.logger.warn('Non-admin user attempted to access admin endpoint', {
          email: userEmail,
          path: request.path,
          method: request.method,
          adminEmails: Array.from(this.adminEmails),
        });
        throw new ForbiddenException('Admin access required');
      }

      // Attach user to request for use in controllers
      request.user = payload;
      request.isAdmin = true;
      
      this.logger.log('Admin access granted', {
        email: userEmail,
        path: request.path,
        method: request.method,
      });
      
      return true;
    } catch (error) {
      this.logger.error('Admin authentication failed', {
        error: error.message,
        path: request.path,
        method: request.method,
        stack: error.stack,
      });

      // Log to Sentry in production
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
          tags: { 
            service: 'admin-guard',
            path: request.path,
          },
          user: {
            ip_address: request.ip,
          },
        });
      }

      // Re-throw specific errors
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      // Generic error for unexpected issues
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: AdminRequest): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      this.logger.warn('Invalid authorization header format', {
        authHeader: authHeader.substring(0, 20) + '...',
      });
      return undefined;
    }

    return token;
  }
}