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
    // Check if it's a presence update
    if (message.type === 'presence_update') {
      this.server.emit('presence_update', message);
    } else {
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
