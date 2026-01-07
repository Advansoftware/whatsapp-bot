import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import axios from 'axios';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

import { IsString, IsNotEmpty } from 'class-validator';

class CreateInstanceDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller('api/connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly prisma: PrismaService) { }

  @Get()
  async getConnections(@Request() req: any) {
    const companyId = req.user.companyId;

    const instances = await this.prisma.instance.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return instances.map((instance) => ({
      id: instance.id,
      name: instance.name,
      instanceKey: instance.instanceKey,
      status: instance.status,
      createdAt: instance.createdAt,
    }));
  }

  @Post()
  async createConnection(@Request() req: any, @Body() dto: CreateInstanceDto) {
    const companyId = req.user.companyId;

    // Generate unique instance key
    const instanceKey = `${companyId.slice(0, 8)}_${Date.now()}`;

    // 1. Create instance in Evolution API
    try {
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
      const evolutionApiKey = process.env.EVOLUTION_API_KEY;

      const response = await axios.post(
        `${evolutionUrl}/instance/create`,
        {
          instanceName: instanceKey,
          token: instanceKey, // Using instanceKey as token for simplicity
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        },
        {
          headers: {
            'apikey': evolutionApiKey,
          },
        },
      );

      // 2. Save to Database
      const instance = await this.prisma.instance.create({
        data: {
          name: dto.name,
          instanceKey,
          companyId,
          status: 'disconnected', // Initial status
        },
      });

      // 3. Construct QR Code URL (Evolution v2 returns it in response usually, or validates it)
      // For v2, we can fetch the connect QR directly if not returned
      console.log('Evolution Create Response:', JSON.stringify(response.data, null, 2));

      // 3. Construct QR Code URL
      let qrCodeUrl: string | undefined;

      const qrData = response.data?.qrcode;
      if (qrData && (qrData.base64 || qrData.code || qrData.pairingCode)) {
        qrCodeUrl = qrData.base64 || qrData.code || qrData.pairingCode;
      } else {
        // Fallback: If no QR returned immediately (common with Redis enabled), wait and fetch connect
        console.log('QR Code not returned in create, attempting to fetch from connect endpoint...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

        try {
          const connectResponse = await axios.get(
            `${evolutionUrl}/instance/connect/${instanceKey}`,
            { headers: { 'apikey': evolutionApiKey } }
          );
          const connectQrData = connectResponse.data?.qrcode || connectResponse.data;
          qrCodeUrl = connectQrData?.base64 || connectQrData?.code || connectQrData?.pairingCode;
          console.log('Fallback QR Fetch:', { found: !!qrCodeUrl });
        } catch (connErr) {
          console.error('Error fetching fallback QR:', connErr.message);
        }
      }

      console.log('Final QR Data:', { qrCodeUrl: qrCodeUrl ? (qrCodeUrl.substring(0, 50) + '...') : 'null' });

      return {
        id: instance.id,
        name: instance.name,
        instanceKey: instance.instanceKey,
        status: instance.status,
        qrCodeUrl: qrCodeUrl || 'Aguardando QR Code...',
      };
    } catch (error) {
      console.error('Error creating evolution instance:', error.response?.data || error.message);

      // Fallback: If Evolution is down, maybe throw error or return generic error
      if (error.response?.data) {
        throw new HttpException(error.response.data, error.response.status);
      }
      throw new HttpException('Failed to create WhatsApp instance', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get(':id')
  async getConnection(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const instance = await this.prisma.instance.findFirst({
      where: { id, companyId },
    });

    if (!instance) {
      return { error: 'Instance not found' };
    }

    return instance;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConnection(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const instance = await this.prisma.instance.findFirst({
      where: { id, companyId },
    });

    if (!instance) {
      throw new HttpException('Instance not found', HttpStatus.NOT_FOUND);
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    // 1. Try to Logout first (best practice to clear session on WA side if possible)
    try {
      await axios.delete(
        `${evolutionUrl}/instance/logout/${instance.instanceKey}`,
        { headers: { 'apikey': evolutionApiKey } }
      );
    } catch (error) {
      // Ignore logout errors (instance might be already closed)
      console.log(`Logout failed for ${instance.instanceKey}, proceeding to delete. Error: ${error.message}`);
    }

    // 2. Delete from Evolution API
    try {
      await axios.delete(
        `${evolutionUrl}/instance/delete/${instance.instanceKey}`,
        { headers: { 'apikey': evolutionApiKey } }
      );
    } catch (error: any) {
      console.error('Error deleting evolution instance:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Continue to delete from DB even if Evolution fails (avoid inconsistent state)
    }

    await this.prisma.instance.deleteMany({
      where: { id, companyId },
    });

    return;
  }

  @Post(':id/refresh-qr')
  async refreshQrCode(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const instance = await this.prisma.instance.findFirst({
      where: { id, companyId },
    });

    if (!instance) {
      return { error: 'Instance not found' };
    }

    // TODO: Call Evolution API to refresh QR code
    try {
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
      const evolutionApiKey = process.env.EVOLUTION_API_KEY;

      // Call connect endpoint to get new QR
      const response = await axios.get(
        `${evolutionUrl}/instance/connect/${instance.instanceKey}`,
        { headers: { 'apikey': evolutionApiKey } }
      );

      console.log('Evolution Refresh Response:', JSON.stringify(response.data, null, 2));

      const qrData = response.data?.qrcode || response.data;
      // Some versions return directly the object, others inside qrcode property
      const qrCodeUrl = qrData?.base64 || qrData?.code || qrData?.pairingCode;

      console.log('Extracted Refresh QR:', { qrCodeUrl: qrCodeUrl ? (qrCodeUrl.substring(0, 50) + '...') : 'null' });

      return {
        instanceKey: instance.instanceKey,
        qrCodeUrl: qrCodeUrl || 'Erro ao gerar novo QR',
      };
    } catch (error) {
      console.error('Error refreshing QR:', error);
      return {
        instanceKey: instance.instanceKey,
        qrCodeUrl: 'Erro de conexão com Evolution API',
      };
    }
  }

  @Post(':id/reconnect')
  async reconnectInstance(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const instance = await this.prisma.instance.findFirst({
      where: { id, companyId },
    });

    if (!instance) {
      throw new HttpException('Instance not found', HttpStatus.NOT_FOUND);
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    try {
      // 1. Tentar logout da sessão atual (desvincula do celular)
      console.log(`[Reconnect] Logging out instance: ${instance.instanceKey}`);
      try {
        await axios.delete(
          `${evolutionUrl}/instance/logout/${instance.instanceKey}`,
          { headers: { 'apikey': evolutionApiKey } }
        );
        console.log(`[Reconnect] Logout successful for ${instance.instanceKey}`);
      } catch (logoutError: any) {
        console.log(`[Reconnect] Logout warning for ${instance.instanceKey}: ${logoutError.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Verificar se a instância existe na Evolution API
      let instanceExists = true;
      try {
        await axios.get(
          `${evolutionUrl}/instance/fetchInstances?instanceName=${instance.instanceKey}`,
          { headers: { 'apikey': evolutionApiKey } }
        );
      } catch (fetchError: any) {
        if (fetchError.response?.status === 404) {
          instanceExists = false;
        }
      }

      let qrCodeUrl: string | undefined;

      // 3. Se a instância não existe, recriar na Evolution (mantendo o mesmo instanceKey)
      if (!instanceExists) {
        console.log(`[Reconnect] Instance not found in Evolution, recreating: ${instance.instanceKey}`);

        try {
          const createResponse = await axios.post(
            `${evolutionUrl}/instance/create`,
            {
              instanceName: instance.instanceKey,
              token: instance.instanceKey,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
            },
            { headers: { 'apikey': evolutionApiKey } }
          );

          console.log('[Reconnect] Create Response:', JSON.stringify(createResponse.data, null, 2));

          const qrData = createResponse.data?.qrcode;
          qrCodeUrl = qrData?.base64 || qrData?.code || qrData?.pairingCode;

          // Se não veio o QR no create, buscar no connect
          if (!qrCodeUrl) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const connectResponse = await axios.get(
              `${evolutionUrl}/instance/connect/${instance.instanceKey}`,
              { headers: { 'apikey': evolutionApiKey } }
            );
            const connectQrData = connectResponse.data?.qrcode || connectResponse.data;
            qrCodeUrl = connectQrData?.base64 || connectQrData?.code || connectQrData?.pairingCode;
          }
        } catch (createError: any) {
          console.error('[Reconnect] Create error:', createError.response?.data || createError.message);
          throw createError;
        }
      } else {
        // 4. Se a instância existe, apenas buscar novo QR
        console.log(`[Reconnect] Requesting new QR code for: ${instance.instanceKey}`);
        const connectResponse = await axios.get(
          `${evolutionUrl}/instance/connect/${instance.instanceKey}`,
          { headers: { 'apikey': evolutionApiKey } }
        );

        console.log('[Reconnect] Connect Response:', JSON.stringify(connectResponse.data, null, 2));

        const qrData = connectResponse.data?.qrcode || connectResponse.data;
        qrCodeUrl = qrData?.base64 || qrData?.code || qrData?.pairingCode;
      }

      // 5. Atualizar status no banco (mantém todos os dados, só muda status)
      await this.prisma.instance.update({
        where: { id },
        data: { status: 'disconnected' },
      });

      console.log(`[Reconnect] Successfully initiated reconnect for ${instance.instanceKey}, QR: ${qrCodeUrl ? 'obtained' : 'not available'}`);

      return {
        success: true,
        id: instance.id,
        name: instance.name,
        instanceKey: instance.instanceKey,
        status: 'disconnected',
        qrCodeUrl: qrCodeUrl || 'Aguardando QR Code...',
        message: 'Escaneie o novo QR Code para reconectar.',
      };
    } catch (error: any) {
      console.error('[Reconnect] Error:', error.response?.data || error.message);
      throw new HttpException(
        'Falha ao reconectar instância. Tente novamente.',
        HttpStatus.BAD_GATEWAY
      );
    }
  }
}
