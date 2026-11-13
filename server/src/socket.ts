import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { prisma } from "./db";
import { Gender, SessionType, SessionStatus } from "@prisma/client";

interface QueueUser {
  socketId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  gender: Gender;
  targetGender: Gender;
  type: "video" | "text";
  mode: "random" | "preferred_gender";
  joinedAt: number;
}

interface ActiveSession {
  id: string;
  type: "video" | "text";
  mode: "random" | "preferred_gender";
  targetGender?: Gender;
  user1: QueueUser;
  user2: QueueUser;
  startedAt: number;
  durationSeconds: number;
  timerInterval?: NodeJS.Timeout;
}

const waitingQueues: QueueUser[] = [];
const activeSessions: Map<string, ActiveSession> = new Map();
const socketToSession: Map<string, string> = new Map();
let ioInstance: SocketIOServer | null = null;

export function getLiveOnlineCount(): number {
  return ioInstance ? ioInstance.engine.clientsCount : 0;
}

export function setupSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  ioInstance = io;

  const broadcastLiveCount = () => {
    io.emit("online-count", { count: io.engine.clientsCount });
  };

  // Track online users
  io.on("connection", (socket: Socket) => {
    let currentUserId: string | null = null;

    // Broadcast accurate real-time online count to all clients on connection
    broadcastLiveCount();

    // Client manual request for online count
    socket.on("get-online-count", () => {
      socket.emit("online-count", { count: io.engine.clientsCount });
    });

    socket.on("register-user", async (data: { userId: string }) => {
      currentUserId = data.userId;
      try {
        await prisma.profile.updateMany({
          where: { userId: data.userId },
          data: { isOnline: true, lastSeen: new Date() },
        });
      } catch (e) {
        // ignore
      }
    });

    // Join Matchmaking Queue
    socket.on("join-queue", async (data: {
      userId: string;
      displayName: string;
      avatarUrl?: string;
      gender?: Gender;
      targetGender?: Gender;
      type: "video" | "text";
      mode: "random" | "preferred_gender";
    }) => {
      const { userId, displayName, avatarUrl, type, mode } = data;
      const userGender = (data.gender && Object.values(Gender).includes(data.gender)) ? data.gender : Gender.OTHER;
      const targetGender = (data.targetGender && Object.values(Gender).includes(data.targetGender)) ? data.targetGender : Gender.ANY;

      // Clean up any existing session or queue entry for this socket
      cleanupSocket(socket, io);

      // Verify balance if mode is preferred_gender
      if (mode === "preferred_gender") {
        const usage = await prisma.usageBalance.findUnique({ where: { userId } });
        const available = type === "video"
          ? (usage?.paidVideoSecondsAvailable || 0)
          : (usage?.paidTextSecondsAvailable || 0);

        if (available <= 0) {
          socket.emit("insufficient_balance", {
            type,
            requiredPack: type === "video" ? "VIDEO_PACK_60M" : "TEXT_PACK_180M",
            priceRupees: type === "video" ? 599 : 299,
            message: `Preferred Gender ${type === "video" ? "Video" : "Text"} requires a paid pack. Please recharge to continue.`,
          });
          return;
        }
      }

      const queueEntry: QueueUser = {
        socketId: socket.id,
        userId,
        displayName: displayName || "Anonymous",
        avatarUrl,
        gender: userGender,
        targetGender,
        type,
        mode,
        joinedAt: Date.now(),
      };

      // Clean up disconnected sockets from the queue
      for (let i = waitingQueues.length - 1; i >= 0; i--) {
        if (!io.sockets.sockets.has(waitingQueues[i].socketId)) {
          waitingQueues.splice(i, 1);
        }
      }

      // Try finding an existing human match in queue
      const matchIndex = waitingQueues.findIndex((candidate) => {
        // Cannot match with oneself on the exact same socket connection
        if (candidate.socketId === socket.id) return false;
        // Same medium (video with video, text with text)
        if (candidate.type !== type) return false;

        // Check mode compatibility
        if (mode === "random" && candidate.mode === "random") {
          return true; // Any random user matches
        }

        // If either has gender preference, check reciprocal compatibility
        const myPrefersCandidate = targetGender === Gender.ANY || targetGender === candidate.gender;
        const candidatePrefersMe = candidate.targetGender === Gender.ANY || candidate.targetGender === userGender;

        return myPrefersCandidate && candidatePrefersMe;
      });

      if (matchIndex !== -1) {
        // Found matching peer!
        const peer = waitingQueues.splice(matchIndex, 1)[0];
        createRealSession(io, queueEntry, peer);
      } else {
        // Add to queue
        waitingQueues.push(queueEntry);
        socket.emit("queue-status", { status: "SEARCHING", message: "Searching for compatible match..." });
      }
    });

    // WebRTC Signaling
    socket.on("signal-offer", (payload: { targetSocketId?: string; offer: any }) => {
      const sessionId = socketToSession.get(socket.id);
      if (!sessionId) return;
      const session = activeSessions.get(sessionId);
      if (!session) return;

      socket.to(sessionId).emit("signal-offer", { offer: payload.offer, senderSocketId: socket.id });
    });

    socket.on("signal-answer", (payload: { answer: any }) => {
      const sessionId = socketToSession.get(socket.id);
      if (!sessionId) return;
      socket.to(sessionId).emit("signal-answer", { answer: payload.answer, senderSocketId: socket.id });
    });

    socket.on("signal-ice-candidate", (payload: { candidate: any }) => {
      const sessionId = socketToSession.get(socket.id);
      if (!sessionId) return;
      socket.to(sessionId).emit("signal-ice-candidate", { candidate: payload.candidate, senderSocketId: socket.id });
    });

    // In-Call Messaging (Video sidebar chat & standalone text chat)
    socket.on("send-session-message", (payload: { text: string; senderName?: string }) => {
      const sessionId = socketToSession.get(socket.id);
      if (!sessionId) return;
      const session = activeSessions.get(sessionId);
      if (!session) return;

      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        senderSocketId: socket.id,
        senderUserId: session.user1.socketId === socket.id ? session.user1.userId : session.user2.userId,
        senderName: payload.senderName || "User",
        text: payload.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      // Broadcast to room
      io.to(sessionId).emit("session-message", messageData);
    });

    // Typing Indicator
    socket.on("session-typing", (payload: { isTyping: boolean }) => {
      const sessionId = socketToSession.get(socket.id);
      if (!sessionId) return;
      socket.to(sessionId).emit("session-typing", {
        senderSocketId: socket.id,
        isTyping: payload.isTyping,
      });
    });

    // Next match (skip current peer)
    socket.on("next-match", () => {
      cleanupSocket(socket, io, true);
    });

    // Leave session
    socket.on("leave-session", () => {
      cleanupSocket(socket, io, false);
    });

    // Disconnect
    socket.on("disconnect", async () => {
      cleanupSocket(socket, io, false);
      if (currentUserId) {
        try {
          await prisma.profile.updateMany({
            where: { userId: currentUserId },
            data: { isOnline: false, lastSeen: new Date() },
          });
        } catch (e) {
          // ignore
        }
      }
      broadcastLiveCount();
    });
  });
}

