import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GastometriaService, GastometriaWallet } from '../integrations/gastometria.service';

/**
 * Estados do fluxo de despesas
 */
export type ExpenseFlowStep =
  | 'idle'                          // Sem fluxo ativo
  | 'awaiting_wallet'               // Aguardando seleção de carteira
  | 'awaiting_wallet_type'          // Aguardando tipo da nova carteira
  | 'awaiting_items_confirmation'   // Aguardando confirmação dos itens extraídos
  | 'awaiting_final_confirmation';  // Aguardando confirmação final

/**
 * Tipos de carteira disponíveis
 */
export const WALLET_TYPES = [
  { id: 'checking', name: 'Conta Corrente', icon: '🏦' },
  { id: 'credit', name: 'Cartão de Crédito', icon: '💳' },
  { id: 'savings', name: 'Poupança', icon: '🐷' },
  { id: 'cash', name: 'Dinheiro', icon: '💵' },
  { id: 'investment', name: 'Investimentos', icon: '📈' },
  { id: 'other', name: 'Outros', icon: '💰' },
];

/**
 * Dados do fluxo de despesas (armazenados no banco)
 */
interface ExpenseFlowData {
  // Imagem original (se houver)
  hasImage?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  caption?: string;

  // Dados extraídos
  items?: ExtractedItem[];
  totalAmount?: number;
  establishment?: string;
  date?: string;
  category?: string;

  // Seleções do usuário
  selectedWalletId?: string;
  selectedWalletName?: string;
  newWalletName?: string;
  newWalletType?: string;

  // Confirmação de itens
  confirmedItems?: ExtractedItem[];
}

/**
 * Item extraído de uma nota fiscal
 */
interface ExtractedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

/**
 * Resultado do processamento do fluxo
 */
interface FlowResult {
  success: boolean;
  response: string;
  flowEnded?: boolean;  // Se o fluxo terminou (sucesso ou cancelamento)
}

/**
 * Serviço para gerenciar fluxo de despesas com estado conversacional
 * 
 * O fluxo completo:
 * 1. Receber imagem de nota fiscal
 * 2. Extrair itens individualmente (usando IA)
 * 3. Mostrar carteiras existentes ou opção de criar nova
 * 4. Se criar nova, perguntar tipo da carteira
 * 5. Confirmar itens, valores e carteira
 * 6. Salvar transações
 */
