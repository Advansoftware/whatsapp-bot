import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

interface CreateProfileDto {
  remoteJid: string;
  contactName: string;
  contactNickname?: string;
  profilePicUrl?: string;
  description?: string;
  botType?: 'menu' | 'free_text' | 'mixed';
  maxWaitSeconds?: number;
  maxRetries?: number;
  navigationHints?: string;
  fields?: CreateFieldDto[];
  menuOptions?: CreateMenuOptionDto[];
}

interface UpdateProfileDto {
  contactName?: string;
  contactNickname?: string;
  profilePicUrl?: string;
  description?: string;
  botType?: 'menu' | 'free_text' | 'mixed';
  maxWaitSeconds?: number;
  maxRetries?: number;
  navigationHints?: string;
  isActive?: boolean;
  fields?: CreateFieldDto[];
  menuOptions?: CreateMenuOptionDto[];
}

interface CreateFieldDto {
  fieldName: string;
  fieldLabel: string;
  fieldValue: string;
  botPromptPatterns?: string[];
  fieldType?: 'text' | 'number' | 'cpf' | 'phone' | 'date';
  priority?: number;
  isRequired?: boolean;
}

interface UpdateFieldDto {
  fieldLabel?: string;
  fieldValue?: string;
  botPromptPatterns?: string[];
  fieldType?: string;
  priority?: number;
  isRequired?: boolean;
}

interface CreateMenuOptionDto {
  optionValue: string;
  optionLabel: string;
  optionDescription?: string;
  keywords?: string[];
  priority?: number;
  isExitOption?: boolean;
}

interface UpdateMenuOptionDto {
  optionLabel?: string;
  optionDescription?: string;
  keywords?: string[];
  priority?: number;
  isExitOption?: boolean;
}

interface StartSessionParams {
  profileId: string;
  query: string;
  requestedBy: string;
  requestedFrom: string;
}

interface ListSessionsParams {
  status?: string;
  profileId?: string;
}

