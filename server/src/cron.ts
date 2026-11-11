import cron from "node-cron";
import { prisma } from "./db";
import { SessionStatus } from "@prisma/client";

export interface CronRunResult {
  success: boolean;
  timestamp: string;
  dbPingMs: number;
  cleanedVideoSessions: number;
  cleanedTextSessions: number;
  markedOfflineProfiles: number;
  activeOnlineUsers: number;
  error?: string;
}

/**
 * Executes periodic maintenance and keep-alive tasks:
 * 1. Neon Database Keep-Alive (prevents serverless DB sleep / cold starts)
 * 2. Cleans up stale active video/text sessions
 * 3. Marks stale online user profiles as offline
 */
export async function runCronTasks(): Promise<CronRunResult> {
  const start = Date.now();
  let dbPingMs = 0;
  let cleanedVideoSessions = 0;
  let cleanedTextSessions = 0;
  let markedOfflineProfiles = 0;
  let activeOnlineUsers = 0;

  try {
    // 1. Neon DB Keep-Alive ping
    await prisma.$queryRaw`SELECT 1 as ping`;
    dbPingMs = Date.now() - start;

    // 2. Clean up stale sessions (older than 2 hours still marked ACTIVE)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const videoCleanup = await prisma.videoSession.updateMany({
      where: {
        status: SessionStatus.ACTIVE,
        startedAt: { lt: twoHoursAgo },
      },
      data: {
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
      },
    });
    cleanedVideoSessions = videoCleanup.count;

    const textCleanup = await prisma.textSession.updateMany({
      where: {
        status: SessionStatus.ACTIVE,
        startedAt: { lt: twoHoursAgo },
      },
      data: {
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
      },
    });
    cleanedTextSessions = textCleanup.count;

    // 3. Mark inactive online profiles as offline (no activity in 30 mins)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const offlineUpdate = await prisma.profile.updateMany({
      where: {
        isOnline: true,
        lastSeen: { lt: thirtyMinsAgo },
      },
      data: {
        isOnline: false,
      },
    });
    markedOfflineProfiles = offlineUpdate.count;

    // Count currently active online users
    activeOnlineUsers = await prisma.profile.count({
      where: { isOnline: true },
    });

    console.log(
      `[CRON] Keep-alive & maintenance ran successfully at ${new Date().toISOString()} (DB ping: ${dbPingMs}ms, Cleaned sessions: ${cleanedVideoSessions + cleanedTextSessions}, Online: ${activeOnlineUsers})`
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      dbPingMs,
      cleanedVideoSessions,
      cleanedTextSessions,
      markedOfflineProfiles,
      activeOnlineUsers,
    };
  } catch (err: any) {
    console.error("[CRON] Error running maintenance tasks:", err);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      dbPingMs,
      cleanedVideoSessions,
      cleanedTextSessions,
      markedOfflineProfiles,
      activeOnlineUsers,
      error: err?.message || String(err),
    };
  }
}

/**
 * Initializes scheduled cron jobs:
 * Runs every 4 minutes (Neon sleeps at 5 minutes).
 */
export function initCronJobs() {
  console.log("⏰ Initializing Cron Jobs (Every 4 minutes: DB Keep-Alive & Session Cleanup)...");

  // Run once immediately on server startup
  runCronTasks().catch((err) => {
    console.error("[CRON] Initial startup task error:", err);
  });

  // Schedule to run every 4 minutes
  const task = cron.schedule("*/4 * * * *", async () => {
    await runCronTasks();
  });

  return task;
}

