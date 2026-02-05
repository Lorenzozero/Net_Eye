import { WebSocketServer, WebSocket } from 'ws';

const clients = new Set<WebSocket>();

export const setupWebSocket = (wss: WebSocketServer) => {
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket client connected');
    clients.add(ws);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Echo back for now, can add specific handlers
        ws.send(JSON.stringify({ type: 'ack', data }));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    // Send initial connection success
    ws.send(JSON.stringify({ 
      type: 'connected', 
      timestamp: new Date().toISOString() 
    }));
  });
};

export const broadcastToClients = (message: any) => {
  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

export const getConnectedClientsCount = (): number => {
  return clients.size;
};
