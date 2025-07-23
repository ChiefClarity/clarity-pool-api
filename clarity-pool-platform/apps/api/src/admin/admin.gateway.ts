import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminNotification } from './interfaces/admin-reports.interface';

interface AdminClient {
  id: string;
  email: string;
  connectedAt: Date;
}

@WebSocketGateway({
  namespace: 'admin',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class AdminGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminGateway.name);
  private adminClients: Map<string, AdminClient> = new Map();
  private adminEmails: string[];

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Load admin emails from config
    const adminEmailsConfig = this.configService.get<string>('ADMIN_EMAILS', '');
    this.adminEmails = adminEmailsConfig
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);
    
    const defaultAdminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (defaultAdminEmail && !this.adminEmails.includes(defaultAdminEmail.toLowerCase())) {
      this.adminEmails.push(defaultAdminEmail.toLowerCase());
    }
  }

  afterInit(server: Server) {
    this.logger.log('Admin WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from query or auth header
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        this.logger.warn(`Connection attempt without token from ${client.id}`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userEmail = payload.email?.toLowerCase();
      if (!userEmail || !this.adminEmails.includes(userEmail)) {
        this.logger.warn(`Non-admin connection attempt from ${userEmail}`);
        client.disconnect();
        return;
      }

      // Store admin client
      this.adminClients.set(client.id, {
        id: client.id,
        email: userEmail,
        connectedAt: new Date(),
      });

      // Join admin room
      client.join('admin-room');

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to admin gateway',
        connectedAdmins: this.adminClients.size,
      });

      this.logger.log(`Admin connected: ${userEmail} (${client.id})`);

      // Notify other admins
      this.broadcastToAdmins('admin-joined', {
        email: userEmail,
        connectedAt: new Date(),
      }, client.id);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const adminClient = this.adminClients.get(client.id);
    if (adminClient) {
      this.adminClients.delete(client.id);
      this.logger.log(`Admin disconnected: ${adminClient.email} (${client.id})`);
      
      // Notify other admins
      this.broadcastToAdmins('admin-left', {
        email: adminClient.email,
        disconnectedAt: new Date(),
      });
    }
  }

  @SubscribeMessage('report-status')
  handleReportStatus(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const adminClient = this.adminClients.get(client.id);
    if (!adminClient) {
      return { error: 'Unauthorized' };
    }

    // Broadcast report status to all admins
    this.broadcastToAdmins('report-status-update', {
      ...data,
      updatedBy: adminClient.email,
      timestamp: new Date(),
    });

    return { success: true };
  }

  @SubscribeMessage('get-connected-admins')
  handleGetConnectedAdmins(@ConnectedSocket() client: Socket) {
    const adminClient = this.adminClients.get(client.id);
    if (!adminClient) {
      return { error: 'Unauthorized' };
    }

    const connectedAdmins = Array.from(this.adminClients.values()).map(admin => ({
      email: admin.email,
      connectedAt: admin.connectedAt,
    }));

    return { admins: connectedAdmins };
  }

  /**
   * Send notification to all connected admins
   */
  sendAdminNotification(notification: AdminNotification) {
    this.server.to('admin-room').emit('notification', notification);
    this.logger.log(`Sent notification to ${this.adminClients.size} admins: ${notification.type}`);
  }

  /**
   * Send report generation progress to admins
   */
  sendReportProgress(data: {
    status: string;
    progress: number;
    currentRecipient?: string;
    totalRecipients?: number;
    errors?: string[];
  }) {
    this.server.to('admin-room').emit('report-progress', {
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Send bulk operation status
   */
  sendBulkOperationStatus(data: {
    operation: string;
    status: string;
    progress: number;
    details?: any;
  }) {
    this.server.to('admin-room').emit('bulk-operation-status', {
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast message to all admins except sender
   */
  private broadcastToAdmins(event: string, data: any, excludeClientId?: string) {
    this.adminClients.forEach((admin, clientId) => {
      if (clientId !== excludeClientId) {
        this.server.to(clientId).emit(event, data);
      }
    });
  }

  /**
   * Get count of connected admins
   */
  getConnectedAdminCount(): number {
    return this.adminClients.size;
  }

  /**
   * Check if a specific admin is connected
   */
  isAdminConnected(email: string): boolean {
    return Array.from(this.adminClients.values()).some(
      admin => admin.email === email.toLowerCase()
    );
  }
}