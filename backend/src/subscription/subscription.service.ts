import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

interface PlanConfig {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  limits: {
    instances: number | null; // null = unlimited
    messagesPerMonth: number | null;
    contacts: number | null;
    campaigns: number | null;
    teamMembers: number | null;
    aiCredits: number | null;
  };
}

// Plan configurations - Stripe Price IDs should be configured in production
const PLANS: PlanConfig[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    description: 'Pare de perder clientes por não responder a tempo',
    priceMonthly: 197,
    priceYearly: 1970, // ~17% desconto
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ESSENCIAL_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_ESSENCIAL_YEARLY || '',
    limits: {
      instances: 1,
      messagesPerMonth: 1000,
      contacts: 500,
      campaigns: 5,
      teamMembers: 1,
      aiCredits: 500,
    },
  },
  {
    id: 'profissional',
    name: 'Profissional',
    description: 'Nunca mais perca um cliente ou compromisso',
    priceMonthly: 297,
    priceYearly: 2970, // ~17% desconto
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PROFISSIONAL_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_PROFISSIONAL_YEARLY || '',
    limits: {
      instances: 1,
      messagesPerMonth: null, // ilimitado
      contacts: null,
      campaigns: null,
      teamMembers: 1,
      aiCredits: null, // ilimitado
    },
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    description: 'Soluções personalizadas para sua empresa',
    priceMonthly: 0, // Sob consulta
    priceYearly: 0,
    stripePriceIdMonthly: '', // Não tem - é sob consulta
    stripePriceIdYearly: '',
    limits: {
      instances: null,
      messagesPerMonth: null,
      contacts: null,
      campaigns: null,
      teamMembers: null,
      aiCredits: null,
    },
  },
];

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Initialize Stripe if API key is available
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia',
      });
      this.logger.log('Stripe initialized');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe disabled');
    }
  }

  /**
   * Get all available plans
   */
  getPlans() {
    return PLANS.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      limits: plan.limits,
    }));
  }

  /**
   * Get current subscription for a company
   */
  async getCurrentSubscription(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // If no subscription, return null
    if (!company.subscriptionId) {
      return null;
    }

    const plan = PLANS.find((p) => p.id === company.planId);

    return {
      id: company.subscriptionId,
      planId: company.planId,
      planName: plan?.name || 'Unknown',
      status: company.subscriptionStatus,
      billingPeriod: company.billingPeriod,
      currentPeriodStart: company.subscriptionPeriodStart,
      currentPeriodEnd: company.subscriptionPeriodEnd,
      cancelAtPeriodEnd: company.cancelAtPeriodEnd,
      limits: plan?.limits || null,
    };
  }

  /**
   * Create a Stripe Checkout Session
   */
  async createCheckoutSession(
    userId: string,
    companyId: string,
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new BadRequestException('Invalid plan');
    }

    const priceId =
      billingPeriod === 'yearly'
        ? plan.stripePriceIdYearly
        : plan.stripePriceIdMonthly;

    if (!priceId) {
      throw new BadRequestException(
        'Stripe prices not configured for this plan',
      );
    }

    // Get or create Stripe customer
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { users: { where: { id: userId } } },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    let customerId = company.stripeCustomerId;

    if (!customerId) {
      // Create Stripe customer
      const user = company.users[0];
      const customer = await this.stripe.customers.create({
        email: user?.email || undefined,
        name: company.name,
        metadata: {
          companyId: companyId,
          userId: userId,
        },
      });

      customerId = customer.id;

      // Save customer ID
      await this.prisma.company.update({
        where: { id: companyId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7, // 7 days free trial
        metadata: {
          companyId: companyId,
          planId: planId,
          billingPeriod: billingPeriod,
        },
      },
      success_url: `${frontendUrl}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}?subscription=cancelled`,
      metadata: {
        companyId: companyId,
        planId: planId,
        billingPeriod: billingPeriod,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    return { url: session.url };
  }

  /**
   * Create a Stripe Customer Portal session
   */
  async createPortalSession(companyId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company?.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${frontendUrl}?view=subscription`,
    });

    return { url: session.url };
  }

  /**
   * Create an embedded checkout session (for Stripe Elements)
   * Returns clientSecret for secure frontend payment
   */
  async createEmbeddedCheckout(
    userId: string,
    companyId: string,
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new BadRequestException('Invalid plan');
    }

    if (plan.priceMonthly === 0) {
      throw new BadRequestException('Este plano requer contato comercial');
    }

    const priceId =
      billingPeriod === 'yearly'
        ? plan.stripePriceIdYearly
        : plan.stripePriceIdMonthly;

    if (!priceId) {
      throw new BadRequestException(
        'Stripe prices not configured for this plan',
      );
    }

    // Get or create Stripe customer
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { users: { where: { id: userId } } },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    let customerId = company.stripeCustomerId;

    if (!customerId) {
      const user = company.users[0];
      const customer = await this.stripe.customers.create({
        email: user?.email || undefined,
        name: company.name,
        metadata: {
          companyId: companyId,
          userId: userId,
        },
      });

      customerId = customer.id;

      await this.prisma.company.update({
        where: { id: companyId },
        data: { stripeCustomerId: customerId },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Create embedded checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      ui_mode: 'embedded',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          companyId: companyId,
          planId: planId,
          billingPeriod: billingPeriod,
        },
      },
      return_url: `${frontendUrl}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        companyId: companyId,
        planId: planId,
        billingPeriod: billingPeriod,
      },
      allow_promotion_codes: true,
    });

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      plan: {
        id: plan.id,
        name: plan.name,
        price: billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly,
        billingPeriod,
      },
    };
  }

  /**
   * Get usage statistics for a company
   */
  async getUsage(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const plan = PLANS.find((p) => p.id === company.planId) || PLANS[0];

    // Get current month's start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count usage
    const [
      instanceCount,
      messageCount,
      contactCount,
      campaignCount,
      teamMemberCount,
    ] = await Promise.all([
      this.prisma.instance.count({
        where: { companyId },
      }),
      this.prisma.message.count({
        where: {
          instance: { companyId },
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.contact.count({
        where: { companyId },
      }),
      this.prisma.campaign.count({
        where: {
          companyId,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.user.count({
        where: { companyId },
      }),
    ]);

    return {
      instances: {
        used: instanceCount,
        limit: plan.limits.instances,
        percentage: plan.limits.instances
          ? Math.round((instanceCount / plan.limits.instances) * 100)
          : 0,
      },
      messages: {
        used: messageCount,
        limit: plan.limits.messagesPerMonth,
        percentage: plan.limits.messagesPerMonth
          ? Math.round((messageCount / plan.limits.messagesPerMonth) * 100)
          : 0,
      },
      contacts: {
        used: contactCount,
        limit: plan.limits.contacts,
        percentage: plan.limits.contacts
          ? Math.round((contactCount / plan.limits.contacts) * 100)
          : 0,
      },
      campaigns: {
        used: campaignCount,
        limit: plan.limits.campaigns,
        percentage: plan.limits.campaigns
          ? Math.round((campaignCount / plan.limits.campaigns) * 100)
          : 0,
      },
      teamMembers: {
        used: teamMemberCount,
        limit: plan.limits.teamMembers,
        percentage: plan.limits.teamMembers
          ? Math.round((teamMemberCount / plan.limits.teamMembers) * 100)
          : 0,
      },
      aiCredits: {
        used: company.aiCreditsUsed || 0,
        limit: plan.limits.aiCredits,
        percentage: plan.limits.aiCredits
          ? Math.round(((company.aiCreditsUsed || 0) / plan.limits.aiCredits) * 100)
          : 0,
      },
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const companyId = session.metadata?.companyId;
    const planId = session.metadata?.planId;
    const billingPeriod = session.metadata?.billingPeriod;

    if (!companyId || !planId) {
      this.logger.error('Missing metadata in checkout session');
      return;
    }

    this.logger.log(`Checkout completed for company ${companyId}, plan ${planId}`);

    // Subscription will be updated via subscription.updated webhook
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const companyId = subscription.metadata?.companyId;
    const planId = subscription.metadata?.planId;
    const billingPeriod = subscription.metadata?.billingPeriod as 'monthly' | 'yearly';

    if (!companyId) {
      // Try to find company by customer ID
      const company = await this.prisma.company.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });

      if (!company) {
        this.logger.error('Could not find company for subscription');
        return;
      }

      await this.updateCompanySubscription(
        company.id,
        subscription,
        planId || company.planId || 'starter',
        billingPeriod || 'monthly',
      );
    } else {
      await this.updateCompanySubscription(
        companyId,
        subscription,
        planId || 'starter',
        billingPeriod || 'monthly',
      );
    }
  }

  private async updateCompanySubscription(
    companyId: string,
    subscription: Stripe.Subscription,
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
  ) {
    const plan = PLANS.find((p) => p.id === planId);

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        planId: planId,
        billingPeriod: billingPeriod,
        subscriptionPeriodStart: new Date(
          subscription.current_period_start * 1000,
        ),
        subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        // Update limits based on plan
        maxInstances: plan?.limits.instances || 1,
        maxMessagesPerMonth: plan?.limits.messagesPerMonth || 1000,
        maxContacts: plan?.limits.contacts || 500,
        maxCampaigns: plan?.limits.campaigns || 2,
        maxTeamMembers: plan?.limits.teamMembers || 1,
        aiCreditsLimit: plan?.limits.aiCredits || 100,
      },
    });

    this.logger.log(
      `Updated subscription for company ${companyId}: ${subscription.status}`,
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const company = await this.prisma.company.findFirst({
      where: { subscriptionId: subscription.id },
    });

    if (!company) {
      this.logger.error('Could not find company for deleted subscription');
      return;
    }

    // Reset to free tier
    await this.prisma.company.update({
      where: { id: company.id },
      data: {
        subscriptionId: null,
        subscriptionStatus: 'canceled',
        planId: null,
        billingPeriod: null,
        subscriptionPeriodStart: null,
        subscriptionPeriodEnd: null,
        cancelAtPeriodEnd: false,
        maxInstances: 1,
        maxMessagesPerMonth: 100,
        maxContacts: 50,
        maxCampaigns: 0,
        maxTeamMembers: 1,
        aiCreditsLimit: 10,
      },
    });

    this.logger.log(`Subscription canceled for company ${company.id}`);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;

    if (!subscriptionId) return;

    const company = await this.prisma.company.findFirst({
      where: { subscriptionId },
    });

    if (!company) return;

    // Reset monthly usage counters
    await this.prisma.company.update({
      where: { id: company.id },
      data: {
        aiCreditsUsed: 0,
        // Add any other monthly counters to reset
      },
    });

    this.logger.log(`Invoice paid for company ${company.id}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;

    if (!subscriptionId) return;

    const company = await this.prisma.company.findFirst({
      where: { subscriptionId },
    });

    if (!company) return;

    // TODO: Send notification to user about failed payment
    this.logger.warn(`Payment failed for company ${company.id}`);
  }

  /**
   * Check if a company has reached a limit
   */
  async checkLimit(
    companyId: string,
    limitType: 'instances' | 'messages' | 'contacts' | 'campaigns' | 'teamMembers' | 'aiCredits',
  ): Promise<{ allowed: boolean; current: number; limit: number | null }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return { allowed: false, current: 0, limit: 0 };
    }

    const plan = PLANS.find((p) => p.id === company.planId) || PLANS[0];

    switch (limitType) {
      case 'instances': {
        const count = await this.prisma.instance.count({ where: { companyId } });
        return {
          allowed: !plan.limits.instances || count < plan.limits.instances,
          current: count,
          limit: plan.limits.instances,
        };
      }
      case 'contacts': {
        const count = await this.prisma.contact.count({ where: { companyId } });
        return {
          allowed: !plan.limits.contacts || count < plan.limits.contacts,
          current: count,
          limit: plan.limits.contacts,
        };
      }
      case 'aiCredits': {
        const used = company.aiCreditsUsed || 0;
        return {
          allowed: !plan.limits.aiCredits || used < plan.limits.aiCredits,
          current: used,
          limit: plan.limits.aiCredits,
        };
      }
      default:
        return { allowed: true, current: 0, limit: null };
    }
  }

  /**
   * Increment AI credits usage
   */
  async incrementAICredits(companyId: string, amount: number = 1) {
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        aiCreditsUsed: { increment: amount },
      },
    });
  }
}
