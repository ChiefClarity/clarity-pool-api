import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as Sentry from '@sentry/node';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: [
      process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3001',
      process.env.TECH_APP_URL || 'http://localhost:3002',
      process.env.CUSTOMER_APP_URL || 'http://localhost:3003',
    ],
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
@Injectable()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private readonly connections = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Verify JWT token
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted to connect without token`);
        client.disconnect();
        return;
      }

      let user;
      try {
        user = await this.jwtService.verify(token);
      } catch (error) {
        this.logger.warn(`Client ${client.id} provided invalid token`);
        client.disconnect();
        return;
      }

      // Store connection with user data
      const authenticatedClient = client as AuthenticatedSocket;
      authenticatedClient.data = { user };
      this.connections.set(client.id, authenticatedClient);

      // Join appropriate rooms based on user role
      client.join(`user:${user.id}`);
      client.join(`role:${user.role}`);

      // Join organization room if applicable
      if (user.organizationId) {
        client.join(`org:${user.organizationId}`);
      }

      this.logger.log(`Client connected: ${client.id} (${user.email}) with role: ${user.role}`);

      // Send connection acknowledgment
      client.emit('connected', {
        connectionId: client.id,
        userId: user.id,
        role: user.role,
        timestamp: new Date().toISOString(),
      });

      // Track connection metrics
      Sentry.metrics.increment('websocket.connections', 1, {
        tags: { role: user.role },
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      Sentry.captureException(error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const authenticatedClient = this.connections.get(client.id);
    
    if (authenticatedClient?.data?.user) {
      this.logger.log(`Client disconnected: ${client.id} (${authenticatedClient.data.user.email})`);
      
      // Track disconnection metrics
      Sentry.metrics.increment('websocket.disconnections', 1, {
        tags: { role: authenticatedClient.data.user.role },
      });
    }
    
    this.connections.delete(client.id);
  }

  @SubscribeMessage('subscribe-bookings')
  handleSubscribeBookings(@ConnectedSocket() client: AuthenticatedSocket) {
    // Only CSM and Admin roles can subscribe to booking updates
    if (!['CSM', 'ADMIN'].includes(client.data.user.role)) {
      client.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Insufficient permissions to subscribe to bookings',
      });
      return;
    }

    client.join('booking-updates');
    client.emit('subscribed', { channel: 'booking-updates' });
    
    this.logger.log(`User ${client.data.user.email} subscribed to booking updates`);
  }

  @SubscribeMessage('subscribe-technician-updates')
  handleSubscribeTechnicianUpdates(@ConnectedSocket() client: AuthenticatedSocket) {
    // Technicians can only subscribe to their own updates
    if (client.data.user.role === 'TECHNICIAN') {
      client.join(`technician:${client.data.user.id}`);
      client.emit('subscribed', { channel: 'technician-updates' });
    }
  }

  // Business logic notifications - Called from services

  notifyNewBooking(booking: any) {
    const notification = {
      type: 'NEW_BOOKING',
      data: booking,
      timestamp: new Date().toISOString(),
      priority: booking.urgent ? 'high' : 'normal',
    };

    // Notify all CSMs
    this.server.to('role:CSM').emit('booking:new', notification);
    
    // Notify admins
    this.server.to('role:ADMIN').emit('booking:new', notification);

    // Log metric
    Sentry.metrics.increment('bookings.new');
    
    this.logger.log(`New booking notification sent: ${booking.id}`);
  }

  notifyBookingAssigned(bookingId: string, assignment: any) {
    const notification = {
      type: 'BOOKING_ASSIGNED',
      data: { bookingId, ...assignment },
      timestamp: new Date().toISOString(),
    };

    // Notify CSMs and Admins
    this.server.to('role:CSM').emit('booking:assigned', notification);
    this.server.to('role:ADMIN').emit('booking:assigned', notification);

    // Notify assigned technician with specific details
    const techNotification = {
      type: 'NEW_ASSIGNMENT',
      data: { 
        bookingId, 
        scheduledDate: assignment.scheduledDate,
        customerName: assignment.customerName,
        address: assignment.address,
      },
      timestamp: new Date().toISOString(),
    };
    
    this.server.to(`user:${assignment.technicianId}`).emit('assignment:new', techNotification);

    // Log metrics
    Sentry.metrics.increment('bookings.assigned');
    
    this.logger.log(`Booking ${bookingId} assigned to technician ${assignment.technicianId}`);
  }

  notifyBookingCompleted(bookingId: string, completionData: any) {
    const notification = {
      type: 'BOOKING_COMPLETED',
      data: { bookingId, ...completionData },
      timestamp: new Date().toISOString(),
    };

    // Notify relevant parties
    this.server.to('booking-updates').emit('booking:completed', notification);
    
    // Log metric
    Sentry.metrics.increment('bookings.completed');
  }

  notifyRouteUpdate(technicianId: string, routeData: any) {
    const notification = {
      type: 'ROUTE_UPDATED',
      data: routeData,
      timestamp: new Date().toISOString(),
    };

    // Notify specific technician
    this.server.to(`user:${technicianId}`).emit('route:updated', notification);
    
    // Notify CSMs for monitoring
    this.server.to('role:CSM').emit('route:updated', {
      ...notification,
      technicianId,
    });
  }

  // Broadcast to specific rooms/users
  broadcastToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connection statistics
  getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      byRole: {} as Record<string, number>,
    };

    this.connections.forEach((client) => {
      const role = client.data.user.role;
      stats.byRole[role] = (stats.byRole[role] || 0) + 1;
    });

    return stats;
  }
}