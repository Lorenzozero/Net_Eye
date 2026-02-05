import sqlite3 from 'sqlite3';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

let db: sqlite3.Database;

export const initDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Ensure data directory exists
    const dataDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(config.dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create tables
      db.serialize(() => {
        // Agents table
        db.run(`
          CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            hostname TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            os_type TEXT,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'online',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Devices table
        db.run(`
          CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            mac_address TEXT,
            hostname TEXT,
            manufacturer TEXT,
            device_type TEXT,
            os_detection TEXT,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'online',
            FOREIGN KEY (agent_id) REFERENCES agents(id)
          )
        `);

        // Ports table
        db.run(`
          CREATE TABLE IF NOT EXISTS ports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            port_number INTEGER NOT NULL,
            protocol TEXT NOT NULL,
            state TEXT NOT NULL,
            service_name TEXT,
            service_version TEXT,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES devices(id),
            UNIQUE(device_id, port_number, protocol)
          )
        `);

        // Scans table
        db.run(`
          CREATE TABLE IF NOT EXISTS scans (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            scan_type TEXT NOT NULL,
            target_range TEXT,
            devices_found INTEGER DEFAULT 0,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            status TEXT DEFAULT 'running',
            FOREIGN KEY (agent_id) REFERENCES agents(id)
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✓ Database initialized');
            resolve();
          }
        });
      });
    });
  });
};

export const getDb = (): sqlite3.Database => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

export const query = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

export const run = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const get = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
};
