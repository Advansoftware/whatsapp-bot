import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all origins for simplicity in development
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  // Mapeia clientes conectados por companyId
  private clientsByCompany: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Cliente pode enviar companyId na query ou via evento
    const companyId = client.handshake.query.companyId as string;
    if (companyId) {
      this.joinCompanyRoom(client, companyId);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Limpa referências
    this.clientsByCompany.forEach((clients, companyId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.clientsByCompany.delete(companyId);
      }
    });
  }

  /**
   * Cliente entra na sala da empresa para receber notificações
   */
  @SubscribeMessage('join_company')
  handleJoinCompany(client: Socket, companyId: string) {
    this.joinCompanyRoom(client, companyId);
    return { success: true };
  }

  private joinCompanyRoom(client: Socket, companyId: string) {
    client.join(`company:${companyId}`);

    if (!this.clientsByCompany.has(companyId)) {
      this.clientsByCompany.set(companyId, new Set());
    }
    this.clientsByCompany.get(companyId)!.add(client.id);

    this.logger.log(`Client ${client.id} joined company room: ${companyId}`);
  }

  /**
   * Broadcast a new message to all connected clients
   */
  broadcastMessage(message: any) {
    // Route to appropriate event based on message type
    switch (message.type) {
      case 'presence_update':
        this.server.emit('presence_update', message);
        break;
      case 'message_update':
        this.server.emit('message_update', message);
        break;
      case 'connection_update':
        this.server.emit('connection_update', message);
        break;
      case 'qrcode_update':
        this.server.emit('qrcode_update', message);
        break;
      case 'history_sync':
        this.server.emit('history_sync', message);
        break;
      case 'contacts_update':
        this.server.emit('contacts_update', message);
        break;
      default:
        this.server.emit('new_message', message);
    }
  }

  /**
   * Broadcast presence update to all connected clients
   */
  broadcastPresence(presenceData: any) {
    this.server.emit('presence_update', presenceData);
  }

  // ========================================
  // MÉTODOS DE NOTIFICAÇÃO
  // ========================================

  /**
   * Envia notificação para todos os clientes (ou para empresa específica)
   */
  broadcastNotification(notification: any) {
    const companyId = notification.companyId;

    if (companyId) {
      // Envia para sala específica da empresa
      this.server.to(`company:${companyId}`).emit('notification', notification);
    } else {
      // Broadcast global
      this.server.emit('notification', notification);
    }

    this.logger.debug(`Notification broadcast: ${notification.type} - ${notification.title}`);
  }

  /**
   * Envia atualização de contagem de notificações não lidas
   */
  broadcastNotificationCount(companyId: string, count: number) {
    this.server.to(`company:${companyId}`).emit('notification_count', { count });
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): string {
    return 'Hello from server!';
  }
}
