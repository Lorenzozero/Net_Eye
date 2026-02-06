import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3001),
  dbPath: process.env.DB_PATH || "./data/neteye.db",
  agentSecret: process.env.AGENT_SECRET || "",
  nodeEnv: process.env.NODE_ENV || "development",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};

if (!config.agentSecret || config.agentSecret === "your_secret_here_CHANGE_THIS") {
  const msg = "[Security] AGENT_SECRET non impostato o valore di default.";
  if (config.nodeEnv === "production") {
    throw new Error(msg);
  } else {
    console.warn(msg, "Continuo solo perché non siamo in production.");
  }
}
