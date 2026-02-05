import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, run, get } from '../db';
import { Agent, AgentScanData, Device } from '../types';
import { broadcastToClients } from '../websocket';
import { config } from '../config';

export const agentRouter = express.Router();

// Middleware to verify agent secret
const verifyAgent = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const secret = req.headers['x-agent-secret'];
  if (secret !== config.agentSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Register/Update agent
agentRouter.post('/register', verifyAgent, async (req, res) => {
  try {
    const { hostname, ip_address, os_type } = req.body;

    if (!hostname || !ip_address) {
      return res.status(400).json({ error: 'hostname and ip_address required' });
    }

    // Check if agent exists
    const existing = await get<Agent>(
      'SELECT * FROM agents WHERE hostname = ? AND ip_address = ?',
      [hostname, ip_address]
    );

    let agentId: string;

    if (existing) {
      agentId = existing.id;
      await run(
        'UPDATE agents SET last_seen = CURRENT_TIMESTAMP, status = ?, os_type = ? WHERE id = ?',
        ['online', os_type || existing.os_type, agentId]
      );
    } else {
      agentId = uuidv4();
      await run(
        'INSERT INTO agents (id, hostname, ip_address, os_type, status) VALUES (?, ?, ?, ?, ?)',
        [agentId, hostname, ip_address, os_type, 'online']
      );
    }

    const agent = await get<Agent>('SELECT * FROM agents WHERE id = ?', [agentId]);
    
    broadcastToClients({ type: 'agent_registered', data: agent });

    res.json({ success: true, agent_id: agentId, agent });
  } catch (error) {
    console.error('Agent registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit scan data
agentRouter.post('/scan', verifyAgent, async (req, res) => {
  try {
    const { agent_id, devices } = req.body as AgentScanData;

    if (!agent_id || !devices) {
      return res.status(400).json({ error: 'agent_id and devices required' });
    }

    // Verify agent exists
    const agent = await get<Agent>('SELECT * FROM agents WHERE id = ?', [agent_id]);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Process each device
    for (const device of devices) {
      const deviceId = uuidv4();
      
      // Check if device exists
      const existing = await get<Device>(
        'SELECT * FROM devices WHERE ip_address = ? AND agent_id = ?',
        [device.ip_address, agent_id]
      );

      if (existing) {
        // Update existing device
        await run(
          `UPDATE devices SET 
            mac_address = ?,
            hostname = ?,
            manufacturer = ?,
            device_type = ?,
            os_detection = ?,
            last_seen = CURRENT_TIMESTAMP,
            status = 'online'
          WHERE id = ?`,
          [
            device.mac_address || existing.mac_address,
            device.hostname || existing.hostname,
            device.manufacturer || existing.manufacturer,
            device.device_type || existing.device_type,
            device.os_detection || existing.os_detection,
            existing.id
          ]
        );

        // Update ports if provided
        if (device.ports && device.ports.length > 0) {
          for (const port of device.ports) {
            await run(
              `INSERT OR REPLACE INTO ports 
                (device_id, port_number, protocol, state, service_name, service_version, last_seen)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                existing.id,
                port.port_number,
                port.protocol,
                port.state,
                port.service_name,
                port.service_version
              ]
            );
          }
        }
      } else {
        // Insert new device
        await run(
          `INSERT INTO devices 
            (id, agent_id, ip_address, mac_address, hostname, manufacturer, device_type, os_detection, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online')`,
          [
            deviceId,
            agent_id,
            device.ip_address,
            device.mac_address,
            device.hostname,
            device.manufacturer,
            device.device_type,
            device.os_detection
          ]
        );

        // Insert ports if provided
        if (device.ports && device.ports.length > 0) {
          for (const port of device.ports) {
            await run(
              `INSERT INTO ports 
                (device_id, port_number, protocol, state, service_name, service_version)
              VALUES (?, ?, ?, ?, ?, ?)`,
              [
                deviceId,
                port.port_number,
                port.protocol,
                port.state,
                port.service_name,
                port.service_version
              ]
            );
          }
        }
      }
    }

    // Update agent last seen
    await run(
      'UPDATE agents SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [agent_id]
    );

    // Broadcast update to connected clients
    broadcastToClients({ 
      type: 'scan_update', 
      data: { agent_id, devices_count: devices.length } 
    });

    res.json({ success: true, devices_processed: devices.length });
  } catch (error) {
    console.error('Scan submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Heartbeat endpoint
agentRouter.post('/heartbeat', verifyAgent, async (req, res) => {
  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id required' });
    }

    await run(
      'UPDATE agents SET last_seen = CURRENT_TIMESTAMP, status = ? WHERE id = ?',
      ['online', agent_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all agents
agentRouter.get('/', async (req, res) => {
  try {
    const agents = await query<Agent>('SELECT * FROM agents ORDER BY last_seen DESC');
    res.json(agents);
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
