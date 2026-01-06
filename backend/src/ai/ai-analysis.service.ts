import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  intent: 'question' | 'complaint' | 'purchase' | 'support' | 'greeting' | 'other';
  confidence: number;
  reasoning: string;
  shouldEscalate: boolean;
  escalationReason?: string;
}

@Injectable()
export class AIAnalysisService {
  private readonly logger = new Logger(AIAnalysisService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Analisa mensagem para extrair intenção, sentimento e urgência
   */
  async analyzeMessage(
    messageContent: string,
    context: any,
  ): Promise<AIAnalysis> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const prompt = `Analise a seguinte mensagem recebida no WhatsApp de uma empresa.
      
      MENSAGEM: "${messageContent}"
      
      CONTEXTO:
      - Histórico recente: ${JSON.stringify(context.conversationHistory?.slice(-3) || [])}
      - Cliente: ${context.contactName || 'Desconhecido'}

      Responda APENAS um JSON com o seguinte formato:
      {
        "sentiment": "positive" | "neutral" | "negative",
        "urgency": "low" | "normal" | "high" | "urgent",
        "intent": "question" | "complaint" | "purchase" | "support" | "greeting" | "other",
        "confidence": 0.0 a 1.0,
        "reasoning": "explicação breve",
        "shouldEscalate": boolean (true se precisar de humano urgente),
        "escalationReason": "motivo para chamar humano (opcional)"
      }
      
      REGRAS DE ESCALONAMENTO:
      - Clientes muito irritados ou xingando -> shouldEscalate: true
      - Pedidos explícitos para falar com atendente -> shouldEscalate: true
      - Assuntos complexos que a IA não sabe resolver -> shouldEscalate: true
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback seguro
        return {
          sentiment: 'neutral',
          urgency: 'normal',
          intent: 'other',
          confidence: 0,
          reasoning: 'Falha ao analisar JSON',
          shouldEscalate: false
        };
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      this.logger.error(`Error analyzing message: ${error.message}`);
      // Fallback em caso de erro
      return {
        sentiment: 'neutral',
        urgency: 'normal',
        intent: 'other',
        confidence: 0,
        reasoning: 'Erro na API de análise',
        shouldEscalate: false
      };
    }
  }

  /**
   * Qualifica leads com base no histórico
   */
  async qualifyLead(params: { contactId: string; messages: any[]; contact: any; memoryContext?: string }): Promise<any> {
    try {
      const { contactId, messages, contact, memoryContext } = params;
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const conversationSummary = messages
        .slice(-20) // Últimas 20 msgs
        .map((m) => `[${m.direction === 'incoming' ? 'CONTATO' : 'EU'}]: ${m.content}`)
        .join('\n');

      const prompt = `ATUE COMO UM ESPECIALISTA EM VENDAS E QUALIFICAÇÃO DE LEADS.
      
CONTEXTO DO CONTATO:
Nome: ${contact.pushName}
Telefone: ${contact.remoteJid}
Memórias Importantes:
${memoryContext || 'Nenhuma memória salva ainda'}

HISTÓRICO DA CONVERSA (${messages.length} mensagens):
- [EU] = minhas mensagens (ignore para a análise do perfil)
- [CONTATO] = mensagens do contato (FOCO DA ANÁLISE)

${conversationSummary}

FAÇA UMA ANÁLISE PROFUNDA SOBRE O CONTATO "${contact.pushName || 'CONTATO'}" E RETORNE JSON:
{
  "score": 0-100,
  "status": "cold|warm|hot|qualified|customer",
  "analysis": "Escreva uma análise DETALHADA de 4-5 parágrafos sobre o CONTATO cobrindo perfil, interesses, objeções e recomendações."
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) throw new Error('Could not parse lead analysis JSON');
      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      this.logger.error(`Lead qualification failed: ${error.message}`);
      throw error;
    }
  }

  async summarizeConversation(messages: any[]): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });
    const conversationText = messages.map(m => `${m.direction === 'incoming' ? 'Cliente' : 'Você'}: ${m.content}`).join('\n');
    const result = await model.generateContent(`Resuma a seguinte conversa em 2-3 frases:\n${conversationText}`);
    return result.response.text().trim();
  }

  async detectOpportunity(messageContent: string, products: any[]): Promise<any> {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });
    const productsList = products.map(p => `- ${p.name}: ${p.price}`).join('\n');
    const result = await model.generateContent(`Analise se há oportunidade de venda na mensagem: "${messageContent}"\nProdutos: ${productsList}\nRetorne JSON: { "hasOpportunity": bool, "recommendedProducts": [], "reasoning": "" }`);
    const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { hasOpportunity: false };
  }

  /**
   * OTIMIZADO: Analisa E gera resposta em uma única chamada ao Gemini
   * Economiza 50% das chamadas de API em modo ativo
   */
  async analyzeAndRespond(
    messageContent: string,
    context: any,
    aiConfig: any,
  ): Promise<{
    analysis: AIAnalysis;
    response: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: aiConfig.temperature || 0.7,
        }
      });

      const ownerName = aiConfig.ownerName || 'o responsável';
      const productContext = context.products?.length > 0
        ? `PRODUTOS DISPONÍVEIS:\n${context.products.map((p: any) => `- ${p.name}: R$${p.price}${p.quantity > 0 ? '' : ' (esgotado)'}`).join('\n')}`
        : '';

      const conversationHistory = context.conversationHistory?.slice(-5)
        ?.map((m: any) => `${m.direction === 'incoming' ? 'Cliente' : 'Você'}: ${m.content}`)
        ?.join('\n') || '';

      const prompt = `Você é Sofia, secretária virtual simpática do ${ownerName}. Analise a mensagem e responda.

MENSAGEM DO CLIENTE: "${messageContent}"
NOME DO CLIENTE: ${context.contactName || 'Cliente'}

HISTÓRICO RECENTE:
${conversationHistory || 'Início da conversa'}

${productContext}

${aiConfig.systemPrompt || ''}

RESPONDA EM JSON:
{
  "analysis": {
    "sentiment": "positive" | "neutral" | "negative",
    "urgency": "low" | "normal" | "high" | "urgent",
    "intent": "question" | "complaint" | "purchase" | "support" | "greeting" | "other",
    "confidence": 0.0 a 1.0,
    "reasoning": "explicação breve",
    "shouldEscalate": boolean (true se precisar chamar ${ownerName}),
    "escalationReason": "motivo (se shouldEscalate true)"
  },
  "response": "Sua resposta natural e simpática como Sofia para o cliente"
}

REGRAS:
- Se o cliente pedir para falar com humano -> shouldEscalate: true
- Se reclamação séria ou cliente irritado -> shouldEscalate: true
- Se não souber responder -> shouldEscalate: true
- Seja simpática, use emojis com moderação
- Respostas curtas e diretas (ideal para WhatsApp)`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback
        return {
          analysis: {
            sentiment: 'neutral',
            urgency: 'normal',
            intent: 'other',
            confidence: 0,
            reasoning: 'Falha ao processar',
            shouldEscalate: false,
          },
          response: 'Oi! Desculpa, tive um probleminha aqui. Pode repetir? 😊',
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        analysis: parsed.analysis,
        response: parsed.response,
      };

    } catch (error) {
      this.logger.error(`Error in analyzeAndRespond: ${error.message}`);
      return {
        analysis: {
          sentiment: 'neutral',
          urgency: 'normal',
          intent: 'other',
          confidence: 0,
          reasoning: 'Erro na API',
          shouldEscalate: false,
        },
        response: 'Oi! Desculpa, estou com um probleminha técnico. Pode tentar de novo? 😅',
      };
    }
  }

  async parseProductConfirmation(
    messageContent: string,
    pendingProduct: any,
  ): Promise<{
    confirmed: boolean;
    productData?: {
      name: string;
      description?: string;
      price: number;
      quantity: number;
      variant?: string;
    };
    needsMoreInfo?: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        }
      });

      const prompt = `O usuário está confirmando o cadastro de um produto.
      
      Produto pendente:
        - Nome: ${pendingProduct.name}
        - Descrição: ${pendingProduct.description || 'N/A'}
        - Quantidade sugerida: ${pendingProduct.quantity || 'não informada'}
      
      Mensagem do usuário: "${messageContent}"
      
      Extraia as informações da mensagem:
        1. Se ele confirmou(disse sim, ok, confirma, etc)
        2. O preço mencionado(número decimal, ex: 29.90)
        3. Quantidade(se mencionou)
        4. Variante / tamanho(se mencionou)
      
      Responda em JSON:
        {
          "confirmed": true / false,
            "price": 29.90(número ou null),
              "quantity": 10(número ou null),
                "variant": "Tamanho M"(string ou null),
                  "needsMoreInfo": "O que falta"(string ou null se tudo ok)
        }`; // JSON structure simplified for response

      // Fixing the prompt JSON structure string for actual usage
      const promptClean = `O usuário está confirmando o cadastro de um produto.
      Produto pendente:
      - Nome: ${pendingProduct.name}
      - Descrição: ${pendingProduct.description || 'N/A'}
      - Quantidade sugerida: ${pendingProduct.quantity || 'não informada'}
      
      Mensagem do usuário: "${messageContent}"
      
      Extraia as informações da mensagem e confirme se ele quer cadastrar.O preço é obrigatório.
      
      Responda APENAS JSON:
      {
        "confirmed": boolean,
        "price": number | null,
        "quantity": number | null,
        "variant": string | null,
        "needsMoreInfo": string | null
      }`;

      const result = await model.generateContent(promptClean);
      const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return { confirmed: false, needsMoreInfo: 'Não entendi. Pode confirmar o preço?' };
      }
      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      this.logger.error(`Error parsing confirmation: ${error.message}`);
      return {
        confirmed: false, needsMoreInfo: 'Erro ao processar. Tente novamente.'
      };
    }
  }

  async parseOwnerCommand(messageContent: string, companyId: string): Promise<{
    isCommand: boolean;
    commandType?: 'instruction' | 'query' | 'config' | 'conversation';
    response?: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
        }
      });

      const prompt = `Você é uma secretária virtual inteligente. Analise a mensagem do seu chefe(dono) e determine:
      
      1. Se é um COMANDO / INSTRUÇÃO para você(ex: "avise todos os clientes que...", "quando alguém perguntar sobre X, diga Y", "mude sua forma de responder")
      2. Se é uma CONSULTA sobre algo(ex: "quantas mensagens hoje?", "quem me procurou?", "resumo do dia")
      3. Se é apenas uma CONVERSA normal
      
      Mensagem do chefe: "${messageContent}"
      
      Responda em JSON:
      {
        "isCommand": true / false,
          "commandType": "instruction" | "query" | "conversation",
            "response": "Sua resposta ao chefe (confirme o comando ou responda a consulta)"
      }
      
      Se for instrução, confirme que entendeu e vai seguir.
      Se for consulta, responda de forma útil.
      Se for conversa, responda naturalmente como assistente pessoal.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Mapear 'conversation' para undefined no commandType se não for commando de verdade
        // O tipo esperado é 'instruction' | 'query' | 'config'
        let type: any = parsed.commandType;
        if (type === 'conversation') {
          // Se for conversa, isCommand deve ser false?
          // O original dizia isCommand: boolean.
          // Se o prompt diz isCommand: true para queries também?
          // O prompt original diz "Se é COMANDO/INSTRUÇÃO". Queries são consultas.
          // Vamos respeitar o retorno do modelo.
          if (type === 'conversation') type = undefined;
        }

        return {
          isCommand: parsed.isCommand,
          commandType: type,
          response: parsed.response
        };
      }

      return { isCommand: false, response: 'Não entendi.' };
    } catch (error) {
      this.logger.error(`Error parsing owner command: ${error.message}`);
      return { isCommand: false };
    }
  }
}

