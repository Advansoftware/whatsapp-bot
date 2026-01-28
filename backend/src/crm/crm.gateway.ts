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
    origin: '*',
  },
  namespace: 'crm'
})
export class CrmGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(CrmGateway.name);

  handleConnection(client: Socket) {
    // Client connect logic
  }

  handleDisconnect(client: Socket) {
    // Client disconnect logic
  }

  @SubscribeMessage('join_pipeline')
  handleJoinPipeline(client: Socket, pipelineId: string) {
    client.join(`pipeline:${pipelineId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_pipeline')
  handleLeavePipeline(client: Socket, pipelineId: string) {
    client.leave(`pipeline:${pipelineId}`);
    return { success: true };
  }

  // Called by Service/Controller to notify changes
  broadcastDealMoved(pipelineId: string, deal: any) {
    this.server.to(`pipeline:${pipelineId}`).emit('deal_moved', deal);
  }

  broadcastDealUpdated(pipelineId: string, deal: any) {
    this.server.to(`pipeline:${pipelineId}`).emit('deal_updated', deal);
  }

  broadcastStageUpdated(pipelineId: string, stage: any) {
    this.server.to(`pipeline:${pipelineId}`).emit('stage_updated', stage);
  }
}
