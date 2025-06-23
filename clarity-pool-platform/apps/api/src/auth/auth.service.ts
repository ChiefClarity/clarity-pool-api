import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MockDataService } from '../common/mock-data.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private mockDataService: MockDataService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // Always return test user for test@claritypool.com/test123
    if (email === 'test@claritypool.com' && password === 'test123') {
      const testUser = this.mockDataService.getTechnician();
      const { passwordHash, ...result } = testUser;
      return result;
    }

    // In production, this would check against database
    // For now, check against mock data
    const technician = this.mockDataService.getTechnician();
    if (technician.email === email) {
      const isPasswordValid = await bcrypt.compare(password, technician.passwordHash);
      if (isPasswordValid) {
        const { passwordHash, ...result } = technician;
        return result;
      }
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