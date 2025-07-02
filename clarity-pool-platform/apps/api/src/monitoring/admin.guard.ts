import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // In production, implement proper admin role checking
    // For now, check if user has admin flag
    return request.user?.isAdmin === true;
  }
}