@Injectable()
export class AIExpensesFlowService {
  private readonly logger = new Logger(AIExpensesFlowService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  // Timeout do fluxo (15 minutos)
  private readonly FLOW_TIMEOUT_MINUTES = 15;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly gastometriaService: GastometriaService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  // =========================================
  // GERENCIAMENTO DE ESTADO DO FLUXO
  // =========================================

  /**
   * Obtém o estado atual do fluxo para um contato
   */
  private async getFlowState(companyId: string, remoteJid: string) {
    const state = await this.prisma.expenseFlowState.findUnique({
      where: { companyId_remoteJid: { companyId, remoteJid } },
    });

    // Verificar se expirou
    if (state && new Date(state.expiresAt) < new Date()) {
      await this.clearFlowState(companyId, remoteJid);
      return null;
    }

    return state;
  }

  /**
   * Atualiza o estado do fluxo
   */
  private async setFlowState(
    companyId: string,
    remoteJid: string,
    step: ExpenseFlowStep,
    flowData: ExpenseFlowData,
  ) {
    const expiresAt = new Date(Date.now() + this.FLOW_TIMEOUT_MINUTES * 60 * 1000);

    await this.prisma.expenseFlowState.upsert({
      where: { companyId_remoteJid: { companyId, remoteJid } },
      create: {
        companyId,
        remoteJid,
        step,
        flowData: flowData as any,
        expiresAt,
      },
      update: {
        step,
        flowData: flowData as any,
        expiresAt,
      },
    });
  }

  /**
   * Limpa o estado do fluxo (fluxo terminou)
   */
  private async clearFlowState(companyId: string, remoteJid: string) {
    await this.prisma.expenseFlowState.deleteMany({
      where: { companyId, remoteJid },
    });
  }

  // =========================================
  // ENTRADA PRINCIPAL DO FLUXO
  // =========================================

  /**
   * Verifica se há um fluxo ativo para este contato
   */
  async hasActiveFlow(companyId: string, remoteJid: string): Promise<boolean> {
    const state = await this.getFlowState(companyId, remoteJid);
    return state !== null && state.step !== 'idle';
  }

  /**
   * Processa mensagem dentro do fluxo ativo
   */
  async processFlowMessage(
    companyId: string,
    remoteJid: string,
    message: string,
  ): Promise<FlowResult> {
    const state = await this.getFlowState(companyId, remoteJid);

    if (!state || state.step === 'idle') {
      return { success: false, response: 'Nenhum fluxo ativo.', flowEnded: true };
    }

    const flowData = state.flowData as unknown as ExpenseFlowData;

    // Verificar cancelamento
    if (this.isCancelCommand(message)) {
      await this.clearFlowState(companyId, remoteJid);
      return { success: true, response: '❌ Operação cancelada.', flowEnded: true };
    }

    // Rotear para o step correto
    switch (state.step) {
      case 'awaiting_wallet':
        return this.handleWalletSelection(companyId, remoteJid, message, flowData);

      case 'awaiting_wallet_type':
        return this.handleWalletTypeSelection(companyId, remoteJid, message, flowData);

      case 'awaiting_items_confirmation':
        return this.handleItemsConfirmation(companyId, remoteJid, message, flowData);

      case 'awaiting_final_confirmation':
        return this.handleFinalConfirmation(companyId, remoteJid, message, flowData);

      default:
        await this.clearFlowState(companyId, remoteJid);
        return { success: false, response: 'Estado inválido. Tente novamente.', flowEnded: true };
    }
  }

  /**
   * Inicia novo fluxo de despesa a partir de uma imagem
   */
  async startExpenseFlowFromImage(
    companyId: string,
    remoteJid: string,
    instanceKey: string,
    mediaData: any,
    caption: string,
  ): Promise<FlowResult> {
    try {
      // 1. Verificar conexão com Gastometria
      const status = await this.gastometriaService.getStatus(companyId);
      if (!status.connected) {
        return {
          success: false,
          response: '❌ Gastometria não está conectado. Acesse Integrações no painel para conectar sua conta.',
          flowEnded: true,
        };
      }

      // 2. Baixar imagem da Evolution API
      const imageData = await this.downloadImage(instanceKey, mediaData);
      if (!imageData) {
        return {
          success: false,
          response: '❌ Não consegui baixar a imagem. Tente enviar novamente.',
          flowEnded: true,
        };
      }

      // 3. Extrair itens da nota fiscal usando IA
      const extraction = await this.extractItemsFromReceipt(imageData.base64, imageData.mimeType, caption);
      if (!extraction.success) {
        return {
          success: false,
          response: extraction.error || '❌ Não consegui ler os itens da nota.',
          flowEnded: true,
        };
      }

      // 4. Salvar estado e mostrar itens + opções de carteira
      const flowData: ExpenseFlowData = {
        hasImage: true,
        items: extraction.items,
        totalAmount: extraction.totalAmount,
        establishment: extraction.establishment,
        date: extraction.date,
        category: extraction.suggestedCategory,
        caption,
      };

      // 5. Buscar carteiras existentes
      const wallets = await this.gastometriaService.getWallets(companyId);

      // 6. Montar mensagem com itens e opções de carteira
      const itemsList = extraction.items!
        .map((item, i) => `${i + 1}. ${item.name} (${item.quantity}x) - R$ ${item.totalPrice.toFixed(2)}`)
        .join('\n');

      let walletOptions: string;
      if (wallets.length > 0) {
        const walletList = wallets.map((w, i) => `${i + 1}. ${w.icon || '💳'} ${w.name}`).join('\n');
        walletOptions = `\n📋 *Carteiras disponíveis:*\n${walletList}\n\n0️⃣ *Criar nova carteira*`;
      } else {
        walletOptions = '\n\n📋 Você não tem carteiras cadastradas.\nDigite o nome da nova carteira (ex: Nubank):';
      }

      const response = `🧾 *Nota Fiscal Identificada!*
      
📍 *Local:* ${extraction.establishment || 'Não identificado'}
📅 *Data:* ${extraction.date || 'Hoje'}

📦 *Itens encontrados:*
${itemsList}

💰 *Total:* R$ ${extraction.totalAmount?.toFixed(2)}
${walletOptions}

_Responda com o número da carteira ou "0" para criar nova._
_Digite "cancelar" para abortar._`;

      await this.setFlowState(companyId, remoteJid, 'awaiting_wallet', flowData);

      return { success: true, response };
    } catch (error) {
      this.logger.error(`Error starting expense flow: ${error.message}`);
      return {
        success: false,
        response: '❌ Erro ao processar nota fiscal. Tente novamente.',
        flowEnded: true,
      };
    }
  }

  // =========================================
  // HANDLERS DE CADA STEP DO FLUXO
  // =========================================

  /**
   * Step 1: Seleção de carteira
   */
  private async handleWalletSelection(
    companyId: string,
    remoteJid: string,
    message: string,
    flowData: ExpenseFlowData,
  ): Promise<FlowResult> {
    const wallets = await this.gastometriaService.getWallets(companyId);
    const input = message.trim();

    // Opção 0 = criar nova carteira
    if (input === '0' || input.toLowerCase() === 'nova' || input.toLowerCase() === 'criar') {
      // Ir para step de criar carteira
      await this.setFlowState(companyId, remoteJid, 'awaiting_wallet_type', flowData);

      return {
        success: true,
        response: `🆕 *Criar Nova Carteira*

Digite o nome da carteira (ex: Nubank, Itaú, Cartão Santander):`,
      };
    }

    // Tentar por número
    const index = parseInt(input);
    if (!isNaN(index) && index >= 1 && index <= wallets.length) {
      const selectedWallet = wallets[index - 1];
      flowData.selectedWalletId = selectedWallet.id;
      flowData.selectedWalletName = selectedWallet.name;

      return this.showItemsConfirmation(companyId, remoteJid, flowData);
    }

    // Tentar por nome (fuzzy match)
    const lowerInput = input.toLowerCase();
    const matchedWallet = wallets.find(
      (w) => w.name.toLowerCase().includes(lowerInput) || lowerInput.includes(w.name.toLowerCase()),
    );

    if (matchedWallet) {
      flowData.selectedWalletId = matchedWallet.id;
      flowData.selectedWalletName = matchedWallet.name;

      return this.showItemsConfirmation(companyId, remoteJid, flowData);
    }

    // Se não encontrou, assumir que é nome de nova carteira
    flowData.newWalletName = input;
    await this.setFlowState(companyId, remoteJid, 'awaiting_wallet_type', flowData);

    const typesList = WALLET_TYPES.map((t, i) => `${i + 1}. ${t.icon} ${t.name}`).join('\n');

    return {
      success: true,
      response: `📝 Nova carteira: *${input}*

Qual o tipo dessa carteira?
${typesList}

_Responda com o número do tipo._`,
    };
  }

  /**
   * Step 2: Seleção do tipo de carteira (ao criar nova)
   */
  private async handleWalletTypeSelection(
    companyId: string,
    remoteJid: string,
    message: string,
    flowData: ExpenseFlowData,
  ): Promise<FlowResult> {
    const input = message.trim();

    // Se ainda não tem nome da carteira, este é o nome
    if (!flowData.newWalletName) {
      flowData.newWalletName = input;
      await this.setFlowState(companyId, remoteJid, 'awaiting_wallet_type', flowData);

      const typesList = WALLET_TYPES.map((t, i) => `${i + 1}. ${t.icon} ${t.name}`).join('\n');

      return {
        success: true,
        response: `📝 Nova carteira: *${input}*

Qual o tipo dessa carteira?
${typesList}

_Responda com o número do tipo._`,
      };
    }

    // Já tem nome, agora precisa do tipo
    let selectedType: (typeof WALLET_TYPES)[number] | undefined;

    // Tentar por número
    const index = parseInt(input);
    if (!isNaN(index) && index >= 1 && index <= WALLET_TYPES.length) {
      selectedType = WALLET_TYPES[index - 1];
    } else {
      // Tentar por nome
      const lowerInput = input.toLowerCase();
      selectedType = WALLET_TYPES.find(
        (t) => t.name.toLowerCase().includes(lowerInput) || t.id === lowerInput,
      );
    }

    if (!selectedType) {
      const typesList = WALLET_TYPES.map((t, i) => `${i + 1}. ${t.icon} ${t.name}`).join('\n');
      return {
        success: true,
        response: `❓ Tipo não reconhecido. Escolha um número:
${typesList}`,
      };
    }

    // Criar a carteira
    const createResult = await this.gastometriaService.createWallet(companyId, {
      name: flowData.newWalletName!,
      type: selectedType.name,
      icon: selectedType.icon,
    });

    if (!createResult.success || !createResult.wallet) {
      await this.clearFlowState(companyId, remoteJid);
      return {
        success: false,
        response: `❌ Erro ao criar carteira: ${createResult.message}`,
        flowEnded: true,
      };
    }

    // Atualizar flowData com a nova carteira
    flowData.selectedWalletId = createResult.wallet.id;
    flowData.selectedWalletName = createResult.wallet.name;

    // Ir para confirmação de itens
    return this.showItemsConfirmation(companyId, remoteJid, flowData);
  }

  /**
   * Mostra confirmação dos itens
   */
  private async showItemsConfirmation(
    companyId: string,
    remoteJid: string,
    flowData: ExpenseFlowData,
  ): Promise<FlowResult> {
    const itemsList = flowData.items!
      .map((item, i) => `${i + 1}. ${item.name} (${item.quantity}x) - R$ ${item.totalPrice.toFixed(2)}`)
      .join('\n');

    const response = `✅ *Carteira selecionada:* ${flowData.selectedWalletName}

📦 *Itens a serem lançados:*
${itemsList}

💰 *Total:* R$ ${flowData.totalAmount?.toFixed(2)}
📍 *Local:* ${flowData.establishment || 'Não informado'}

*Confirma o lançamento destes itens?*
Responda: *SIM* para confirmar ou *NÃO* para cancelar.

💡 _Você também pode editar:_
• "remover 2" - remove o item 2
• "editar 1 para 10.00" - altera valor do item 1`;

    flowData.confirmedItems = [...flowData.items!];
    await this.setFlowState(companyId, remoteJid, 'awaiting_items_confirmation', flowData);

    return { success: true, response };
  }

  /**
   * Step 3: Confirmação/Edição dos itens
   */
  private async handleItemsConfirmation(
    companyId: string,
    remoteJid: string,
    message: string,
    flowData: ExpenseFlowData,
  ): Promise<FlowResult> {
    const input = message.trim().toLowerCase();

    // Confirmar
    if (input === 'sim' || input === 's' || input === 'ok' || input === 'confirmar' || input === 'confirma') {
      await this.setFlowState(companyId, remoteJid, 'awaiting_final_confirmation', flowData);

      // Resumo final
      const itemsList = flowData.confirmedItems!
        .map((item) => `• ${item.name}: R$ ${item.totalPrice.toFixed(2)}`)
        .join('\n');

      const total = flowData.confirmedItems!.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        success: true,
        response: `🔍 *RESUMO FINAL*

📋 *Carteira:* ${flowData.selectedWalletName}
📍 *Local:* ${flowData.establishment || 'Não informado'}

${itemsList}

💰 *TOTAL:* R$ ${total.toFixed(2)}

*Confirma o lançamento final?*
Responda *SIM* para salvar ou *NÃO* para cancelar.`,
      };
    }

    // Cancelar
    if (input === 'não' || input === 'nao' || input === 'n' || input === 'cancelar') {
      await this.clearFlowState(companyId, remoteJid);
      return { success: true, response: '❌ Lançamento cancelado.', flowEnded: true };
    }

    // Remover item: "remover 2" ou "remove 2"
    const removeMatch = input.match(/^remov(?:er|e)\s+(\d+)$/);
    if (removeMatch) {
      const itemIndex = parseInt(removeMatch[1]) - 1;
      if (itemIndex >= 0 && itemIndex < flowData.confirmedItems!.length) {
        const removed = flowData.confirmedItems!.splice(itemIndex, 1)[0];

        if (flowData.confirmedItems!.length === 0) {
          await this.clearFlowState(companyId, remoteJid);
          return {
            success: true,
            response: '❌ Todos os itens foram removidos. Lançamento cancelado.',
            flowEnded: true,
          };
        }

        await this.setFlowState(companyId, remoteJid, 'awaiting_items_confirmation', flowData);

        const itemsList = flowData.confirmedItems!
          .map((item, i) => `${i + 1}. ${item.name} (${item.quantity}x) - R$ ${item.totalPrice.toFixed(2)}`)
          .join('\n');

        const newTotal = flowData.confirmedItems!.reduce((sum, item) => sum + item.totalPrice, 0);

        return {
          success: true,
          response: `✅ Item "${removed.name}" removido!

📦 *Itens restantes:*
${itemsList}

💰 *Novo Total:* R$ ${newTotal.toFixed(2)}

Responda *SIM* para confirmar ou continue editando.`,
        };
      }
    }

    // Editar valor: "editar 1 para 10.00" ou "1 = 10.00"
    const editMatch = input.match(/^(?:editar\s+)?(\d+)\s*(?:para|=)\s*([\d.,]+)$/);
    if (editMatch) {
      const itemIndex = parseInt(editMatch[1]) - 1;
      const newValue = parseFloat(editMatch[2].replace(',', '.'));

      if (itemIndex >= 0 && itemIndex < flowData.confirmedItems!.length && !isNaN(newValue)) {
        flowData.confirmedItems![itemIndex].totalPrice = newValue;
        flowData.confirmedItems![itemIndex].unitPrice = newValue / flowData.confirmedItems![itemIndex].quantity;

        await this.setFlowState(companyId, remoteJid, 'awaiting_items_confirmation', flowData);

        const itemsList = flowData.confirmedItems!
          .map((item, i) => `${i + 1}. ${item.name} (${item.quantity}x) - R$ ${item.totalPrice.toFixed(2)}`)
          .join('\n');

        const newTotal = flowData.confirmedItems!.reduce((sum, item) => sum + item.totalPrice, 0);

        return {
          success: true,
          response: `✅ Valor atualizado!

📦 *Itens:*
${itemsList}

💰 *Novo Total:* R$ ${newTotal.toFixed(2)}

Responda *SIM* para confirmar ou continue editando.`,
        };
      }
    }

    // Não entendeu
    return {
      success: true,
      response: `❓ Não entendi. Opções:
• *SIM* - confirmar itens
• *NÃO* - cancelar
• *remover 2* - remove item 2
• *editar 1 para 10.00* - altera valor`,
    };
  }

