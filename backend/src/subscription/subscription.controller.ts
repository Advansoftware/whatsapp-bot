import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';

class CreateCheckoutSessionDto {
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
}

class CreateEmbeddedCheckoutDto {
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
}

@Controller('api/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) { }

  /**
   * GET /api/subscription/plans
   * Get available subscription plans
   */
  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  /**
   * GET /api/subscription/current
   * Get current user's subscription
   */
  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentSubscription(@Request() req: any) {
    return this.subscriptionService.getCurrentSubscription(req.user.companyId);
  }

  /**
   * POST /api/subscription/create-checkout-session
   * Create a Stripe Checkout Session for subscription
   */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.subscriptionService.createCheckoutSession(
      req.user.sub,
      req.user.companyId,
      dto.planId,
      dto.billingPeriod,
    );
  }

  /**
   * POST /api/subscription/create-portal-session
   * Create a Stripe Customer Portal session
   */
  @Post('create-portal-session')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@Request() req: any) {
    return this.subscriptionService.createPortalSession(req.user.companyId);
  }

  /**
   * POST /api/subscription/create-embedded-checkout
   * Create an embedded checkout session (Stripe Elements)
   * Returns clientSecret for secure payment on the frontend
   */
  @Post('create-embedded-checkout')
  @UseGuards(JwtAuthGuard)
  async createEmbeddedCheckout(
    @Request() req: any,
    @Body() dto: CreateEmbeddedCheckoutDto,
  ) {
    return this.subscriptionService.createEmbeddedCheckout(
      req.user.sub,
      req.user.companyId,
      dto.planId,
      dto.billingPeriod,
    );
  }

  /**
   * GET /api/subscription/usage
   * Get current usage stats for the subscription
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Request() req: any) {
    return this.subscriptionService.getUsage(req.user.companyId);
  }

  /**
   * POST /api/subscription/webhook
   * Handle Stripe webhook events
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    return this.subscriptionService.handleWebhook(rawBody, signature);
  }
}
