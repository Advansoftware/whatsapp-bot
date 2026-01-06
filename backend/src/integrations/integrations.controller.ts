import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GastometriaService } from './gastometria.service';

@Controller('api/integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly gastometriaService: GastometriaService) { }

  // ========================================
  // GASTOMETRIA
  // ========================================

  @Get('gastometria/status')
  async getGastometriaStatus(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.gastometriaService.getStatus(companyId);
  }

  @Post('gastometria/connect')
  async connectGastometria(
    @Request() req: any,
    @Body() body: { email: string; password: string },
  ) {
    const companyId = req.user.companyId;
    return this.gastometriaService.connect(companyId, body.email, body.password);
  }

  @Delete('gastometria')
  async disconnectGastometria(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.gastometriaService.disconnect(companyId);
  }

  @Get('gastometria/wallets')
  async getGastometriaWallets(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.gastometriaService.getWallets(companyId);
  }

  @Put('gastometria/config')
  async setGastometriaConfig(
    @Request() req: any,
    @Body() body: { defaultWalletId: string },
  ) {
    const companyId = req.user.companyId;
    const success = await this.gastometriaService.setDefaultWallet(companyId, body.defaultWalletId);
    return { success };
  }

  @Get('gastometria/balance')
  async getGastometriaBalance(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.gastometriaService.getBalance(companyId);
  }

  @Post('gastometria/transactions')
  async createGastometriaTransaction(
    @Request() req: any,
    @Body() body: {
      amount: number;
      type: 'income' | 'expense';
      category: string;
      item: string;
      date?: string;
      establishment?: string;
    },
  ) {
    const companyId = req.user.companyId;
    return this.gastometriaService.createTransaction(companyId, body);
  }
}