  /**
   * Step 4: Confirmação final e salvamento
   */
  private async handleFinalConfirmation(
    companyId: string,
    remoteJid: string,
    message: string,
    flowData: ExpenseFlowData,
  ): Promise<FlowResult> {
    const input = message.trim().toLowerCase();

    // Cancelar
    if (input === 'não' || input === 'nao' || input === 'n' || input === 'cancelar') {
      await this.clearFlowState(companyId, remoteJid);
      return { success: true, response: '❌ Lançamento cancelado.', flowEnded: true };
    }

    // Confirmar
    if (input === 'sim' || input === 's' || input === 'ok' || input === 'confirmar' || input === 'confirma') {
      // Salvar cada item como uma transação separada
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;

      for (const item of flowData.confirmedItems!) {
        const result = await this.gastometriaService.createTransaction(companyId, {
          amount: item.totalPrice,
          type: 'expense',
          category: item.category || flowData.category || 'Alimentação',
          item: item.name,
          establishment: flowData.establishment,
          date: flowData.date,
          walletId: flowData.selectedWalletId,
        });

        if (result.success) {
          successCount++;
          results.push(`✅ ${item.name}: R$ ${item.totalPrice.toFixed(2)}`);
        } else {
          failCount++;
          results.push(`❌ ${item.name}: Erro`);
        }
      }

      await this.clearFlowState(companyId, remoteJid);

      const total = flowData.confirmedItems!.reduce((sum, item) => sum + item.totalPrice, 0);

      if (failCount === 0) {
        return {
          success: true,
          response: `🎉 *Lançamento Completo!*

📋 *Carteira:* ${flowData.selectedWalletName}
📍 *Local:* ${flowData.establishment || '-'}

${results.join('\n')}

💰 *Total:* R$ ${total.toFixed(2)}
📊 *Itens:* ${successCount} lançados`,
          flowEnded: true,
        };
      } else {
        return {
          success: true,
          response: `⚠️ *Lançamento Parcial*

${results.join('\n')}

✅ ${successCount} sucesso | ❌ ${failCount} falhas`,
          flowEnded: true,
        };
      }
    }

    // Não entendeu
    return {
      success: true,
      response: `❓ Responda *SIM* para confirmar ou *NÃO* para cancelar.`,
    };
  }

