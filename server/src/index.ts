import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth.routes";
import datingRoutes from "./routes/dating.routes";
import messagesRoutes from "./routes/messages.routes";
import paymentsRoutes from "./routes/payments.routes";
import safetyRoutes from "./routes/safety.routes";
import adminRoutes from "./routes/admin.routes";
import cronRoutes from "./routes/cron.routes";
import { setupSocketServer } from "./socket";
import { initCronJobs } from "./cron";

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// App routes
app.use("/api/auth", authRoutes);
app.use("/api/dating", datingRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/safety", safetyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cron", cronRoutes);

// Setup Socket.IO
setupSocketServer(server);

// Initialize scheduled maintenance and DB keep-alive cron jobs
initCronJobs();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Omegle Core Server running on http://localhost:${PORT}`);
});

