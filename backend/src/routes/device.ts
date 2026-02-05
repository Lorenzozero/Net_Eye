import express from 'express';
import { query, get } from '../db';
import { Device, Port } from '../types';

export const deviceRouter = express.Router();

// Get all devices
deviceRouter.get('/', async (req, res) => {
  try {
    const devices = await query<Device>(
      'SELECT * FROM devices ORDER BY last_seen DESC'
    );

    // Fetch ports for each device
    for (const device of devices) {
      const ports = await query<Port>(
        'SELECT * FROM ports WHERE device_id = ? ORDER BY port_number',
        [device.id]
      );
      device.ports = ports;
    }

    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get device by ID
deviceRouter.get('/:id', async (req, res) => {
  try {
    const device = await get<Device>(
      'SELECT * FROM devices WHERE id = ?',
      [req.params.id]
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Fetch ports
    const ports = await query<Port>(
      'SELECT * FROM ports WHERE device_id = ? ORDER BY port_number',
      [device.id]
    );
    device.ports = ports;

    res.json(device);
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get devices by agent
deviceRouter.get('/agent/:agentId', async (req, res) => {
  try {
    const devices = await query<Device>(
      'SELECT * FROM devices WHERE agent_id = ? ORDER BY last_seen DESC',
      [req.params.agentId]
    );

    for (const device of devices) {
      const ports = await query<Port>(
        'SELECT * FROM ports WHERE device_id = ? ORDER BY port_number',
        [device.id]
      );
      device.ports = ports;
    }

    res.json(devices);
  } catch (error) {
    console.error('Get devices by agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
