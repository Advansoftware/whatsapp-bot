import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsController } from './integrations.controller';
import { GastometriaService } from './gastometria.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [IntegrationsController],
  providers: [GastometriaService],
  exports: [GastometriaService],
})
export class IntegrationsModule { }
