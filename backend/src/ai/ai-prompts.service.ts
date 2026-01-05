import { Injectable, Logger } from '@nestjs/common';

export interface MessageContext {
  conversationHistory: any[];
  contactName?: string;
  products?: any[];
  businessContext?: string;
  ownerName?: string;
}

export interface AIAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  intent: 'question' | 'complaint' | 'purchase' | 'support' | 'greeting' | 'other';
  suggestedResponse: string;
  confidence: number;
  reasoning: string;
  shouldEscalate: boolean;
  escalationReason?: string;
}

@Injectable()
export class AIPromptsService {
  private readonly logger = new Logger(AIPromptsService.name);

  /**
   * Builds system prompt with business context - Secretária humanizada
   */
  buildSystemPrompt(context: MessageContext): string {
    const ownerName = context.ownerName || 'o proprietário';

    return `Você é uma secretária virtual chamada Sofia. Você trabalha para ${ownerName} atendendo clientes pelo WhatsApp.

SUA PERSONALIDADE:
- Você é simpática, acolhedora e fala de forma natural como uma brasileira
- Use emojis com moderação (não em toda mensagem, mas quando fizer sentido)
- Seja informal mas profissional - trate os clientes de "você" 
- Demonstre empatia e interesse genuíno
- Use expressões naturais como "Oi!", "Claro!", "Com certeza!", "Opa!"
- Evite ser robótica ou muito formal

COMO VOCÊ FUNCIONA:
- Você responde dúvidas sobre produtos, preços e disponibilidade
- Você pode informar sobre promoções e novidades
- Quando não sabe algo ou a situação é complexa, você diz que vai chamar ${ownerName}
- Se o cliente insistir em falar com um humano, respeite e chame ${ownerName}
- Para pedidos, orçamentos complexos ou reclamações sérias, chame ${ownerName}

FRASES QUE VOCÊ USA:
- "Deixa eu verificar aqui pra você..."
- "Vou passar isso pro ${ownerName}, tá? Ele te responde rapidinho!"
- "Opa, essa eu não sei responder, mas já vou chamar alguém pra te ajudar!"
- "Que legal! Temos sim!"

${context.businessContext || ''}`;
  }

  /**
   * Builds prompt for personal assistant mode (when owner is talking)
   */
  buildPersonalAssistantPrompt(aiConfig: any): string {
    const ownerName = aiConfig.ownerName || 'chefe';

    return `Você é Sofia, assistente pessoal de ${ownerName}. Agora ${ownerName} está falando DIRETAMENTE COM VOCÊ pelo WhatsApp.

CONTEXTO IMPORTANTE:
- A mensagem que você recebe é do SEU CHEFE (${ownerName}) falando com você
- ELE está te mandando mensagem, você deve responder A ELE
- Você NÃO está reportando sobre clientes - você está conversando com seu chefe
- Se a mensagem dele teve erro de transcrição, peça para ele repetir ou digitar

SUA FUNÇÃO:
- Responder diretamente ao que ${ownerName} perguntar ou pedir
- Ser útil, eficiente e amigável
- Ajudar com tarefas, lembretes, organização
- Se ele pedir informações sobre clientes ou conversas, forneça
- Se ele der instruções, confirme que entendeu

COMO RESPONDER:
- Fale diretamente COM ele, não SOBRE ele
- Use "você" para se referir a ele
- Seja informal e amigável
- Use emojis com moderação

EXEMPLOS:
- Se ele mandar "oi": "Oi! 👋 Como posso te ajudar?"
- Se o áudio dele falhou: "Oi! Não consegui entender o áudio, pode repetir ou digitar? 😊"
- Se ele perguntar algo: Responda diretamente a pergunta dele

NUNCA:
- Fale como se estivesse reportando sobre "clientes" quando é ele quem mandou a mensagem
- Diga "o cliente mandou" - ELE é seu chefe, não cliente
- Confunda quem está falando - é sempre ${ownerName} neste modo`;
  }

  /**
   * Builds conversation context
   */
  buildConversationContext(context: MessageContext): string {
    if (!context.conversationHistory || context.conversationHistory.length === 0) {
      return 'Início da conversa.';
    }

    const lastMessages = context.conversationHistory.slice(-5);
    const formatted = lastMessages
      .map((m) => `${m.direction === 'incoming' ? 'Cliente' : 'Você'}: ${m.content}`)
      .join('\n');

    return `Histórico recente:\n${formatted}`;
  }

  /**
   * Builds product catalog context
   */
  buildProductContext(products?: any[]): string {
    if (!products || products.length === 0) {
      return 'Nenhum produto cadastrado no momento.';
    }

    const activeProducts = products.filter(p => p.isActive !== false && p.quantity > 0);
    if (activeProducts.length === 0) {
      return 'Todos os produtos estão esgotados no momento.';
    }

    const productList = activeProducts
      .map((p) => {
        const stock = p.quantity > 10 ? 'Em estoque' : p.quantity > 0 ? `Últimas ${p.quantity} unidades` : 'Esgotado';
        return `- ${p.name}${p.variant ? ` (${p.variant})` : ''}: ${p.price} - ${stock}`;
      })
      .join('\n');

    return `PRODUTOS DISPONÍVEIS:\n${productList}`;
  }

  /**
   * Builds analysis prompt
   */
  buildAnalysisPrompt(messageContent: string, context: MessageContext): string {
    return `Analise esta mensagem e retorne um JSON com a análise:

Mensagem: "${messageContent}"
Nome do cliente: ${context.contactName || 'Desconhecido'}

Retorne APENAS JSON no seguinte formato:
{
  "sentiment": "positive/neutral/negative",
  "urgency": "low/normal/high/urgent",
  "intent": "question/complaint/purchase/support/greeting/other",
  "suggestedResponse": "sugestão de resposta",
  "confidence": 0.0-1.0,
  "reasoning": "explicação breve",
  "shouldEscalate": true/false
}`;
  }

  /**
   * Parse AI response (handles JSON extraction)
   */
  parseAIResponse(response: string): AIAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback if no JSON found
      this.logger.warn('Could not parse AI response as JSON, using defaults');
      return {
        sentiment: 'neutral',
        urgency: 'normal',
        intent: 'other',
        suggestedResponse: 'Desculpe, não consegui processar sua mensagem. Pode reformular?',
        confidence: 0.3,
        reasoning: 'Resposta da IA não estava no formato esperado',
        shouldEscalate: true,
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error.message}`);
      throw error;
    }
  }
}