  // =========================================
  // FUNÇÕES AUXILIARES
  // =========================================

  /**
   * Verifica se é comando de cancelamento
   */
  private isCancelCommand(message: string): boolean {
    const lower = message.toLowerCase().trim();
    return ['cancelar', 'cancela', 'parar', 'sair', 'abort', 'abortar'].includes(lower);
  }

  /**
   * Baixa imagem da Evolution API
   */
  private async downloadImage(
    instanceKey: string,
    mediaData: any,
  ): Promise<{ base64: string; mimeType: string } | null> {
    try {
      const evolutionApiUrl = this.config.get('EVOLUTION_API_URL') || 'http://evolution:8080';
      const evolutionApiKey = this.config.get('EVOLUTION_API_KEY');

      const payload = {
        message: {
          key: mediaData.key,
          message: mediaData.message,
        },
        convertToMp4: false,
      };

      this.logger.log(`📷 Downloading image from Evolution API...`);

      const response = await fetch(`${evolutionApiUrl}/chat/getBase64FromMediaMessage/${instanceKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Evolution API error: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();

      if (!result.base64) {
        this.logger.error('No base64 in Evolution API response');
        return null;
      }

      this.logger.log(`✅ Image downloaded successfully, size: ${result.base64.length} chars`);

      return {
        base64: result.base64,
        mimeType: result.mimetype || 'image/jpeg',
      };
    } catch (error) {
      this.logger.error(`Error downloading image: ${error.message}`);
      return null;
    }
  }

  /**
   * Extrai itens de uma nota fiscal usando IA
   */
  private async extractItemsFromReceipt(
    base64Image: string,
    mimeType: string,
    caption: string,
  ): Promise<{
    success: boolean;
    items?: ExtractedItem[];
    totalAmount?: number;
    establishment?: string;
    date?: string;
    suggestedCategory?: string;
    error?: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      };

      const prompt = `Analise esta imagem de cupom fiscal/nota fiscal e extraia TODOS os itens individuais.

INSTRUÇÕES:
1. Extraia CADA item separadamente com nome, quantidade e valor
2. O valor total dos itens DEVE corresponder ao total da nota
3. Se não conseguir ler algum item, estime com base no total

Responda APENAS em JSON válido:
{
  "isReceipt": true/false,
  "establishment": "Nome do estabelecimento/loja",
  "date": "YYYY-MM-DD ou null se não visível",
  "suggestedCategory": "Categoria principal (Alimentação, Mercado, Farmácia, etc)",
  "items": [
    {
      "name": "Nome do produto",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "category": "Subcategoria opcional"
    }
  ],
  "totalAmount": 0.00,
  "confidence": 0.0-1.0
}

REGRAS:
- Se for uma nota de supermercado/mercado, a categoria principal é "Alimentação" ou "Mercado"
- totalPrice = quantity * unitPrice
- Soma de todos totalPrice deve ser igual a totalAmount
- Se a legenda "${caption}" mencionar algo específico, use como contexto
- Se não conseguir identificar itens individuais, crie UM item genérico com o valor total`;

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: 'Não consegui extrair dados da imagem.' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.isReceipt) {
        return { success: false, error: 'Esta imagem não parece ser um cupom fiscal.' };
      }

      if (!parsed.items || parsed.items.length === 0) {
        return { success: false, error: 'Não encontrei itens na nota.' };
      }

      // Validar e normalizar itens
      const items: ExtractedItem[] = parsed.items.map((item: any) => ({
        name: item.name || 'Item',
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || 0,
        category: item.category,
      }));

      // Calcular total real
      const calculatedTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const reportedTotal = parseFloat(parsed.totalAmount) || calculatedTotal;

      // Se houver diferença significativa, ajustar proporcionalmente
      if (Math.abs(calculatedTotal - reportedTotal) > 0.1 && calculatedTotal > 0) {
        const ratio = reportedTotal / calculatedTotal;
        items.forEach((item) => {
          item.totalPrice = parseFloat((item.totalPrice * ratio).toFixed(2));
          item.unitPrice = parseFloat((item.totalPrice / item.quantity).toFixed(2));
        });
      }

      return {
        success: true,
        items,
        totalAmount: reportedTotal,
        establishment: parsed.establishment,
        date: parsed.date,
        suggestedCategory: parsed.suggestedCategory,
      };
    } catch (error) {
      this.logger.error(`Error extracting items: ${error.message}`);
      return { success: false, error: 'Erro ao analisar a nota fiscal.' };
    }
  }
}
