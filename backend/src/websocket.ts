import { WebSocketServer, WebSocket } from 'ws';
import { query } from './db';
import { Device, Agent } from './types';

interface ClientMessage {
  type: string;
  payload?: any;
}

export interface ServerEvent {
  type: 'agent_registered' | 'scan_update' | 'devices_snapshot';
  data: any;
}

const clients = new Set<WebSocket>();

export const setupWebSocket = (wss: WebSocketServer) => {
  wss.on('connection', async (ws: WebSocket) => {
    clients.add(ws);
    console.log('WebSocket client connected, total:', clients.size);

    // On first connection, send snapshot di agent e dispositivi
    try {
      const agents = await query<Agent>('SELECT * FROM agents ORDER BY last_seen DESC');
      const devices = await query<Device>('SELECT * FROM devices ORDER BY last_seen DESC');

      ws.send(JSON.stringify({
        type: 'devices_snapshot',
        data: {
          agents,
          devices,
        },
      } satisfies ServerEvent));
    } catch (err) {
      console.error('Error sending initial snapshot:', err);
    }

    ws.on('message', (message: Buffer) => {
      try {
        const parsed = JSON.parse(message.toString()) as ClientMessage;
        // In futuro: filtrare per agent, subscribe solo a certe reti, ecc.
        console.log('WS message from client:', parsed.type);
      } catch (err) {
        console.error('Invalid WS message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected, total:', clients.size);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      clients.delete(ws);
    });
  });
};

export const broadcastToClients = (event: ServerEvent) => {
  const msg = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(msg);
    }
  }
};
