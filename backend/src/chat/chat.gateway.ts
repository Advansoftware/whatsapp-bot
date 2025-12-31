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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): string {
    return 'Hello from server!';
  }
}
