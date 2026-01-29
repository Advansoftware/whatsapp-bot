import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyMessagingService } from './daily-messaging.service';

// Generic webhook payload
interface PurchaseWebhookPayload {
  event: string; // 'purchase' | 'refund' | 'cancel'
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  transaction?: {
    id?: string;
    product?: string;
  };
  // Hotmart-specific fields
  data?: {
    buyer?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    purchase?: {
      transaction?: string;
      product?: { name?: string };
    };
  };
}

@Controller('webhook')
export class DailyMessagingWebhookController {
  private readonly logger = new Logger(DailyMessagingWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly service: DailyMessagingService,
  ) { }

  // Generic purchase webhook (works with any platform)
  @Post('purchase/:companyId')
  @HttpCode(HttpStatus.OK)
  async handlePurchaseWebhook(
    @Param('companyId') companyId: string,
    @Body() payload: PurchaseWebhookPayload,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(`Received purchase webhook for company ${companyId}`);
    this.logger.debug('Payload:', JSON.stringify(payload, null, 2));

    try {
      // Verify company exists
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        this.logger.warn(`Company ${companyId} not found`);
        return { success: false, error: 'Company not found' };
      }

      // Extract customer data (handle different payload formats)
      const customer = this.extractCustomerData(payload);

      if (!customer.phone) {
        this.logger.warn('No phone number in webhook payload');
        return { success: false, error: 'Phone number required' };
      }

      const event = this.normalizeEvent(payload.event || (payload as any)['hottok'] ? 'hotmart' : 'generic');

      // Handle different events
      if (event === 'refund' || event === 'cancel') {
        const result = await this.service.refundSubscriber(companyId, customer.phone);
        return {
          success: true,
          action: 'refunded',
          subscriber: result?.id,
        };
      }

      // Default: purchase/create subscriber
      const subscriber = await this.service.createSubscriber(companyId, {
        name: customer.name || 'Customer',
        email: customer.email,
        phone: customer.phone,
        source: 'webhook',
        transactionId: payload.transaction?.id || payload.data?.purchase?.transaction,
        productName: payload.transaction?.product || payload.data?.purchase?.product?.name,
      });

      return {
        success: true,
        action: 'created',
        subscriber: subscriber.id,
      };
    } catch (error: any) {
      this.logger.error(`Webhook error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Hotmart-specific webhook
  @Post('hotmart/:companyId')
  @HttpCode(HttpStatus.OK)
  async handleHotmartWebhook(
    @Param('companyId') companyId: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(`Received Hotmart webhook for company ${companyId}`);

    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      // Hotmart event types
      const event = payload.event || payload.status;
      const isApproved = ['PURCHASE_APPROVED', 'APPROVED', 'approved', 'purchase_approved'].includes(event);
      const isRefund = ['PURCHASE_REFUNDED', 'REFUNDED', 'refunded', 'PURCHASE_CANCELED', 'CANCELED'].includes(event);

      // Extract buyer data from Hotmart payload
      const buyer = payload.data?.buyer || payload.buyer || {};
      const purchase = payload.data?.purchase || payload.purchase || {};

      const phone = buyer.phone || buyer.checkout_phone || buyer.cel_phone;
      const name = buyer.name || buyer.first_name || 'Customer';
      const email = buyer.email;

      if (!phone) {
        this.logger.warn('No phone in Hotmart payload');
        return { success: false, error: 'Phone required' };
      }

      if (isRefund) {
        const result = await this.service.refundSubscriber(companyId, phone);
        return { success: true, action: 'refunded', subscriber: result?.id };
      }

      if (isApproved) {
        const subscriber = await this.service.createSubscriber(companyId, {
          name,
          email,
          phone,
          source: 'hotmart',
          transactionId: purchase.transaction || purchase.trans || payload.transaction,
          productName: purchase.product?.name || purchase.product_name,
        });

        return { success: true, action: 'created', subscriber: subscriber.id };
      }

      return { success: true, action: 'ignored', event };
    } catch (error: any) {
      this.logger.error(`Hotmart webhook error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private extractCustomerData(payload: PurchaseWebhookPayload) {
    // Try generic format first
    if (payload.customer) {
      return payload.customer;
    }

    // Try Hotmart format
    if (payload.data?.buyer) {
      return {
        name: payload.data.buyer.name,
        email: payload.data.buyer.email,
        phone: payload.data.buyer.phone,
      };
    }

    return { name: '', email: '', phone: '' };
  }

  private normalizeEvent(event: string): string {
    const lowerEvent = event?.toLowerCase() || '';

    if (lowerEvent.includes('refund') || lowerEvent.includes('reembolso')) {
      return 'refund';
    }

    if (lowerEvent.includes('cancel') || lowerEvent.includes('cancelado')) {
      return 'cancel';
    }

    return 'purchase';
  }
}
