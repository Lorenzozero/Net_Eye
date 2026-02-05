import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, '../data/neteye.db'),
  agentSecret: process.env.AGENT_SECRET || 'default_secret_change_me',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
};
