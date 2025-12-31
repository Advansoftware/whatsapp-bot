import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) { }

  @Post('flows')
  async createFlow(@Request() req: any, @Body() body: any) {
    return this.chatbotService.createFlow(req.user.companyId, body);
  }

  @Get('flows')
  async getFlows(@Request() req: any) {
    return this.chatbotService.getFlows(req.user.companyId);
  }

  @Get('flows/:id')
  async getFlow(@Request() req: any, @Param('id') id: string) {
    return this.chatbotService.getFlow(id, req.user.companyId);
  }

  @Put('flows/:id')
  async updateFlow(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.chatbotService.updateFlow(id, req.user.companyId, body);
  }

  @Delete('flows/:id')
  async deleteFlow(@Request() req: any, @Param('id') id: string) {
    return this.chatbotService.deleteFlow(id, req.user.companyId);
  }
}
