import express from "express";
import cors from "cors";
import http from "http";
import { setupWebSocket, getWebSocketServer } from "./websocket";
import { initDb, getDb } from "./db";
import { config } from "./config";
import agentRoutes from "./routes/agent";
import deviceRoutes from "./routes/devices";
import scanRoutes from "./routes/scans";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (!config.allowedOrigins.length) {
        return callback(null, false);
      }

      if (config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("[CORS] Origin non autorizzato:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use("/api/agent", agentRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/scans", scanRoutes);

app.get("/health", async (_req, res) => {
  try {
    const db = await getDb();
    await db.get("SELECT 1");

    const wss = getWebSocketServer?.();
    const wsOk = !!wss;

    res.json({
      status: "ok",
      db: "ok",
      websocket: wsOk ? "ok" : "not_initialized",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Health] check failed:", err);
    res.status(500).json({
      status: "error",
      error: "Health check failed",
    });
  }
});

const server = http.createServer(app);

initDb().then(() => {
  setupWebSocket(server);

  server.listen(config.port, () => {
    console.log(`Backend in ascolto sulla porta ${config.port}`);
  });
});
