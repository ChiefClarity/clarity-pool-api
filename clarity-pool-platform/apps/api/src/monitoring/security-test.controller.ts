import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('api/monitoring/security')
export class SecurityTestController {
  @Get('headers')
  testHeaders(@Res({ passthrough: true }) res: Response) {
    return {
      message: 'Check response headers for security',
      headers: {
        'Strict-Transport-Security': res.getHeader('Strict-Transport-Security'),
        'X-Frame-Options': res.getHeader('X-Frame-Options'),
        'X-Content-Type-Options': res.getHeader('X-Content-Type-Options'),
        'Content-Security-Policy': res.getHeader('Content-Security-Policy'),
        'Permissions-Policy': res.getHeader('Permissions-Policy'),
      },
    };
  }
}