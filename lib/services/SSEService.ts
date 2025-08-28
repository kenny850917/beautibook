/**
 * Singleton service for Server-Sent Events (SSE)
 * Handles real-time updates for booking status, availability changes
 */
export class SSEService {
  private static instance: SSEService;
  private connections: Map<string, Response> = new Map();
  private eventStream: EventTarget;

  private constructor() {
    this.eventStream = new EventTarget();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SSEService {
    if (!SSEService.instance) {
      SSEService.instance = new SSEService();
    }
    return SSEService.instance;
  }

  /**
   * Add a new SSE connection
   */
  addConnection(connectionId: string, response: Response): void {
    this.connections.set(connectionId, response);
    console.log(`🔌 SSE connection added: ${connectionId}`);

    // Send initial connection event
    this.sendToConnection(connectionId, {
      type: "connected",
      data: { connectionId, timestamp: new Date().toISOString() },
    });
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
    console.log(`🔌 SSE connection removed: ${connectionId}`);
  }

  /**
   * Send event to a specific connection
   */
  private sendToConnection(connectionId: string, event: SSEEvent): void {
    const response = this.connections.get(connectionId);
    if (!response) return;

    try {
      const eventData = this.formatSSEEvent(event);
      // Note: In a real implementation, you'd write to the response stream
      console.log(`📡 Sending SSE event to ${connectionId}:`, eventData);
    } catch (error) {
      console.error(`❌ Failed to send SSE event to ${connectionId}:`, error);
      this.removeConnection(connectionId);
    }
  }

  /**
   * Broadcast event to all connections
   */
  broadcast(event: SSEEvent): void {
    console.log(
      `📡 Broadcasting SSE event to ${this.connections.size} connections:`,
      event
    );

    for (const [connectionId] of this.connections) {
      this.sendToConnection(connectionId, event);
    }
  }

  /**
   * Broadcast event to specific connection types
   */
  broadcastToType(
    event: SSEEvent,
    connectionType: "admin" | "staff" | "customer"
  ): void {
    // In a real implementation, you'd track connection types
    console.log(
      `📡 Broadcasting SSE event to ${connectionType} connections:`,
      event
    );
    this.broadcast(event);
  }

  /**
   * Notify about new booking
   */
  notifyBookingCreated(booking: {
    id: string;
    staff_id: string;
    service_id: string;
    slot_datetime: Date;
    customer_name: string;
  }): void {
    const event: SSEEvent = {
      type: "booking_created",
      data: {
        bookingId: booking.id,
        staffId: booking.staff_id,
        serviceId: booking.service_id,
        slotDateTime: booking.slot_datetime.toISOString(),
        customerName: booking.customer_name,
        timestamp: new Date().toISOString(),
      },
    };

    this.broadcast(event);
  }

  /**
   * Notify about booking cancellation
   */
  notifyBookingCancelled(booking: {
    id: string;
    staff_id: string;
    service_id: string;
    slot_datetime: Date;
  }): void {
    const event: SSEEvent = {
      type: "booking_cancelled",
      data: {
        bookingId: booking.id,
        staffId: booking.staff_id,
        serviceId: booking.service_id,
        slotDateTime: booking.slot_datetime.toISOString(),
        timestamp: new Date().toISOString(),
      },
    };

    this.broadcast(event);
  }

  /**
   * Notify about availability change
   */
  notifyAvailabilityChanged(staffId: string, date: string): void {
    const event: SSEEvent = {
      type: "availability_changed",
      data: {
        staffId,
        date,
        timestamp: new Date().toISOString(),
      },
    };

    this.broadcast(event);
  }

  /**
   * Notify about booking hold created
   */
  notifyHoldCreated(hold: {
    id: string;
    session_id: string;
    staff_id: string;
    service_id: string;
    slot_datetime: Date;
    expires_at: Date;
  }): void {
    const event: SSEEvent = {
      type: "hold_created",
      data: {
        holdId: hold.id,
        sessionId: hold.session_id,
        staffId: hold.staff_id,
        serviceId: hold.service_id,
        slotDateTime: hold.slot_datetime.toISOString(),
        expiresAt: hold.expires_at.toISOString(),
        timestamp: new Date().toISOString(),
      },
    };

    this.broadcast(event);
  }

  /**
   * Notify about booking hold expired
   */
  notifyHoldExpired(holdId: string, staffId: string, slotDateTime: Date): void {
    const event: SSEEvent = {
      type: "hold_expired",
      data: {
        holdId,
        staffId,
        slotDateTime: slotDateTime.toISOString(),
        timestamp: new Date().toISOString(),
      },
    };

    this.broadcast(event);
  }

  /**
   * Notify about staff schedule update
   */
  notifyScheduleUpdated(
    staffId: string,
    changes: {
      dayOfWeek?: string;
      startTime?: string;
      endTime?: string;
      overrideDate?: string;
    }
  ): void {
    const event: SSEEvent = {
      type: "schedule_updated",
      data: {
        staffId,
        changes,
        timestamp: new Date().toISOString(),
      },
    };

    this.broadcast(event);
  }

  /**
   * Send heartbeat to all connections
   */
  sendHeartbeat(): void {
    const event: SSEEvent = {
      type: "heartbeat",
      data: {
        timestamp: new Date().toISOString(),
        activeConnections: this.connections.size,
      },
    };

    this.broadcast(event);
  }

  /**
   * Start heartbeat interval (every 30 seconds)
   */
  startHeartbeat(): void {
    setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  /**
   * Format event for SSE protocol
   */
  private formatSSEEvent(event: SSEEvent): string {
    let formattedEvent = "";

    if (event.id) {
      formattedEvent += `id: ${event.id}\n`;
    }

    formattedEvent += `event: ${event.type}\n`;
    formattedEvent += `data: ${JSON.stringify(event.data)}\n\n`;

    return formattedEvent;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    activeConnections: number;
    connectionIds: string[];
  } {
    return {
      activeConnections: this.connections.size,
      connectionIds: Array.from(this.connections.keys()),
    };
  }

  /**
   * Clean up expired connections
   */
  cleanup(): void {
    const toRemove: string[] = [];

    for (const [connectionId, response] of this.connections) {
      // In a real implementation, you'd check if the response stream is still active
      try {
        // Test if connection is still alive
        if (!response) {
          toRemove.push(connectionId);
        }
      } catch (error) {
        toRemove.push(connectionId);
      }
    }

    toRemove.forEach((id) => this.removeConnection(id));

    if (toRemove.length > 0) {
      console.log(`🧹 Cleaned up ${toRemove.length} expired SSE connections`);
    }
  }

  /**
   * Start cleanup interval (every 5 minutes)
   */
  startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
}

/**
 * SSE Event interface
 */
interface SSEEvent {
  id?: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * Export singleton instance for easy import
 */
export const sseService = SSEService.getInstance();
