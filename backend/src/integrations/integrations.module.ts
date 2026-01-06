import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsPublicController } from './integrations-public.controller';
import { GastometriaService } from './gastometria.service';
import { GoogleCalendarService } from './google-calendar.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [IntegrationsController, IntegrationsPublicController],
  providers: [GastometriaService, GoogleCalendarService],
  exports: [GastometriaService, GoogleCalendarService],
})
export class IntegrationsModule { }
