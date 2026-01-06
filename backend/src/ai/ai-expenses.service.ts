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
      // 1. Buscar categorias
      const categoriesResult = await this.gastometriaService.getCategories(companyId);
      let categoryList = 'Alimentação, Transporte, Lazer, Saúde, Moradia, Educação, Outros';

      if (categoriesResult.success && categoriesResult.categories) {
        const allCategories = Object.keys(categoriesResult.categories);
        if (categoriesResult.customCategories) {
          allCategories.push(...Object.keys(categoriesResult.customCategories));
        }
        categoryList = allCategories.join(', ');
      }

      // 2. Buscar carteiras existentes (para contexto)
      const wallets = await this.gastometriaService.getWallets(companyId);
      const walletsList = wallets.map(w => w.name).join(', ');

      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const prompt = `Extraia as informações de uma transação financeira desta mensagem:

MENSAGEM: "${message}"

CONTEXTO:
- Categorias existentes: ${categoryList}
- Carteiras existentes: ${walletsList || 'Nenhuma (usar padrão)'}

Responda APENAS em JSON válido:
{
  "understood": true/false,
  "type": "expense" | "income",
  "amount": 0.00,
  "category": "escolha uma das existentes ou 'Outros'",
  "item": "descrição curta do gasto",
  "establishment": "nome do estabelecimento se mencionado, ou null",
  "walletName": "nome da carteira mencionada (ex: Nubank, Cofre) ou null se não mencionar",
  "suggestedWalletType": "Conta Corrente" | "Cartão de Crédito" | "Poupança" | "Dinheiro" | "Outros" (apenas se walletName != null)
}

REGRAS:
- "gastei", "paguei", "comprei" = expense
- "recebi", "ganhei" = income
- Se mencionar uma carteira específica (ex: "no nubank", "na conta itau", "no cartão"), extraia o nome em 'walletName'.
- Se a carteira mencionada NÃO existir na lista de "Carteiras existentes", sugira um tipo em 'suggestedWalletType' baseado no contexto (ex: "cartão" -> "Cartão de Crédito").
- Se não mencionar carteira, walletName = null.

Exemplos:
- "Gastei 50 no mercado no nubank" -> walletName: "Nubank", suggestedWalletType: "Conta Corrente"
- "Paguei 100 no cartão de crédito santander" -> walletName: "Santander", suggestedWalletType: "Cartão de Crédito"`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extrair JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, response: 'Não entendi. Tente: "Gastei 50 no mercado"' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.understood || !parsed.amount || parsed.amount <= 0) {
        return { success: false, response: 'Não consegui identificar o valor. Tente novamente.' };
      }

      // 3. Resolver Carteira (Wallet)
      let walletId: string | undefined = undefined;
      let walletMessage = '';

      if (parsed.walletName) {
        // Tentar encontrar carteira existente (case insensitive)
        const targetName = parsed.walletName.toLowerCase();
        const existingWallet = wallets.find(w => w.name.toLowerCase().includes(targetName) || targetName.includes(w.name.toLowerCase()));

        if (existingWallet) {
          walletId = existingWallet.id;
          walletMessage = ` (Carteira: ${existingWallet.name})`;
        } else {
          // Carteira não existe, criar nova!
          const newWalletName = parsed.walletName;
          const newWalletType = parsed.suggestedWalletType || 'Outros';

          this.logger.log(`Creating new wallet '${newWalletName}' of type '${newWalletType}'...`);

          const createWalletResult = await this.gastometriaService.createWallet(companyId, {
            name: newWalletName,
            type: newWalletType,
            icon: newWalletType.includes('Cartão') ? '💳' : '💰' // Ícone simples baseado no tipo
          });

          if (createWalletResult.success && createWalletResult.wallet) {
            walletId = createWalletResult.wallet.id;
            walletMessage = ` (Nova carteira criada: ${createWalletResult.wallet.name})`;
          } else {
            // Fallback: se falhar ao criar, usa a padrão (undefined) e avisa
            walletMessage = ` (Não foi possível criar a carteira '${newWalletName}', usando padrão)`;
          }
        }
      }

      // 4. Criar transação no Gastometria
      const transactionResult = await this.gastometriaService.createTransaction(companyId, {
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        item: parsed.item,
        establishment: parsed.establishment,
        walletId: walletId, // Se undefined, o service usa a default
      });

      if (!transactionResult.success) {
        return { success: false, response: transactionResult.message };
      }

      const emoji = parsed.type === 'expense' ? '💸' : '💵';
      const typeLabel = parsed.type === 'expense' ? 'Gasto' : 'Receita';

      return {
        success: true,
        response: `${emoji} *${typeLabel} registrado!*${walletMessage}\n\n• Valor: R$ ${parsed.amount.toFixed(2)}\n• Categoria: ${parsed.category}\n• Item: ${parsed.item}${parsed.establishment ? `\n• Local: ${parsed.establishment}` : ''}`,
      };
    } catch (error) {
      this.logger.error(`Error processing expense command: ${error.message}`);
      return { success: false, response: 'Erro ao processar comando de gasto. Tente novamente.' };
    }
  }

  /**
   * Processa imagem de recibo/nota fiscal
   */
  async processExpenseImage(
    companyId: string,
    instanceKey: string,
    mediaData: any,
    caption: string,
  ): Promise<{
    success: boolean;
    response: string;
    transactionData?: any;
    needsWalletConfirmation?: boolean;
    wallets?: any[];
  }> {
    try {
      // 1. Baixar imagem da Evolution API primeiro
      const evolutionApiUrl = this.config.get('EVOLUTION_API_URL') || 'http://evolution:8080';
      const evolutionApiKey = this.config.get('EVOLUTION_API_KEY');

      // Preparar payload para Evolution API - formato: { message: WebMessageInfo }
      // A Evolution API espera a mensagem completa com key e message dentro
      const payload: any = {
        message: {
          key: mediaData.key,
          message: mediaData.message,
        },
        convertToMp4: false,
      };

      this.logger.log(`📷 Downloading expense image from Evolution API...`);
      this.logger.log(`📷 Payload: key=${JSON.stringify(mediaData.key?.id)}, messageType=${mediaData.messageType || 'unknown'}`);

      const response = await fetch(`${evolutionApiUrl}/chat/getBase64FromMediaMessage/${instanceKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const mediaResult = await response.json();
      const base64Image = mediaResult.base64;
      const mimetype = mediaResult.mimetype || 'image/jpeg';

      if (!base64Image) {
        throw new Error('No base64 image data in response');
      }

      this.logger.log(`✅ Expense image downloaded successfully, size: ${base64Image.length} chars`);

      // 2. Contexto (Categorias e Carteiras)
      const categoriesResult = await this.gastometriaService.getCategories(companyId);
      const wallets = await this.gastometriaService.getWallets(companyId);

      let categoryList = 'Alimentação, Transporte, Lazer, Saúde, Moradia, Educação, Outros';
      if (categoriesResult.success && categoriesResult.categories) {
        const all = Object.keys(categoriesResult.categories);
        if (categoriesResult.customCategories) all.push(...Object.keys(categoriesResult.customCategories));
        categoryList = all.join(', ');
      }

      const walletsList = wallets.map(w => w.name).join(', ');

      // 3. Preparar imagem para o Gemini
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimetype,
        },
      };

      const prompt = `Analise esta imagem de recibo/nota fiscal e a legenda: "${caption}".
      
CONTEXTO:
- Categorias: ${categoryList}
- Carteiras existentes: ${walletsList || 'Nenhuma'}

Extraia os dados em JSON:
{
  "understood": true/false,
  "isReceipt": true/false (se é um comprovante de pagamento/gasto),
  "amount": 0.00,
  "date": "YYYY-MM-DD" (se visível, ou hoje),
  "category": "escolha a melhor",
  "item": "nome do estabelecimento ou descrição resumida",
  "establishment": "nome da loja/empresa",
  "walletName": "nome da carteira SE mencionada na legenda (ex: 'no nubank'), senão null"
}

Se a legenda pedir explicitamente uma carteira ("no itau"), preencha walletName. Se não, deixe null para perguntarmos ao usuário.`;

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return { success: false, response: 'Não consegui ler os dados da imagem.' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.isReceipt && !caption.toLowerCase().includes('gasto')) {
        return { success: false, response: 'Isso não parece ser um recibo ou nota fiscal.' };
      }

      const transactionData = {
        amount: parsed.amount,
        type: 'expense',
        category: parsed.category || 'Outros',
        item: parsed.item || 'Despesa',
        establishment: parsed.establishment,
        date: parsed.date
      };

      // 3. Se carteira já foi identificada na legenda
      if (parsed.walletName) {
        // Aproveita lógica de criar/buscar carteira do handleTransactionCommand
        // Por simplificação, chamamos resolvePendingExpense simulando a escolha
        return this.resolvePendingExpense(companyId, parsed.walletName, transactionData);
      }

      // 4. Se não tem carteira, PEDIR CONFIRMAÇÃO
      let walletOptions = '';
      if (wallets.length > 0) {
        walletOptions = '\n\nEscolha a carteira:\n' + wallets.map((w, i) => `${i + 1}. ${w.name}`).join('\n');
      } else {
        walletOptions = '\n\nDigita o nome da carteira (ex: Nubank) que eu crio agora.';
      }

      return {
        success: true,
        response: `🧾 Li o recibo de *R$ ${parsed.amount}* em ${parsed.establishment || parsed.item}.${walletOptions}\n\n_Responda com o nome ou número da carteira._`,
        needsWalletConfirmation: true,
        transactionData,
        wallets
      };

    } catch (error) {
      this.logger.error(`Error processing expense image: ${error.message}`);
      return { success: false, response: 'Erro ao processar imagem.' };
    }
  }

  /**
   * Resolve despesa pendente
   */
  async resolvePendingExpense(
    companyId: string,
    walletSelection: string,
    pendingData: any,
  ): Promise<{ success: boolean; response: string }> {
    try {
      const wallets = await this.gastometriaService.getWallets(companyId);
      let walletId: string | undefined;
      let walletName = '';

      // Tentar por índice (se usuário digitou "1", "2")
      const index = parseInt(walletSelection);
      if (!isNaN(index) && index > 0 && index <= wallets.length) {
        walletId = wallets[index - 1].id;
        walletName = wallets[index - 1].name;
      } else {
        // Tentar por nome (fuzzy match ou create)
        const targetName = walletSelection.toLowerCase();
        const existing = wallets.find(w => w.name.toLowerCase().includes(targetName) || targetName.includes(w.name.toLowerCase()));

        if (existing) {
          walletId = existing.id;
          walletName = existing.name;
        } else {
          // Criar nova
          const newName = walletSelection; // Usa o texto original
          const successCreate = await this.gastometriaService.createWallet(companyId, {
            name: newName,
            type: 'Outros',
            icon: '💰'
          });
          if (successCreate.success && successCreate.wallet) {
            walletId = successCreate.wallet.id;
            walletName = successCreate.wallet.name;
          }
        }
      }

      if (!walletId) {
        // Fallback para default se falhar (ou erro, mas vamos tentar salvar)
        // Mas aqui o ideal é garantir a wallet. Se falhar a criação, avisa.
        if (!walletName) return { success: false, response: 'Não encontrei nem consegui criar essa carteira. Tente novamente.' };
      }

      const result = await this.gastometriaService.createTransaction(companyId, {
        ...pendingData,
        walletId
      });

      if (!result.success) return { success: false, response: result.message };

      return {
        success: true,
        response: `✅ *Despesa Salva!*\n\nValor: R$ ${pendingData.amount}\nLocal: ${pendingData.establishment || pendingData.item}\nCarteira: ${walletName}`
      };

    } catch (error) {
      this.logger.error(`Pending expense error: ${error.message}`);
      return { success: false, response: 'Erro ao finalizar despesa.' };
    }
  }
}
