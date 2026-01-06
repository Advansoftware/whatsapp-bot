import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GastometriaService } from '../integrations/gastometria.service';

/**
 * Serviço para processar comandos de gastos via chat
 */
@Injectable()
export class AIExpensesService {
  private readonly logger = new Logger(AIExpensesService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly gastometriaService: GastometriaService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Verifica se a mensagem é um comando de gasto/receita
   */
  isExpenseCommand(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    const expenseKeywords = [
      'gastei',
      'paguei',
      'comprei',
      'gasto',
      'despesa',
      'recebi',
      'ganhei',
      'receita',
      'entrada',
      'quanto tenho',
      'meu saldo',
      'saldo atual',
      'minhas carteiras',
      'listar carteiras',
      'minhas categorias',
      'listar categorias',
      'criar categoria',
      'nova categoria',
    ];

    return expenseKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  /**
   * Processa comando de gasto/receita
   */
  async processExpenseCommand(
    message: string,
    companyId: string,
  ): Promise<{ success: boolean; response: string }> {
    const lowerMessage = message.toLowerCase();

    // Verificar se Gastometria está conectado
    const status = await this.gastometriaService.getStatus(companyId);
    if (!status.connected) {
      return {
        success: false,
        response: '❌ Gastometria não está conectado. Acesse Integrações no painel para conectar sua conta.',
      };
    }

    // Consultar saldo
    if (
      lowerMessage.includes('quanto tenho') ||
      lowerMessage.includes('meu saldo') ||
      lowerMessage.includes('saldo atual')
    ) {
      return this.handleBalanceQuery(companyId);
    }

    // Listar carteiras
    if (lowerMessage.includes('minhas carteiras') || lowerMessage.includes('listar carteiras')) {
      return this.handleWalletsQuery(companyId);
    }

    // Listar categorias
    if (lowerMessage.includes('minhas categorias') || lowerMessage.includes('listar categorias')) {
      return this.handleCategoriesQuery(companyId);
    }

    // Criar categoria
    if (lowerMessage.includes('criar categoria') || lowerMessage.includes('nova categoria')) {
      return this.handleCreateCategory(message, companyId);
    }

    // Registrar transação
    return this.handleTransactionCommand(message, companyId);
  }

  /**
   * Consulta saldo
   */
  private async handleBalanceQuery(companyId: string): Promise<{ success: boolean; response: string }> {
    const result = await this.gastometriaService.getBalance(companyId);

    if (!result.success) {
      return { success: false, response: result.message || 'Erro ao consultar saldo' };
    }

    const walletsList = result.wallets?.map((w) => `• ${w.icon || '💳'} ${w.name}: R$ ${w.balance.toFixed(2)}`).join('\n') || '';

    return {
      success: true,
      response: `💰 *Seu saldo total:* R$ ${result.balance?.toFixed(2)}\n\n${walletsList}`,
    };
  }

  /**
   * Lista carteiras
   */
  private async handleWalletsQuery(companyId: string): Promise<{ success: boolean; response: string }> {
    const wallets = await this.gastometriaService.getWallets(companyId);

    if (wallets.length === 0) {
      return { success: false, response: 'Nenhuma carteira encontrada.' };
    }

    const walletsList = wallets
      .map((w) => `• ${w.icon || '💳'} *${w.name}* (${w.type}): R$ ${w.balance.toFixed(2)}`)
      .join('\n');

    return {
      success: true,
      response: `📋 *Suas carteiras:*\n\n${walletsList}`,
    };
  }

  /**
   * Lista categorias
   */
  private async handleCategoriesQuery(companyId: string): Promise<{ success: boolean; response: string }> {
    const result = await this.gastometriaService.getCategories(companyId);

    if (!result.success || !result.categories) {
      return { success: false, response: result.message || 'Erro ao listar categorias' };
    }

    const formattedMessage = this.gastometriaService.formatCategoriesForDisplay(
      result.categories,
      result.customCategories,
    );

    return { success: true, response: formattedMessage };
  }

  /**
   * Criar categoria customizada
   */
  private async handleCreateCategory(
    message: string,
    companyId: string,
  ): Promise<{ success: boolean; response: string }> {
    // Extrair nome da categoria da mensagem
    // Ex: "criar categoria Pet" ou "nova categoria Gaming/Steam"
    const match = message.match(/(?:criar|nova)\s+categoria\s+(.+)/i);

    if (!match) {
      return {
        success: false,
        response: 'Para criar uma categoria, diga: "criar categoria [nome]" ou "criar categoria [categoria]/[subcategoria]"',
      };
    }

    const input = match[1].trim();
    let category: string;
    let subcategory: string | undefined;

    // Verificar se tem subcategoria (formato: Categoria/Subcategoria)
    if (input.includes('/')) {
      const parts = input.split('/');
      category = parts[0].trim();
      subcategory = parts[1].trim();
    } else {
      category = input;
    }

    const result = await this.gastometriaService.createCategory(companyId, category, subcategory);
    return { success: result.success, response: result.message };
  }

  /**
   * Processa comando de transação usando IA
   */
  private async handleTransactionCommand(
    message: string,
    companyId: string,
  ): Promise<{ success: boolean; response: string }> {
    try {
      // Buscar categorias reais do usuário
      const categoriesResult = await this.gastometriaService.getCategories(companyId);
      let categoryList = 'Alimentação, Transporte, Lazer, Saúde, Moradia, Educação, Outros';

      if (categoriesResult.success && categoriesResult.categories) {
        const allCategories = Object.keys(categoriesResult.categories);
        if (categoriesResult.customCategories) {
          allCategories.push(...Object.keys(categoriesResult.customCategories));
        }
        categoryList = allCategories.join(', ');
      }

      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const prompt = `Extraia as informações de uma transação financeira desta mensagem:

MENSAGEM: "${message}"

CATEGORIAS DISPONÍVEIS: ${categoryList}

Responda APENAS em JSON válido:
{
  "understood": true/false,
  "type": "expense" | "income",
  "amount": 0.00,
  "category": "escolha uma das categorias disponíveis acima",
  "item": "descrição curta do gasto",
  "establishment": "nome do estabelecimento se mencionado, ou null"
}

REGRAS:
- "gastei", "paguei", "comprei" = expense
- "recebi", "ganhei" = income
- Extraia o valor numérico (ex: "50 reais" = 50, "R$150" = 150)
- Use APENAS categorias da lista disponível acima
- Se não encontrar categoria adequada, use "Outros"
- Se não entender, retorne understood: false

Exemplos:
- "Gastei 50 no mercado" → expense, 50, Alimentação, "compras mercado", "mercado"
- "Paguei R$150 de luz" → expense, 150, Moradia, "conta de luz"
- "Recebi 1000 do cliente" → income, 1000, Outros, "pagamento cliente"`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extrair JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, response: 'Não entendi o valor ou tipo de gasto. Tente algo como: "Gastei R$50 no mercado"' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.understood || !parsed.amount || parsed.amount <= 0) {
        return { success: false, response: 'Não consegui identificar o valor. Tente: "Gastei R$50 no mercado"' };
      }

      // Criar transação no Gastometria
      const transactionResult = await this.gastometriaService.createTransaction(companyId, {
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        item: parsed.item,
        establishment: parsed.establishment,
      });

      if (!transactionResult.success) {
        return { success: false, response: transactionResult.message };
      }

      const emoji = parsed.type === 'expense' ? '💸' : '💵';
      const typeLabel = parsed.type === 'expense' ? 'Gasto' : 'Receita';

      return {
        success: true,
        response: `${emoji} *${typeLabel} registrado!*\n\n• Valor: R$ ${parsed.amount.toFixed(2)}\n• Categoria: ${parsed.category}\n• Item: ${parsed.item}${parsed.establishment ? `\n• Local: ${parsed.establishment}` : ''}`,
      };
    } catch (error) {
      this.logger.error(`Error processing expense command: ${error.message}`);
      return { success: false, response: 'Erro ao processar comando de gasto. Tente novamente.' };
    }
  }
}

