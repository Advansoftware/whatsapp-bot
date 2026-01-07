import { Module, forwardRef } from '@nestjs/common';
import { GroupAutomationsController } from './group-automations.controller';
import { GroupAutomationsService } from './group-automations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AIModule),
  ],
  controllers: [GroupAutomationsController],
  providers: [GroupAutomationsService],
  exports: [GroupAutomationsService],
})
export class GroupAutomationsModule { }
