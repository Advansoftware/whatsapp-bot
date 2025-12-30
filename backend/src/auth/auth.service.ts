import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleUserPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  companyId?: string;
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async validateGoogleToken(idToken: string): Promise<{ accessToken: string; user: any }> {
    try {
      // Verify Google ID Token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload() as GoogleUserPayload;

      if (!payload || !payload.email_verified) {
        throw new UnauthorizedException('Invalid or unverified Google account');
      }

      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { email: payload.email },
        include: { company: true },
      });

      if (!user) {
        // Create new user with a default company
        const company = await this.prisma.company.create({
          data: {
            name: `${payload.name}'s Company`,
            balance: 10.00, // Give new users some free credits
          },
        });

        user = await this.prisma.user.create({
          data: {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            googleId: payload.sub,
            companyId: company.id,
          },
          include: { company: true },
        });
      } else if (!user.googleId) {
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: payload.sub,
            picture: payload.picture,
          },
          include: { company: true },
        });
      }

      // Generate JWT
      const jwtPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture || '',
        companyId: user.companyId,
      };

      const accessToken = this.jwtService.sign(jwtPayload);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          company: user.company,
        },
      };
    } catch (error) {
      console.error('Google auth error:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async validateJwt(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
  }
}