function createRealSession(io: SocketIOServer, user1: QueueUser, user2: QueueUser) {
  const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const s1 = io.sockets.sockets.get(user1.socketId);
  const s2 = io.sockets.sockets.get(user2.socketId);

  if (!s1 || !s2) {
    if (s1) waitingQueues.push(user1);
    if (s2) waitingQueues.push(user2);
    return;
  }

  s1.join(sessionId);
  s2.join(sessionId);

  socketToSession.set(user1.socketId, sessionId);
  socketToSession.set(user2.socketId, sessionId);

  const activeSession: ActiveSession = {
    id: sessionId,
    type: user1.type,
    mode: user1.mode === "preferred_gender" || user2.mode === "preferred_gender" ? "preferred_gender" : "random",
    user1,
    user2,
    startedAt: Date.now(),
    durationSeconds: 0,
  };

  activeSessions.set(sessionId, activeSession);

  const isSelfTab = user1.userId === user2.userId;

  // Notify user 1
  s1.emit("match-found", {
    sessionId,
    isInitiator: true,
    type: user1.type,
    mode: activeSession.mode,
    peer: {
      id: user2.userId,
      socketId: user2.socketId,
      displayName: isSelfTab ? `${user2.displayName} (Tab 2)` : user2.displayName,
      avatarUrl: user2.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user2.displayName}`,
      gender: user2.gender,
      isSelfTab,
    },
  });

  // Notify user 2
  s2.emit("match-found", {
    sessionId,
    isInitiator: false,
    type: user2.type,
    mode: activeSession.mode,
    peer: {
      id: user1.userId,
      socketId: user1.socketId,
      displayName: isSelfTab ? `${user1.displayName} (Tab 1)` : user1.displayName,
      avatarUrl: user1.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user1.displayName}`,
      gender: user1.gender,
      isSelfTab,
    },
  });

  // Start usage heartbeat
  startSessionHeartbeat(io, activeSession);
}

