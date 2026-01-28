import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CrmGateway } from './crm.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CrmController],
  providers: [CrmService, CrmGateway],
  exports: [CrmService],
})
export class CrmModule { }
