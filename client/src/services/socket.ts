import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.connect();
  }

  private connect() {
    const url = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:5000';

    this.socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Reconnected to server after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔌 Reconnection attempt', attemptNumber);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to server after', this.maxReconnectAttempts, 'attempts');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });
  }

  // Connection management
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  // Monitoring-specific methods
  joinMonitoringSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('join-monitoring', { sessionId });
    }
  }

  // Event listeners
  onProductAvailable(callback: (data: SocketEvents['product-available']) => void) {
    if (this.socket) {
      this.socket.on('product-available', callback);
    }
  }

  onAvailabilityAlert(callback: (data: SocketEvents['availability-alert']) => void) {
    if (this.socket) {
      this.socket.on('availability-alert', callback);
    }
  }

  onCheckCompleted(callback: (data: SocketEvents['check-completed']) => void) {
    if (this.socket) {
      this.socket.on('check-completed', callback);
    }
  }

  // Remove event listeners
  offProductAvailable(callback?: (data: SocketEvents['product-available']) => void) {
    if (this.socket) {
      this.socket.off('product-available', callback);
    }
  }

  offAvailabilityAlert(callback?: (data: SocketEvents['availability-alert']) => void) {
    if (this.socket) {
      this.socket.off('availability-alert', callback);
    }
  }

  offCheckCompleted(callback?: (data: SocketEvents['check-completed']) => void) {
    if (this.socket) {
      this.socket.off('check-completed', callback);
    }
  }

  // Utility methods
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
