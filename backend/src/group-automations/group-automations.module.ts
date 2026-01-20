import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroupAutomationsController } from './group-automations.controller';
import { GroupAutomationsService } from './group-automations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => AIModule),
  ],
  controllers: [GroupAutomationsController],
  providers: [GroupAutomationsService],
  exports: [GroupAutomationsService],
})
export class GroupAutomationsModule { }
