import { Module } from '@nestjs/common';
import { SecretaryTasksController } from './secretary-tasks.controller';
import { SecretaryTasksService } from './secretary-tasks.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SecretaryTasksController],
  providers: [SecretaryTasksService],
  exports: [SecretaryTasksService],
})
export class SecretaryTasksModule { }
