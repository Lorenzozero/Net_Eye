import { WSMessage, Agent, Device } from '@/types';

type WSCallback = (message: WSMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: Set<WSCallback> = new Set();
  private reconnectTimeout: number = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          this.callbacks.forEach(cb => cb(message));
        } catch (err) {
          console.error('[WebSocket] Invalid message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected, reconnecting...');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectTimeout);
  }

  subscribe(callback: WSCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export const getWebSocketClient = (): WebSocketClient => {
  if (!wsClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
    wsClient = new WebSocketClient(wsUrl);
  }
  return wsClient;
};
