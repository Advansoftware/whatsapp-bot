import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SecretaryTasksService } from '../secretary-tasks/secretary-tasks.service';

/**
 * Serviço para criar tarefas da secretária via conversa com o dono
 */
@Injectable()
export class AITasksService {
  private readonly logger = new Logger(AITasksService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly secretaryTasksService: SecretaryTasksService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Verifica se a mensagem do dono é um pedido para criar/gerenciar tarefa
   */
  isTaskRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    const taskKeywords = [
      'quando eu estiver dormindo',
      'enquanto eu dormir',
      'enquanto eu estiver dormindo',
      'quando eu não responder',
      'se eu não mandar mensagem',
      'criar tarefa',
      'nova tarefa',
      'configure para',
      'quero que você',
      'lembre de',
      'lembrar de',
      'avise quando',
      'responda quando',
      'responder quando',
      'automaticamente',
      'sempre que',
      'toda vez que',
      'das .* às',
      'entre .* e .*hora',
      'depois da meia.?noite',
      'de madrugada',
      'modo dormir',
      'modo ausente',
    ];

    return taskKeywords.some(keyword => {
      if (keyword.includes('.*')) {
        return new RegExp(keyword, 'i').test(lowerMessage);
      }
      return lowerMessage.includes(keyword);
    });
  }

  /**
   * Processa pedido de criação de tarefa usando IA para extrair parâmetros
   */
  async processTaskRequest(
    message: string,
    companyId: string,
    conversationContext?: string[],
  ): Promise<{
    success: boolean;
    response: string;
    taskCreated?: boolean;
    taskId?: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const prompt = `Você é uma secretária virtual inteligente. O dono está pedindo para você criar uma tarefa automatizada.

MENSAGEM DO DONO:
"${message}"

${conversationContext?.length ? `CONTEXTO DA CONVERSA:\n${conversationContext.join('\n')}` : ''}

Analise a mensagem e extraia as informações para criar a tarefa. Responda APENAS em JSON válido:

{
  "understood": true/false,
  "needsMoreInfo": true/false,
  "clarificationQuestion": "pergunta para esclarecer se needsMoreInfo=true",
  "task": {
    "name": "nome curto da tarefa",
    "description": "descrição do que a tarefa faz",
    "triggerType": "time_range" | "keyword" | "first_message" | "owner_inactive" | "always",
    "triggerConfig": {
      // Para time_range:
      "startHour": 0-23,
      "endHour": 0-23,
      "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
      
      // Para keyword:
      "keywords": ["palavra1", "palavra2"],
      "matchType": "any" | "all"
      
      // Para owner_inactive:
      "inactiveMinutes": 30
      
      // Para first_message:
      "onlyNewContacts": true/false
    },
    "actionType": "send_message" | "add_to_response" | "set_tag",
    "actionConfig": {
      // Para send_message:
      "message": "mensagem a enviar",
      "replaceResponse": true/false
      
      // Para add_to_response:
      "prefix": "texto antes",
      "suffix": "texto depois"
      
      // Para set_tag:
      "tags": ["tag1", "tag2"]
    },
    "priority": 1-10
  },
  "confirmationMessage": "mensagem para confirmar com o dono o que será criado"
}

REGRAS:
- Se entendeu completamente, retorne understood=true e task preenchida
- Se precisa de mais informações, retorne needsMoreInfo=true com clarificationQuestion
- "Enquanto eu dormir" = time_range das 0h às 8h
- "Quando eu não responder por 30 min" = owner_inactive com 30 minutos
- "Sempre" = always
- Se o dono quer uma mensagem específica, use send_message com replaceResponse=true
- Se quer adicionar algo à resposta normal, use add_to_response`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extrair JSON da resposta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          response: 'Desculpe, não consegui entender seu pedido. Pode reformular? 🤔',
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Se precisa de mais informações
      if (parsed.needsMoreInfo) {
        return {
          success: true,
          response: parsed.clarificationQuestion || 'Pode me dar mais detalhes sobre o que você quer? 🤔',
          taskCreated: false,
        };
      }

      // Se entendeu, criar a tarefa
      if (parsed.understood && parsed.task) {
        const task = await this.secretaryTasksService.create(
          companyId,
          {
            name: parsed.task.name,
            description: parsed.task.description,
            triggerType: parsed.task.triggerType,
            triggerConfig: parsed.task.triggerConfig,
            actionType: parsed.task.actionType,
            actionConfig: parsed.task.actionConfig,
            priority: parsed.task.priority || 5,
            isActive: true,
          },
          'owner_chat',
        );

        return {
          success: true,
          response: parsed.confirmationMessage || `✅ Tarefa "${parsed.task.name}" criada com sucesso! Vou executar automaticamente quando as condições forem atendidas.`,
          taskCreated: true,
          taskId: task.id,
        };
      }

      return {
        success: false,
        response: 'Não consegui entender completamente. Pode explicar de outra forma? 🤔',
      };

    } catch (error) {
      this.logger.error(`Error processing task request: ${error.message}`);
      return {
        success: false,
        response: 'Desculpe, tive um problema ao processar seu pedido. Tente novamente! 😅',
      };
    }
  }

  /**
   * Lista tarefas ativas para o dono
   */
  async listTasksForOwner(companyId: string): Promise<string> {
    const tasks = await this.secretaryTasksService.findAll(companyId);

    if (tasks.length === 0) {
      return '📋 Você não tem nenhuma tarefa configurada ainda. Me diga o que quer que eu faça automaticamente!';
    }

    const taskList = tasks.map((t, i) => {
      const status = t.isActive ? '✅' : '⏸️';
      const trigger = this.getTriggerDescription(t);
      return `${i + 1}. ${status} *${t.name}*\n   ${trigger}`;
    }).join('\n\n');

    return `📋 *Suas tarefas:*\n\n${taskList}\n\nPara gerenciar, acesse o painel ou me diga o que quer alterar!`;
  }

  private getTriggerDescription(task: any): string {
    const config = task.triggerConfig || {};
    switch (task.triggerType) {
      case 'time_range':
        return `⏰ Das ${config.startHour}h às ${config.endHour}h`;
      case 'keyword':
        return `🔤 Palavras: ${(config.keywords || []).join(', ')}`;
      case 'first_message':
        return `👤 Primeira mensagem`;
      case 'owner_inactive':
        return `😴 Você inativo por ${config.inactiveMinutes || 30}min`;
      case 'always':
        return `▶️ Sempre ativo`;
      default:
        return '';
    }
  }
}
