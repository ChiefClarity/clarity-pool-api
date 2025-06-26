import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityConfig {
  constructor(private configService: ConfigService) {}

  getHelmetOptions() {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    
    return {
      // Content Security Policy - Prevent XSS
      contentSecurityPolicy: isDevelopment ? false : {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://*.sentry.io'], // Allow Sentry
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      
      // Strict Transport Security - Force HTTPS
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      
      // Other security headers
      crossOriginEmbedderPolicy: !isDevelopment,
      crossOriginOpenerPolicy: { policy: 'same-origin' as const },
      crossOriginResourcePolicy: { policy: 'cross-origin' as const },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' as const }, // Prevent clickjacking
      hidePoweredBy: true, // Hide X-Powered-By
      ieNoOpen: true,
      noSniff: true, // Prevent MIME sniffing
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
    };
  }

  getCorsOptions() {
    const allowedOrigins = this.configService.get('ALLOWED_ORIGINS', '').split(',').filter(Boolean);
    
    // Default allowed origins
    const defaultOrigins = [
      // Development
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:8081',
      'http://localhost:8080',
      'http://localhost:19006', // Expo web
      
      // Production (current)
      'https://www.getclarity.services',
      'https://getclarity.services',
      
      // Future subdomains (when created)
      // 'https://api.getclarity.services',
      // 'https://tech.getclarity.services',
      // 'https://app.getclarity.services',
    ];
    
    const allOrigins = [...defaultOrigins, ...allowedOrigins];
    
    return {
      origin: (origin: string | undefined, callback: Function) => {
        // Allow requests with no origin (mobile apps, Postman)
        if (!origin) {
          return callback(null, true);
        }
        
        // For development, allow any localhost
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        
        // Allow Replit domains for development
        if (origin.includes('.replit.dev') || origin.includes('.repl.co') || origin.includes('.replit.app')) {
          console.log(`✅ Allowing Replit origin: ${origin}`);
          return callback(null, true);
        }
        
        // Check allowed origins
        if (allOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Log rejected origin for debugging
        console.warn(`CORS rejected origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Rate-Limit-Bypass', // For internal services
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      maxAge: 86400, // 24 hours
    };
  }

  getCompressionOptions() {
    return {
      // Only compress responses larger than 1KB
      threshold: 1024,
      // Compression level (0-9, 6 is balanced)
      level: 6,
      // Skip compression for Server-Sent Events
      filter: (req: any, res: any) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return true;
      },
    };
  }
}