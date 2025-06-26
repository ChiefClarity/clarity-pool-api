import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check for bypass token
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer internal-service-token')) {
      return true;
    }

    // Check for whitelisted IPs
    const clientIp = request.headers['x-forwarded-for']?.split(',')[0] || 
                     request.headers['x-real-ip'] || 
                     request.connection?.remoteAddress || 
                     request.ip;
                     
    if (this.isWhitelistedIp(clientIp)) {
      return true;
    }

    try {
      const result = await super.canActivate(context);
      return result;
    } catch (error) {
      // Log rate limit violations
      console.warn('Rate limit exceeded:', {
        ip: clientIp,
        endpoint: request.url,
        method: request.method,
        user: request.user?.id,
        timestamp: new Date().toISOString(),
      });
      
      throw new ThrottlerException('Too many requests. Please try again later.');
    }
  }

  private isWhitelistedIp(ip: string): boolean {
    const whitelist = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    return whitelist.includes(ip);
  }
}