@Injectable()
export class ContactAutomationService {
  private readonly logger = new Logger(ContactAutomationService.name);
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.evolutionApiUrl = this.config.get('EVOLUTION_API_URL') || 'http://evolution:8080';
    this.evolutionApiKey = this.config.get('EVOLUTION_API_KEY') || '';
  }

  // ========== PROFILES ==========

  async listProfiles(companyId: string) {
    const profiles = await this.prisma.contactAutomationProfile.findMany({
      where: { companyId },
      include: {
        fields: {
          orderBy: { priority: 'asc' },
        },
        menuOptions: {
          orderBy: { priority: 'asc' },
        },
        sessions: {
          where: {
            status: { in: ['pending', 'navigating', 'waiting_response'] },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { contactName: 'asc' },
    });

    return profiles.map((p) => ({
      ...p,
      hasActiveSession: p.sessions.length > 0,
      activeSession: p.sessions[0] || null,
    }));
  }

  async getProfile(companyId: string, id: string) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id, companyId },
      include: {
        fields: {
          orderBy: { priority: 'asc' },
        },
        menuOptions: {
          orderBy: { priority: 'asc' },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    return profile;
  }

  async createProfile(companyId: string, dto: CreateProfileDto) {
    // Verificar se já existe perfil para este contato
    const existing = await this.prisma.contactAutomationProfile.findFirst({
      where: {
        companyId,
        remoteJid: dto.remoteJid,
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe um perfil de automação para este contato');
    }

    // Criar perfil com campos e opções de menu
    const profile = await this.prisma.contactAutomationProfile.create({
      data: {
        companyId,
        remoteJid: dto.remoteJid,
        contactName: dto.contactName,
        contactNickname: dto.contactNickname,
        profilePicUrl: dto.profilePicUrl,
        description: dto.description,
        botType: dto.botType || 'menu',
        maxWaitSeconds: dto.maxWaitSeconds || 120,
        maxRetries: dto.maxRetries || 3,
        navigationHints: dto.navigationHints,
        fields: dto.fields?.length
          ? {
            create: dto.fields.map((f, index) => ({
              fieldName: f.fieldName,
              fieldLabel: f.fieldLabel,
              fieldValue: f.fieldValue,
              botPromptPatterns: f.botPromptPatterns || [],
              fieldType: f.fieldType || 'text',
              priority: f.priority ?? index,
              isRequired: f.isRequired ?? true,
            })),
          }
          : undefined,
        menuOptions: dto.menuOptions?.length
          ? {
            create: dto.menuOptions.map((m, index) => ({
              optionValue: m.optionValue,
              optionLabel: m.optionLabel,
              optionDescription: m.optionDescription,
              keywords: m.keywords || [],
              priority: m.priority ?? index,
              isExitOption: m.isExitOption ?? false,
            })),
          }
          : undefined,
      },
      include: {
        fields: true,
        menuOptions: true,
      },
    });

    this.logger.log(`Created automation profile for ${dto.contactName} (${dto.remoteJid})`);
    return profile;
  }

  async updateProfile(companyId: string, id: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    // Extrai fields e menuOptions do DTO
    const { fields, menuOptions, ...profileData } = dto;

    // Se fields foi fornecido, deleta os antigos e cria os novos
    if (fields !== undefined) {
      await this.prisma.contactAutomationField.deleteMany({
        where: { profileId: id },
      });

      if (fields.length > 0) {
        await this.prisma.contactAutomationField.createMany({
          data: fields.map((f, index) => ({
            profileId: id,
            fieldName: f.fieldName,
            fieldLabel: f.fieldLabel,
            fieldValue: f.fieldValue,
            botPromptPatterns: f.botPromptPatterns || [],
            fieldType: f.fieldType || 'text',
            priority: f.priority ?? index,
            isRequired: f.isRequired ?? true,
          })),
        });
      }
    }

    // Se menuOptions foi fornecido, deleta os antigos e cria os novos
    if (menuOptions !== undefined) {
      await this.prisma.contactAutomationMenuOption.deleteMany({
        where: { profileId: id },
      });

      if (menuOptions.length > 0) {
        await this.prisma.contactAutomationMenuOption.createMany({
          data: menuOptions.map((m, index) => ({
            profileId: id,
            optionValue: m.optionValue,
            optionLabel: m.optionLabel,
            optionDescription: m.optionDescription,
            keywords: m.keywords || [],
            priority: m.priority ?? index,
            isExitOption: m.isExitOption ?? false,
          })),
        });
      }
    }

    return this.prisma.contactAutomationProfile.update({
      where: { id },
      data: profileData,
      include: {
        fields: true,
        menuOptions: true,
      },
    });
  }

  async deleteProfile(companyId: string, id: string) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    await this.prisma.contactAutomationProfile.delete({
      where: { id },
    });

    return { success: true, message: 'Perfil excluído com sucesso' };
  }

  async toggleProfile(companyId: string, id: string) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    return this.prisma.contactAutomationProfile.update({
      where: { id },
      data: { isActive: !profile.isActive },
    });
  }

  // ========== FIELDS ==========

  async addField(companyId: string, profileId: string, dto: CreateFieldDto) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id: profileId, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    // Verificar se campo já existe
    const existing = await this.prisma.contactAutomationField.findFirst({
      where: {
        profileId,
        fieldName: dto.fieldName,
      },
    });

    if (existing) {
      throw new BadRequestException(`Campo "${dto.fieldName}" já existe neste perfil`);
    }

    return this.prisma.contactAutomationField.create({
      data: {
        profileId,
        fieldName: dto.fieldName,
        fieldLabel: dto.fieldLabel,
        fieldValue: dto.fieldValue,
        botPromptPatterns: dto.botPromptPatterns || [],
        fieldType: dto.fieldType || 'text',
        priority: dto.priority || 0,
        isRequired: dto.isRequired ?? true,
      },
    });
  }

  async updateField(companyId: string, profileId: string, fieldId: string, dto: UpdateFieldDto) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id: profileId, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    const field = await this.prisma.contactAutomationField.findFirst({
      where: { id: fieldId, profileId },
    });

    if (!field) {
      throw new NotFoundException('Campo não encontrado');
    }

    return this.prisma.contactAutomationField.update({
      where: { id: fieldId },
      data: dto,
    });
  }

  async removeField(companyId: string, profileId: string, fieldId: string) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id: profileId, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    await this.prisma.contactAutomationField.delete({
      where: { id: fieldId },
    });

    return { success: true, message: 'Campo removido com sucesso' };
  }

  // ========== MENU OPTIONS ==========

  async addMenuOption(companyId: string, profileId: string, dto: CreateMenuOptionDto) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id: profileId, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    const existing = await this.prisma.contactAutomationMenuOption.findFirst({
      where: {
        profileId,
        optionValue: dto.optionValue,
      },
    });

    if (existing) {
      throw new BadRequestException(`Opção "${dto.optionValue}" já existe neste perfil`);
    }

    return this.prisma.contactAutomationMenuOption.create({
      data: {
        profileId,
        optionValue: dto.optionValue,
        optionLabel: dto.optionLabel,
        optionDescription: dto.optionDescription,
        keywords: dto.keywords || [],
        priority: dto.priority || 0,
        isExitOption: dto.isExitOption ?? false,
      },
    });
  }

  async updateMenuOption(companyId: string, profileId: string, optionId: string, dto: UpdateMenuOptionDto) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id: profileId, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    const option = await this.prisma.contactAutomationMenuOption.findFirst({
      where: { id: optionId, profileId },
    });

    if (!option) {
      throw new NotFoundException('Opção de menu não encontrada');
    }

    return this.prisma.contactAutomationMenuOption.update({
      where: { id: optionId },
      data: dto,
    });
  }

  async removeMenuOption(companyId: string, profileId: string, optionId: string) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id: profileId, companyId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    await this.prisma.contactAutomationMenuOption.delete({
      where: { id: optionId },
    });

    return { success: true, message: 'Opção removida com sucesso' };
  }

  // ========== SESSIONS ==========

  async listSessions(companyId: string, params: ListSessionsParams) {
    const where: any = { companyId };

    if (params.status) {
      where.status = params.status;
    }

    if (params.profileId) {
      where.profileId = params.profileId;
    }

    return this.prisma.contactAutomationSession.findMany({
      where,
      include: {
        profile: {
          select: {
            contactName: true,
            remoteJid: true,
            profilePicUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getSession(companyId: string, id: string) {
    const session = await this.prisma.contactAutomationSession.findFirst({
      where: { id, companyId },
      include: {
        profile: {
          include: {
            fields: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    return session;
  }

  async startSession(companyId: string, params: StartSessionParams) {
    const profile = await this.prisma.contactAutomationProfile.findFirst({
      where: { id: params.profileId, companyId },
      include: { fields: true },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de automação não encontrado');
    }

    if (!profile.isActive) {
      throw new BadRequestException('Este perfil de automação está desativado');
    }

    // Verificar se já existe sessão ativa para este perfil
    const activeSession = await this.prisma.contactAutomationSession.findFirst({
      where: {
        profileId: params.profileId,
        status: { in: ['pending', 'navigating', 'waiting_response'] },
      },
    });

    if (activeSession) {
      throw new BadRequestException('Já existe uma sessão ativa para este perfil');
    }

    // Criar sessão
    const session = await this.prisma.contactAutomationSession.create({
      data: {
        profileId: params.profileId,
        companyId,
        requestedBy: params.requestedBy,
        requestedFrom: params.requestedFrom,
        originalQuery: params.query,
        objective: params.query, // Será refinado pela IA depois
        status: 'pending',
        expiresAt: new Date(Date.now() + profile.maxWaitSeconds * 1000 * 10), // 10x o timeout
      },
      include: {
        profile: true,
      },
    });

    this.logger.log(`Started automation session ${session.id} for ${profile.contactName}`);

    // O processamento real será feito pelo ContactAutomationProcessorService
    // que vai enviar a primeira mensagem e monitorar as respostas

    return session;
  }

  async cancelSession(companyId: string, id: string) {
    const session = await this.prisma.contactAutomationSession.findFirst({
      where: { id, companyId },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    if (session.status === 'completed' || session.status === 'failed') {
      throw new BadRequestException('Sessão já foi finalizada');
    }

    return this.prisma.contactAutomationSession.update({
      where: { id },
      data: {
        status: 'failed',
        result: 'Cancelado pelo usuário',
        completedAt: new Date(),
      },
    });
  }

  // ========== AVAILABLE CONTACTS ==========

  async getAvailableContacts(companyId: string) {
    // Buscar contatos que já têm perfil
    const existingProfiles = await this.prisma.contactAutomationProfile.findMany({
      where: { companyId },
      select: { remoteJid: true },
    });

    const existingJids = new Set(existingProfiles.map((p) => p.remoteJid));

    // Buscar TODOS os contatos que não são grupos, ordenados por nome
    const contacts = await this.prisma.contact.findMany({
      where: {
        companyId,
        isGroup: false,
      },
      select: {
        remoteJid: true,
        pushName: true,
        profilePicUrl: true,
      },
      orderBy: { pushName: 'asc' },
    });

    // Filtrar os que já têm perfil
    return contacts
      .filter((c) => !existingJids.has(c.remoteJid))
      .map((c) => ({
        remoteJid: c.remoteJid,
        name: c.pushName || c.remoteJid.replace('@s.whatsapp.net', ''),
        profilePicUrl: c.profilePicUrl,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ========== HELPER METHODS ==========

  /**
   * Busca perfil de automação por nome ou apelido (para IA usar)
   */
  async findProfileByNameOrNickname(companyId: string, searchTerm: string) {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    const profiles = await this.prisma.contactAutomationProfile.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        fields: true,
      },
    });

    // Buscar match exato ou parcial
    return profiles.find((p) => {
      const name = p.contactName.toLowerCase();
      const nickname = p.contactNickname?.toLowerCase() || '';

      return (
        name === normalizedSearch ||
        nickname === normalizedSearch ||
        name.includes(normalizedSearch) ||
        nickname.includes(normalizedSearch) ||
        normalizedSearch.includes(name) ||
        normalizedSearch.includes(nickname)
      );
    });
  }

  /**
   * Busca sessão ativa para um remoteJid (quando recebe resposta do bot)
   */
  async findActiveSessionForContact(companyId: string, remoteJid: string) {
    return this.prisma.contactAutomationSession.findFirst({
      where: {
        companyId,
        profile: {
          remoteJid,
        },
        status: { in: ['pending', 'navigating', 'waiting_response'] },
      },
      include: {
        profile: {
          include: {
            fields: true,
            menuOptions: true,
          },
        },
      },
    });
  }

  /**
   * Atualiza sessão com resposta do bot
   */
  async updateSessionWithBotResponse(sessionId: string, botMessage: string) {
    const session = await this.prisma.contactAutomationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;

    const navigationLog = (session.navigationLog as any[]) || [];
    navigationLog.push({
      type: 'bot',
      message: botMessage,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.contactAutomationSession.update({
      where: { id: sessionId },
      data: {
        lastBotMessage: botMessage,
        lastActivityAt: new Date(),
        messagesReceived: session.messagesReceived + 1,
        navigationLog,
        status: 'waiting_response',
      },
    });
  }

  /**
   * Registra resposta que enviamos ao bot
   */
  async updateSessionWithOurResponse(sessionId: string, ourResponse: string) {
    const session = await this.prisma.contactAutomationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;

    const navigationLog = (session.navigationLog as any[]) || [];
    navigationLog.push({
      type: 'us',
      message: ourResponse,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.contactAutomationSession.update({
      where: { id: sessionId },
      data: {
        lastOurResponse: ourResponse,
        lastActivityAt: new Date(),
        messagesSent: session.messagesSent + 1,
        navigationLog,
        status: 'navigating',
      },
    });
  }

  /**
   * Finaliza sessão com sucesso
   */
  async completeSession(sessionId: string, result: string, summary: string) {
    return this.prisma.contactAutomationSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        result,
        resultSummary: summary,
        success: true,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Finaliza sessão com falha
   */
  async failSession(sessionId: string, reason: string) {
    return this.prisma.contactAutomationSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        result: reason,
        success: false,
        completedAt: new Date(),
      },
    });
  }
}
