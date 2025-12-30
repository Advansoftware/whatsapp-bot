import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

class CreateInstanceDto {
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

    const instance = await this.prisma.instance.create({
      data: {
        name: dto.name,
        instanceKey,
        companyId,
        status: 'disconnected',
      },
    });

    return {
      id: instance.id,
      name: instance.name,
      instanceKey: instance.instanceKey,
      status: instance.status,
      qrCodeUrl: `${process.env.EVOLUTION_API_URL}/instance/connect/${instanceKey}`,
    };
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
