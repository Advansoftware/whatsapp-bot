import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) { }

  @Get('stats')
  async getStats(@Request() req: any) {
    const companyId = req.user.companyId;

    // Get message counts
    const [totalMessages, todayMessages, activeInstances, company] = await Promise.all([
      this.prisma.message.count({
        where: { companyId },
      }),
      this.prisma.message.count({
        where: {
          companyId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.instance.count({
        where: { companyId, status: 'connected' },
      }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { balance: true },
      }),
    ]);

    // Get last month messages for comparison
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);

    const lastMonthMessages = await this.prisma.message.count({
      where: {
        companyId,
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    const thisMonthMessages = await this.prisma.message.count({
      where: {
        companyId,
        createdAt: {
          gte: new Date(new Date().setDate(1)),
        },
      },
    });

    const messageGrowth = lastMonthMessages > 0
      ? ((thisMonthMessages - lastMonthMessages) / lastMonthMessages * 100).toFixed(1)
      : '0';

    // Get unique contacts (leads)
    const uniqueContacts = await this.prisma.message.groupBy({
      by: ['remoteJid'],
      where: { companyId },
    });

    return {
      totalMessages,
      todayMessages,
      messageGrowth: `${messageGrowth}%`,
      activeLeads: uniqueContacts.length,
      activeInstances,
      balance: company?.balance || 0,
      apiStatus: 'healthy',
      uptime: '99.9%',
    };
  }

  @Get('activity')
  async getActivity(@Request() req: any) {
    const companyId = req.user.companyId;

    // Get messages per day for the last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const incoming = await this.prisma.message.count({
        where: {
          companyId,
          direction: 'incoming',
          createdAt: { gte: date, lt: nextDate },
        },
      });

      const outgoing = await this.prisma.message.count({
        where: {
          companyId,
          direction: 'outgoing',
          createdAt: { gte: date, lt: nextDate },
        },
      });

      days.push({
        name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        incoming,
        outgoing,
      });
    }

    return days;
  }
}
