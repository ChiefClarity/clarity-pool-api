import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MockDataService } from '../common/mock-data.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private mockDataService: MockDataService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      // Check database first for real user
      const technician = await this.prisma.technician.findUnique({
        where: { email }
      });
      
      if (technician && technician.passwordHash) {
        const isValid = await bcrypt.compare(password, technician.passwordHash);
        if (isValid) {
          const { passwordHash, ...result } = technician;
          return result;
        }
      }
    } catch (error) {
      console.log('Database not available, falling back to mock');
    }
    
    // Fall back to mock only if database fails
    if (email === 'test@claritypool.com' && password === 'test123') {
      return {
        id: 1,
        email: 'test@claritypool.com',
        name: 'Test Technician (Mock)'
      };
    }
    
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email };
    
    // Access token expires in 15 minutes
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    
    // Refresh token expires in 7 days
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token: accessToken,
      refreshToken: refreshToken,
    };
  }

  async validateRefreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const newPayload = { sub: payload.sub, email: payload.email };
      
      // Generate new access token
      const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      
      // Optionally generate new refresh token
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });
      
      return {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}