import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Additional security headers not covered by Helmet

    // Permissions Policy (formerly Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=()',
    );

    // Clear Site Data - for logout
    if (req.path.includes('/logout')) {
      res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    }

    // X-Content-Type-Options (redundant with Helmet but ensuring)
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Cache Control for sensitive routes
    if (
      req.path.includes('/api/auth') ||
      req.path.includes('/api/onboarding')
    ) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Remove fingerprinting headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  }
}
