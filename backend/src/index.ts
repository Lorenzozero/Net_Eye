import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import { config } from './config';
import { initDatabase } from './db';
import { agentRouter } from './routes/agent';
import { deviceRouter } from './routes/device';
import { scanRouter } from './routes/scan';
import { setupWebSocket } from './websocket';
import rateLimit from 'express-rate-limit';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());

// Routes
app.use('/api/agent', agentRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/scans', scanRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database
initDatabase().then(() => {
  const server = app.listen(config.port, () => {
    console.log(`✓ Backend running on port ${config.port}`);
  });

  // Setup WebSocket
  const wss = new WebSocketServer({ server, path: '/ws' });
  setupWebSocket(wss);
  console.log('✓ WebSocket server initialized');
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
