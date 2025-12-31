import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { ConnectionsController } from './connections.controller';
import { MessagesController } from './messages.controller';
import { ProductsController } from './products.controller';
import { ContactsController } from './contacts.controller';
import { CampaignsController } from './campaigns.controller';
import { AuthModule } from '../auth/auth.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AuthModule, AIModule],
  controllers: [DashboardController, ConnectionsController, MessagesController, ProductsController, ContactsController, CampaignsController],
})
export class ApiModule { }
