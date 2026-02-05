import express from 'express';
import { query } from '../db';
import { Scan } from '../types';

export const scanRouter = express.Router();

// Get all scans
scanRouter.get('/', async (req, res) => {
  try {
    const scans = await query<Scan>(
      'SELECT * FROM scans ORDER BY started_at DESC LIMIT 100'
    );
    res.json(scans);
  } catch (error) {
    console.error('Get scans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get scans by agent
scanRouter.get('/agent/:agentId', async (req, res) => {
  try {
    const scans = await query<Scan>(
      'SELECT * FROM scans WHERE agent_id = ? ORDER BY started_at DESC',
      [req.params.agentId]
    );
    res.json(scans);
  } catch (error) {
    console.error('Get scans by agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
