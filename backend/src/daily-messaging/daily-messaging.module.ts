import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyMessagingService } from './daily-messaging.service';
import { DailyMessagingController } from './daily-messaging.controller';
import { DailyMessagingScheduler } from './daily-messaging.scheduler';
import { DailyMessagingWebhookController } from './daily-messaging-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  controllers: [DailyMessagingController, DailyMessagingWebhookController],
  providers: [DailyMessagingService, DailyMessagingScheduler],
  exports: [DailyMessagingService],
})
export class DailyMessagingModule { }
