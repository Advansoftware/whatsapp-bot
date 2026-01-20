import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ContactAutomationController } from './contact-automation.controller';
import { ContactAutomationService } from './contact-automation.service';
import { ContactAutomationProcessorService } from './contact-automation-processor.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => AIModule),
  ],
  controllers: [ContactAutomationController],
  providers: [
    ContactAutomationService,
    ContactAutomationProcessorService,
  ],
  exports: [
    ContactAutomationService,
    ContactAutomationProcessorService,
  ],
})
export class ContactAutomationModule { }