function startSessionHeartbeat(io: SocketIOServer, session: ActiveSession) {
  // Heartbeat every 5 seconds (5s increments)
  session.timerInterval = setInterval(async () => {
    session.durationSeconds += 5;

    // Send duration tick to clients
    io.to(session.id).emit("session-tick", {
      durationSeconds: session.durationSeconds,
    });

    // Server-side deduction per participant
    try {
      const participants = [session.user1, session.user2];
      for (const participant of participants) {
        if (participant.mode === "preferred_gender") {
          const usage = await prisma.usageBalance.findUnique({ where: { userId: participant.userId } });
          if (usage) {
            if (session.type === "video") {
              const updated = Math.max(0, usage.paidVideoSecondsAvailable - 5);
              await prisma.usageBalance.update({
                where: { userId: participant.userId },
                data: { paidVideoSecondsAvailable: updated },
              });
              io.to(participant.socketId).emit("balance-update", {
                paidVideoSecondsAvailable: updated,
              });

              if (updated <= 0) {
                io.to(session.id).emit("out_of_time", {
                  userId: participant.userId,
                  message: "Your Preferred Gender Video minutes have expired. Please recharge to continue.",
                });
                cleanupSession(io, session.id);
                return;
              }
            } else {
              const updated = Math.max(0, usage.paidTextSecondsAvailable - 5);
              await prisma.usageBalance.update({
                where: { userId: participant.userId },
                data: { paidTextSecondsAvailable: updated },
              });
              io.to(participant.socketId).emit("balance-update", {
                paidTextSecondsAvailable: updated,
              });

              if (updated <= 0) {
                io.to(session.id).emit("out_of_time", {
                  userId: participant.userId,
                  message: "Your Preferred Gender Text minutes have expired. Please recharge to continue.",
                });
                cleanupSession(io, session.id);
                return;
              }
            }
          }
        } else {
          // Free random trial tracking
          const trial = await prisma.trialEntitlement.findUnique({ where: { userId: participant.userId } });
          if (trial) {
            if (session.type === "video") {
              const updated = trial.videoTrialUsedSeconds + 5;
              await prisma.trialEntitlement.update({
                where: { userId: participant.userId },
                data: { videoTrialUsedSeconds: updated },
              });
              io.to(participant.socketId).emit("trial-update", {
                videoTrialUsedSeconds: updated,
                videoTrialTotalMinutes: trial.videoTrialTotalMinutes,
              });
            } else {
              const updated = trial.textTrialUsedSeconds + 5;
              await prisma.trialEntitlement.update({
                where: { userId: participant.userId },
                data: { textTrialUsedSeconds: updated },
              });
              io.to(participant.socketId).emit("trial-update", {
                textTrialUsedSeconds: updated,
                textTrialTotalMinutes: trial.textTrialTotalMinutes,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Heartbeat error:", err);
    }
  }, 5000);
}

function cleanupSocket(socket: Socket, io: SocketIOServer, nextMatch: boolean = false) {
  // Remove from waiting queue if present
  const qIdx = waitingQueues.findIndex((q) => q.socketId === socket.id);
  if (qIdx !== -1) {
    waitingQueues.splice(qIdx, 1);
  }

  // Check active sessions
  const sessionId = socketToSession.get(socket.id);
  if (sessionId) {
    cleanupSession(io, sessionId, socket.id);
    socketToSession.delete(socket.id);
  }
}

function cleanupSession(io: SocketIOServer, sessionId: string, disconnectedSocketId?: string) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  if (session.timerInterval) {
    clearInterval(session.timerInterval);
  }

  // Notify other peer
  io.to(sessionId).emit("peer-disconnected", {
    reason: "Peer skipped or disconnected",
  });

  // Record session in database
  const u2Id = session.user2.userId;
  if (session.type === "video") {
    prisma.videoSession.create({
      data: {
        sessionType: session.mode === "preferred_gender" ? SessionType.PREFERRED_GENDER : SessionType.RANDOM,
        user1Id: session.user1.userId,
        user2Id: u2Id,
        durationSeconds: session.durationSeconds,
        status: SessionStatus.COMPLETED,
      },
    }).catch(() => {});
  } else {
    prisma.textSession.create({
      data: {
        sessionType: session.mode === "preferred_gender" ? SessionType.PREFERRED_GENDER : SessionType.RANDOM,
        user1Id: session.user1.userId,
        user2Id: u2Id,
        durationSeconds: session.durationSeconds,
        status: SessionStatus.COMPLETED,
      },
    }).catch(() => {});
  }

  socketToSession.delete(session.user1.socketId);
  socketToSession.delete(session.user2.socketId);

  activeSessions.delete(sessionId);
}

