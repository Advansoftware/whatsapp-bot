import { Controller, Post, Body, Get, Put, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';

class GoogleAuthDto {
  idToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * POST /auth/register
   * Create new account with email/password
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * Login with email/password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/google
   * Receives Google ID Token from frontend, validates and returns JWT
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.validateGoogleToken(dto.idToken);
  }

  /**
   * GET /auth/me
   * Returns current user profile (protected route)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  /**
   * PUT /auth/profile
   * Update user profile
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  /**
   * POST /auth/change-password
   * Change user password
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }

  /**
   * GET /auth/has-password
   * Check if user has a password set
   */
  @Get('has-password')
  @UseGuards(JwtAuthGuard)
  async hasPassword(@Request() req: any) {
    const hasPassword = await this.authService.hasPassword(req.user.sub);
    return { hasPassword };
  }

  /**
   * GET /auth/verify
   * Verifies if the JWT token is valid
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Request() req: any) {
    return { valid: true, user: req.user };
  }
}
