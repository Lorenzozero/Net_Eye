import express from 'express';
import { query, get, run } from '../db';
import { Device, Port } from '../types';
import { identifyDeviceWithGemini } from '../services/gemini';

export const deviceRouter = express.Router();

// Get all devices with optional filters
deviceRouter.get('/', async (req, res) => {
  try {
    const { status, search, agent_id } = req.query;
    
    let sql = 'SELECT * FROM devices WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (agent_id) {
      sql += ' AND agent_id = ?';
      params.push(agent_id);
    }

    if (search) {
      sql += ' AND (ip_address LIKE ? OR hostname LIKE ? OR mac_address LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ' ORDER BY last_seen DESC';

    const devices = await query<Device>(sql, params);

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

// Identify device with Gemini AI
deviceRouter.post('/:id/identify', async (req, res) => {
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

    // Identify with Gemini
    const identification = await identifyDeviceWithGemini(device);

    if (!identification) {
      return res.status(503).json({ error: 'AI identification service unavailable' });
    }

    // Update device with identification
    await run(
      `UPDATE devices SET 
        device_type = ?,
        manufacturer = ?,
        os_detection = ?
      WHERE id = ?`,
      [
        identification.device_category || device.device_type,
        identification.device_brand || device.manufacturer,
        identification.device_model || device.os_detection,
        device.id
      ]
    );

    res.json({
      success: true,
      identification,
      device_id: device.id
    });
  } catch (error) {
    console.error('Identify device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch identify all unknown devices
deviceRouter.post('/identify/batch', async (req, res) => {
  try {
    // Get devices without proper identification
    const devices = await query<Device>(
      `SELECT * FROM devices 
       WHERE device_type IS NULL 
       OR manufacturer IS NULL 
       OR manufacturer = 'Unknown'
       ORDER BY last_seen DESC
       LIMIT 20`
    );

    if (devices.length === 0) {
      return res.json({ success: true, identified: 0, message: 'No devices to identify' });
    }

    // Fetch ports for each device
    for (const device of devices) {
      const ports = await query<Port>(
        'SELECT * FROM ports WHERE device_id = ? ORDER BY port_number',
        [device.id]
      );
      device.ports = ports;
    }

    let identified = 0;
    for (const device of devices) {
      const identification = await identifyDeviceWithGemini(device);
      
      if (identification && identification.confidence > 0.5) {
        await run(
          `UPDATE devices SET 
            device_type = ?,
            manufacturer = ?,
            os_detection = ?
          WHERE id = ?`,
          [
            identification.device_category,
            identification.device_brand,
            identification.device_model,
            device.id
          ]
        );
        identified++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      total: devices.length,
      identified,
      message: `Identified ${identified} out of ${devices.length} devices`
    });
  } catch (error) {
    console.error('Batch identify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
