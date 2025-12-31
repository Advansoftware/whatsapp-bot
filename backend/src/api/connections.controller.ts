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
      const qrCodeUrl = response.data?.qrcode?.base64 || `${evolutionUrl}/instance/connect/${instanceKey}`;

      return {
        id: instance.id,
        name: instance.name,
        instanceKey: instance.instanceKey,
        status: instance.status,
        qrCodeUrl, // This might need to be proxied or base64
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
    return {
      instanceKey: instance.instanceKey,
      qrCodeUrl: `${process.env.EVOLUTION_API_URL}/instance/connect/${instance.instanceKey}`,
    };
  }
}
