import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const GASTOMETRIA_BASE_URL = 'https://gastometria.com.br/api/v1';

export interface GastometriaWallet {
  id: string;
  name: string;
  type: string;
  balance: number;
  icon?: string;
  color?: string;
}

export interface GastometriaTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  item: string;
  date?: string;
  establishment?: string;
}

@Injectable()
export class GastometriaService {
  private readonly logger = new Logger(GastometriaService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Chave de encriptação (derivada de uma secret ou gerada)
    const secret = this.config.get('ENCRYPTION_SECRET') || 'default-secret-key-change-in-prod';
    this.encryptionKey = crypto.scryptSync(secret, 'salt', 32);
  }

  // ========================================
  // ENCRIPTAÇÃO
  // ========================================

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ========================================
  // CONEXÃO
  // ========================================

  /**
   * Conecta conta do Gastometria (faz login e salva tokens)
   */
  async connect(
    companyId: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string; wallets?: GastometriaWallet[] }> {
    try {
      // Fazer login na API do Gastometria
      const loginResponse = await fetch(`${GASTOMETRIA_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json().catch(() => ({}));
        if (loginResponse.status === 401) {
          return { success: false, message: 'Email ou senha incorretos' };
        }
        if (loginResponse.status === 403) {
          return { success: false, message: 'Conta sem plano Infinity ativo' };
        }
        return { success: false, message: error.message || 'Erro ao conectar' };
      }

      const data = await loginResponse.json();

      // Debug: log the response to see the actual format
      this.logger.log(`Gastometria login response: ${JSON.stringify(data)}`);

      // Extract tokens - handle both possible structures
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      const expiresIn = data.tokens?.expiresIn || data.expiresIn || 900;

      this.logger.log(`Extracted tokens: accessToken=${accessToken ? 'present' : 'missing'}, refreshToken=${refreshToken ? 'present' : 'missing'}`);

      if (!accessToken) {
        this.logger.error('No access token in response!');
        return { success: false, message: 'Servidor não retornou token de acesso' };
      }

      // Salvar integração no banco
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      await this.prisma.externalIntegration.upsert({
        where: {
          companyId_provider: { companyId, provider: 'gastometria' },
        },
        create: {
          companyId,
          provider: 'gastometria',
          encryptedEmail: this.encrypt(email),
          encryptedPassword: this.encrypt(password),
          accessToken,
          refreshToken,
          expiresAt,
          isActive: true,
          config: {},
        },
        update: {
          encryptedEmail: this.encrypt(email),
          encryptedPassword: this.encrypt(password),
          accessToken,
          refreshToken,
          expiresAt,
          isActive: true,
        },
      });

      this.logger.log(`Connected Gastometria for company ${companyId}`);

      // Buscar carteiras para o usuário escolher a padrão
      const wallets = await this.getWallets(companyId);

      return {
        success: true,
        message: 'Conta conectada com sucesso!',
        wallets,
      };
    } catch (error) {
      this.logger.error(`Error connecting Gastometria: ${error.message}`);
      return { success: false, message: 'Erro de conexão com Gastometria' };
    }
  }

  /**
   * Desconecta conta do Gastometria
   */
  async disconnect(companyId: string): Promise<{ success: boolean }> {
    await this.prisma.externalIntegration.deleteMany({
      where: { companyId, provider: 'gastometria' },
    });
    return { success: true };
  }

  /**
   * Verifica status da conexão
   */
  async getStatus(companyId: string): Promise<{
    connected: boolean;
    config?: any;
  }> {
    const integration = await this.prisma.externalIntegration.findUnique({
      where: { companyId_provider: { companyId, provider: 'gastometria' } },
    });

    return {
      connected: !!integration && integration.isActive,
      config: integration?.config,
    };
  }

  // ========================================
  // TOKENS
  // ========================================

  /**
   * Obtém token válido (renova se necessário)
   */
  private async getValidToken(companyId: string): Promise<string | null> {
    const integration = await this.prisma.externalIntegration.findUnique({
      where: { companyId_provider: { companyId, provider: 'gastometria' } },
    });

    if (!integration || !integration.isActive) {
      return null;
    }

    // Verificar se token ainda é válido (com margem de 1 minuto)
    const now = new Date();
    const expiresAt = integration.expiresAt ? new Date(integration.expiresAt) : now;

    if (expiresAt.getTime() - now.getTime() > 60000) {
      // Token ainda válido
      return integration.accessToken;
    }

    // Token expirado, tentar refresh
    if (integration.refreshToken) {
      const refreshed = await this.refreshToken(companyId, integration.refreshToken);
      if (refreshed) return refreshed;
    }

    // Refresh falhou, tentar re-login
    if (integration.encryptedEmail && integration.encryptedPassword) {
      const email = this.decrypt(integration.encryptedEmail);
      const password = this.decrypt(integration.encryptedPassword);
      const result = await this.connect(companyId, email, password);
      if (result.success) {
        const updated = await this.prisma.externalIntegration.findUnique({
          where: { companyId_provider: { companyId, provider: 'gastometria' } },
        });
        return updated?.accessToken || null;
      }
    }

    return null;
  }

  /**
   * Renova token usando refresh token
   */
  private async refreshToken(companyId: string, refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch(`${GASTOMETRIA_BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const expiresAt = new Date(Date.now() + (data.expiresIn || 900) * 1000);

      await this.prisma.externalIntegration.update({
        where: { companyId_provider: { companyId, provider: 'gastometria' } },
        data: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || refreshToken,
          expiresAt,
        },
      });

      return data.accessToken;
    } catch (error) {
      this.logger.error(`Error refreshing token: ${error.message}`);
      return null;
    }
  }

  // ========================================
  // CARTEIRAS
  // ========================================

  /**
   * Lista carteiras do usuário
   */
  async getWallets(companyId: string): Promise<GastometriaWallet[]> {
    this.logger.log(`Getting wallets for company ${companyId}`);

    const token = await this.getValidToken(companyId);
    if (!token) {
      this.logger.warn(`No valid token for company ${companyId}`);
      return [];
    }

    try {
      this.logger.log(`Fetching wallets from Gastometria API...`);
      const response = await fetch(`${GASTOMETRIA_BASE_URL}/wallets`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      this.logger.log(`Wallets response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Wallets error response: ${errorText}`);
        return [];
      }

      const wallets = await response.json();
      this.logger.log(`Got ${wallets.length} wallets`);
      return wallets;
    } catch (error) {
      this.logger.error(`Error getting wallets: ${error.message}`);
      return [];
    }
  }

  /**
   * Cria uma nova carteira
   */
  async createWallet(
    companyId: string,
    data: {
      name: string;
      type: string;
      balance?: number;
      icon?: string;
      color?: string;
    },
  ): Promise<{ success: boolean; message: string; wallet?: GastometriaWallet }> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      return { success: false, message: 'Conta Gastometria não conectada' };
    }

