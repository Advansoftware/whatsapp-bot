import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { ConnectionsController } from './connections.controller';
import { MessagesController } from './messages.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController, ConnectionsController, MessagesController],
})
export class ApiModule { }
