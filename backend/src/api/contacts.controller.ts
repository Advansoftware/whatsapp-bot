import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';

@Controller('api/contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) { }

  /**
   * Get all contacts with pagination and search
   */
  @Get()
  async getContacts(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('q') query?: string,
    @Query('tag') tag?: string,
    @Query('gender') gender?: string,
    @Query('city') city?: string,
    @Query('university') university?: string,
    @Query('minAge') minAge?: string,
    @Query('maxAge') maxAge?: string,
    @Query('status') status?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
  ) {
    const companyId = req.user.companyId;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { companyId };

    if (query) {
      where.OR = [
        { pushName: { contains: query, mode: 'insensitive' } },
        { remoteJid: { contains: query } },
        { notes: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
        { university: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (gender) {
      where.gender = gender;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (university) {
      where.university = { contains: university, mode: 'insensitive' };
    }

    // Age filter based on birthDate
    if (minAge || maxAge) {
      const today = new Date();
      if (maxAge) {
        const minBirthDate = new Date(today.getFullYear() - parseInt(maxAge) - 1, today.getMonth(), today.getDate());
        where.birthDate = { ...where.birthDate, gte: minBirthDate };
      }
      if (minAge) {
        const maxBirthDate = new Date(today.getFullYear() - parseInt(minAge), today.getMonth(), today.getDate());
        where.birthDate = { ...where.birthDate, lte: maxBirthDate };
      }
    }

    if (status) {
      console.log('Filtering contacts by status:', status);
      where.leadStatus = { equals: status, mode: 'insensitive' };
    }

    if (minScore || maxScore) {
      where.leadScore = { ...where.leadScore };
      if (minScore) where.leadScore.gte = parseInt(minScore, 10);
      if (maxScore) where.leadScore.lte = parseInt(maxScore, 10);
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.contact.count({ where }),
    ]);

    // Get last message for each contact
    const contactsWithMessages = await Promise.all(
      contacts.map(async (contact) => {
        const lastMessage = await this.prisma.message.findFirst({
          where: { remoteJid: contact.remoteJid, companyId },
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, direction: true },
        });

        const messageCount = await this.prisma.message.count({
          where: { remoteJid: contact.remoteJid, companyId },
        });

        return {
          ...contact,
          instanceKey: contact.instanceId,
          displayName: contact.pushName || contact.remoteJid.replace('@s.whatsapp.net', ''),
          lastMessage: lastMessage?.content || null,
          lastMessageAt: lastMessage?.createdAt || null,
          messageCount,
        };
      })
    );

    return {
      data: contactsWithMessages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get single contact with full details including memories and AI analysis
   */
  @Get(':id')
  async getContact(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const decodedId = decodeURIComponent(id);

    const contact = await this.prisma.contact.findFirst({
      where: {
        companyId,
        OR: [{ id: decodedId }, { remoteJid: decodedId }],
      },
      include: {
        memories: {
          orderBy: [{ type: 'asc' }, { updatedAt: 'desc' }],
        },
      },
    });

    if (!contact) {
      return { error: 'Contact not found' };
    }

    // Get recent messages
    const messages = await this.prisma.message.findMany({
      where: { remoteJid: contact.remoteJid, companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get conversation stats
    const [messageStats, firstMessage] = await Promise.all([
      this.prisma.message.aggregate({
        where: { remoteJid: contact.remoteJid, companyId },
        _count: { id: true },
      }),
      this.prisma.message.findFirst({
        where: { remoteJid: contact.remoteJid, companyId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    // Agrupa memórias por tipo para exibição
    const memoriesByType: Record<string, any[]> = {
      fact: [],
      preference: [],
      need: [],
      objection: [],
      interest: [],
      context: [],
    };
    for (const mem of contact.memories) {
      if (!memoriesByType[mem.type]) memoriesByType[mem.type] = [];
      memoriesByType[mem.type].push({
        key: mem.key,
        value: mem.value,
        confidence: mem.confidence,
        updatedAt: mem.updatedAt,
      });
    }

    // Formatar número de telefone
    const phoneNumber = contact.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const formattedPhone = phoneNumber.length >= 10
      ? `+${phoneNumber.slice(0, 2)} (${phoneNumber.slice(2, 4)}) ${phoneNumber.slice(4, 9)}-${phoneNumber.slice(9)}`
      : phoneNumber;

    return {
      id: contact.id,
      name: contact.pushName || formattedPhone,
      phone: formattedPhone,
      email: null,
      notes: contact.notes,
      tags: contact.tags || [],
      birthDate: contact.birthDate?.toISOString(),
      gender: contact.gender,
      city: contact.city,
      state: contact.state,
      university: contact.university,
      course: contact.course,
      occupation: contact.occupation,
      leadScore: contact.leadScore,
      leadStatus: contact.leadStatus,
      aiAnalysis: contact.aiAnalysis,
      aiAnalyzedAt: contact.aiAnalyzedAt?.toISOString(),
      totalMessages: messageStats._count.id,
      firstContactAt: firstMessage?.createdAt?.toISOString() || contact.createdAt.toISOString(),
      createdAt: contact.createdAt.toISOString(),
      profilePicUrl: contact.profilePicUrl,
      memoriesByType,
    };
  }

  /**
   * Update contact (add notes, tags, demographics, etc.)
   */
  @Put(':id')
  async updateContact(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: {
      pushName?: string;
      notes?: string;
      tags?: string[];
      cep?: string;
      birthDate?: string;
      gender?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
      university?: string;
      course?: string;
      occupation?: string;
    },
  ) {
    const companyId = req.user.companyId;

    return this.prisma.contact.update({
      where: { id },
      data: {
        pushName: data.pushName,
        notes: data.notes,
        tags: data.tags,
        cep: data.cep,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        gender: data.gender,
        city: data.city,
        state: data.state,
        neighborhood: data.neighborhood,
        university: data.university,
        course: data.course,
        occupation: data.occupation,
      },
    });
  }

  /**
   * Delete contact
   */
  @Delete(':id')
  async deleteContact(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    await this.prisma.contact.deleteMany({
      where: { id, companyId },
    });

    return { success: true };
  }

  /**
   * Qualify lead using AI analysis
   */
  @Post(':id/qualify')
  async qualifyLead(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const contact = await this.prisma.contact.findFirst({
      where: { id, companyId },
    });

    if (!contact) {
      return { error: 'Contact not found' };
    }

    try {
      const result = await this.aiService.analyzeAndQualifyLead(id, companyId);
      return {
        success: true,
        score: result.score,
        status: result.status,
        analysis: result.analysis,
      };
    } catch (error) {
      return { error: error.message || 'Failed to qualify lead' };
    }
  }

  /**
   * Get all unique tags
   */
  @Get('meta/tags')
  async getTags(@Request() req: any) {
    const companyId = req.user.companyId;

    const contacts = await this.prisma.contact.findMany({
      where: { companyId },
      select: { tags: true },
    });

    const allTags = new Set<string>();
    contacts.forEach((c) => {
      (c.tags as string[] || []).forEach((tag) => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  }

  /**
   * Get segmentation options (unique values for filters)
   */
  @Get('meta/segments')
  async getSegmentOptions(@Request() req: any) {
    const companyId = req.user.companyId;

    const contacts = await this.prisma.contact.findMany({
      where: { companyId },
      select: {
        tags: true,
        gender: true,
        city: true,
        state: true,
        university: true,
        course: true,
        occupation: true,
      },
    });

    const segments = {
      tags: new Set<string>(),
      genders: new Set<string>(),
      cities: new Set<string>(),
      states: new Set<string>(),
      universities: new Set<string>(),
      courses: new Set<string>(),
      occupations: new Set<string>(),
    };

    contacts.forEach((c) => {
      (c.tags as string[] || []).forEach((tag) => segments.tags.add(tag));
      if (c.gender) segments.genders.add(c.gender);
      if (c.city) segments.cities.add(c.city);
      if (c.state) segments.states.add(c.state);
      if (c.university) segments.universities.add(c.university);
      if (c.course) segments.courses.add(c.course);
      if (c.occupation) segments.occupations.add(c.occupation);
    });

    return {
      tags: Array.from(segments.tags).sort(),
      genders: Array.from(segments.genders).sort(),
      cities: Array.from(segments.cities).sort(),
      states: Array.from(segments.states).sort(),
      universities: Array.from(segments.universities).sort(),
      courses: Array.from(segments.courses).sort(),
      occupations: Array.from(segments.occupations).sort(),
    };
  }

  /**
   * Get contact stats
   */
  @Get('meta/stats')
  async getStats(@Request() req: any) {
    const companyId = req.user.companyId;

    const [totalContacts, activeContacts, newThisWeek] = await Promise.all([
      this.prisma.contact.count({ where: { companyId } }),
      this.prisma.conversation.count({
        where: { companyId, status: 'active' },
      }),
      this.prisma.contact.count({
        where: {
          companyId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalContacts,
      activeContacts,
      newThisWeek,
    };
  }

  /**
   * Get demographic analytics
   */
  @Get('meta/analytics')
  async getDemographicAnalytics(@Request() req: any) {
    const companyId = req.user.companyId;

    const contacts = await this.prisma.contact.findMany({
      where: { companyId },
      select: {
        birthDate: true,
        gender: true,
        city: true,
        state: true,
        neighborhood: true,
        university: true,
        course: true,
        occupation: true,
        leadStatus: true,
        leadScore: true,
      },
    });

    // Contagem por cidade
    const cityCounts: Record<string, number> = {};
    // Contagem por estado
    const stateCounts: Record<string, number> = {};
    // Contagem por bairro
    const neighborhoodCounts: Record<string, number> = {};
    // Contagem por universidade
    const universityCounts: Record<string, number> = {};
    // Contagem por curso
    const courseCounts: Record<string, number> = {};
    // Contagem por ocupação
    const occupationCounts: Record<string, number> = {};
    // Contagem por gênero
    const genderCounts: Record<string, number> = { male: 0, female: 0, other: 0 };
    // Contagem por faixa etária
    const ageCounts: Record<string, number> = {
      '0-17': 0,
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55+': 0,
    };
    // Contagem por lead status
    const leadStatusCounts: Record<string, number> = {
      cold: 0,
      warm: 0,
      hot: 0,
      qualified: 0,
      unqualified: 0,
    };

    const today = new Date();

    contacts.forEach((contact) => {
      // Cidade
      if (contact.city) {
        cityCounts[contact.city] = (cityCounts[contact.city] || 0) + 1;
      }
      // Estado
      if (contact.state) {
        stateCounts[contact.state] = (stateCounts[contact.state] || 0) + 1;
      }
      // Bairro
      if (contact.neighborhood) {
        neighborhoodCounts[contact.neighborhood] = (neighborhoodCounts[contact.neighborhood] || 0) + 1;
      }
      // Universidade
      if (contact.university) {
        universityCounts[contact.university] = (universityCounts[contact.university] || 0) + 1;
      }
      // Curso
      if (contact.course) {
        courseCounts[contact.course] = (courseCounts[contact.course] || 0) + 1;
      }
      // Ocupação
      if (contact.occupation) {
        occupationCounts[contact.occupation] = (occupationCounts[contact.occupation] || 0) + 1;
      }
      // Gênero
      if (contact.gender && genderCounts[contact.gender] !== undefined) {
        genderCounts[contact.gender]++;
      }
      // Lead Status
      if (contact.leadStatus && leadStatusCounts[contact.leadStatus] !== undefined) {
        leadStatusCounts[contact.leadStatus]++;
      }
      // Idade
      if (contact.birthDate) {
        const birth = new Date(contact.birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }

        if (age < 18) ageCounts['0-17']++;
        else if (age <= 24) ageCounts['18-24']++;
        else if (age <= 34) ageCounts['25-34']++;
        else if (age <= 44) ageCounts['35-44']++;
        else if (age <= 54) ageCounts['45-54']++;
        else ageCounts['55+']++;
      }
    });

    // Converter para arrays ordenados por quantidade
    const sortByCount = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return {
      totalContacts: contacts.length,
      byCity: sortByCount(cityCounts).slice(0, 15), // Top 15
      byState: sortByCount(stateCounts),
      byNeighborhood: sortByCount(neighborhoodCounts).slice(0, 15),
      byUniversity: sortByCount(universityCounts).slice(0, 15),
      byCourse: sortByCount(courseCounts).slice(0, 15),
      byOccupation: sortByCount(occupationCounts).slice(0, 15),
      byGender: sortByCount(genderCounts),
      byAge: Object.entries(ageCounts).map(([range, count]) => ({ range, count })),
      byLeadStatus: sortByCount(leadStatusCounts),
    };
  }
}