    try {
      const response = await fetch(`${GASTOMETRIA_BASE_URL}/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          balance: data.balance || 0,
          icon: data.icon,
          color: data.color,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.message || 'Erro ao criar carteira' };
      }

      const wallet = await response.json();
      return {
        success: true,
        message: `✅ Carteira "${data.name}" criada com sucesso!`,
        wallet,
      };
    } catch (error) {
      this.logger.error(`Error creating wallet: ${error.message}`);
      return { success: false, message: 'Erro ao conectar com Gastometria' };
    }
  }

  /**
   * Configura carteira padrão
   */
  async setDefaultWallet(companyId: string, walletId: string): Promise<boolean> {
    try {
      await this.prisma.externalIntegration.update({
        where: { companyId_provider: { companyId, provider: 'gastometria' } },
        data: {
          config: { defaultWalletId: walletId },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ========================================
  // TRANSAÇÕES
  // ========================================

  /**
   * Cria uma nova transação (gasto ou receita)
   */
  async createTransaction(
    companyId: string,
    data: {
      amount: number;
      type: 'income' | 'expense';
      category: string;
      item: string;
      date?: string;
      establishment?: string;
      walletId?: string;
    },
  ): Promise<{ success: boolean; message: string; transaction?: GastometriaTransaction }> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      return { success: false, message: 'Conta Gastometria não conectada' };
    }

    // Buscar walletId padrão se não informado
    let walletId = data.walletId;
    if (!walletId) {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { companyId_provider: { companyId, provider: 'gastometria' } },
      });
      walletId = (integration?.config as any)?.defaultWalletId;
    }

    if (!walletId) {
      return { success: false, message: 'Nenhuma carteira configurada. Configure uma carteira padrão primeiro.' };
    }

    try {
      const response = await fetch(`${GASTOMETRIA_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: data.amount,
          walletId,
          type: data.type,
          category: data.category,
          item: data.item,
          date: data.date || new Date().toISOString().split('T')[0],
          establishment: data.establishment,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.message || 'Erro ao registrar transação' };
      }

      const result = await response.json();
      return {
        success: true,
        message: `✅ ${data.type === 'expense' ? 'Gasto' : 'Receita'} de R$${data.amount} registrado!`,
        transaction: result.transaction,
      };
    } catch (error) {
      this.logger.error(`Error creating transaction: ${error.message}`);
      return { success: false, message: 'Erro ao conectar com Gastometria' };
    }
  }

  /**
   * Obtém saldo total das carteiras
   */
  async getBalance(companyId: string): Promise<{ success: boolean; balance?: number; wallets?: GastometriaWallet[]; message?: string }> {
    const wallets = await this.getWallets(companyId);

    if (wallets.length === 0) {
      return { success: false, message: 'Conta Gastometria não conectada ou sem carteiras' };
    }

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return {
      success: true,
      balance: totalBalance,
      wallets,
    };
  }

  // ========================================
  // CATEGORIAS
  // ========================================

  /**
   * Lista categorias disponíveis (padrão + customizadas)
   */
  async getCategories(companyId: string): Promise<{
    success: boolean;
    categories?: Record<string, string[]>;
    customCategories?: Record<string, string[]>;
    message?: string;
  }> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      return { success: false, message: 'Conta Gastometria não conectada' };
    }

    try {
      const response = await fetch(`${GASTOMETRIA_BASE_URL}/categories`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        return { success: false, message: 'Erro ao buscar categorias' };
      }

      const data = await response.json();
      return {
        success: true,
        categories: data.categories,
        customCategories: data.customCategories,
      };
    } catch (error) {
      this.logger.error(`Error getting categories: ${error.message}`);
      return { success: false, message: 'Erro ao conectar com Gastometria' };
    }
  }

  /**
   * Cria categoria ou subcategoria customizada
   */
  async createCategory(
    companyId: string,
    category: string,
    subcategory?: string,
  ): Promise<{ success: boolean; message: string }> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      return { success: false, message: 'Conta Gastometria não conectada' };
    }

    try {
      const response = await fetch(`${GASTOMETRIA_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ category, subcategory }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.message || 'Erro ao criar categoria' };
      }

      const result = await response.json();
      const msg = subcategory
        ? `✅ Subcategoria "${subcategory}" criada em "${category}"!`
        : `✅ Categoria "${category}" criada!`;

      return { success: true, message: msg };
    } catch (error) {
      this.logger.error(`Error creating category: ${error.message}`);
      return { success: false, message: 'Erro ao criar categoria' };
    }
  }

  /**
   * Formata categorias para exibição no WhatsApp
   */
  formatCategoriesForDisplay(
    categories: Record<string, string[]>,
    customCategories?: Record<string, string[]>,
  ): string {
    let message = '📂 *Categorias disponíveis:*\n\n';

    // Categorias padrão
    for (const [cat, subs] of Object.entries(categories)) {
      message += `*${cat}*\n`;
      if (subs.length > 0) {
        message += subs.map((s) => `  └ ${s}`).join('\n') + '\n';
      }
      message += '\n';
    }

    // Categorias customizadas
    if (customCategories && Object.keys(customCategories).length > 0) {
      message += '🏷️ *Suas categorias personalizadas:*\n\n';
      for (const [cat, subs] of Object.entries(customCategories)) {
        message += `*${cat}*\n`;
        if (subs.length > 0) {
          message += subs.map((s) => `  └ ${s}`).join('\n') + '\n';
        }
        message += '\n';
      }
    }

    message += '_Para criar nova categoria, diga: "criar categoria [nome]"_';

    return message;
  }
}

