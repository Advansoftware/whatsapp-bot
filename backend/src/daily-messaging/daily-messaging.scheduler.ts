import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DailyMessagingService } from './daily-messaging.service';

@Injectable()
export class DailyMessagingScheduler {
  private readonly logger = new Logger(DailyMessagingScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyMessagingService: DailyMessagingService,
  ) { }

  // Run every day at 9:00 AM
  @Cron('0 9 * * *', {
    name: 'daily-messages',
    timeZone: 'America/Sao_Paulo',
  })
  async handleDailyMessages() {
    this.logger.log('Starting daily message cron job');

    try {
      // Get all companies that have active subscribers
      const companies = await this.prisma.dailyMessageSubscriber.findMany({
        where: { status: 'active' },
        select: { companyId: true },
        distinct: ['companyId'],
      });

      this.logger.log(`Found ${companies.length} companies with active subscribers`);

      for (const { companyId } of companies) {
        try {
          const result = await this.dailyMessagingService.sendDailyMessages(companyId);
          this.logger.log(`Company ${companyId}: sent=${result.sent}, failed=${result.failed}`);
        } catch (error: any) {
          this.logger.error(`Failed to send messages for company ${companyId}: ${error.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Daily message cron job failed: ${error.message}`);
    }

    this.logger.log('Daily message cron job completed');
  }

  // Manual trigger for testing
  async triggerManually(companyId: string) {
    this.logger.log(`Manual trigger for company ${companyId}`);
    return this.dailyMessagingService.sendDailyMessages(companyId);
  }
}
