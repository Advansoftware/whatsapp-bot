import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AISecretaryController } from './ai-secretary.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AISecretaryController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule { }
