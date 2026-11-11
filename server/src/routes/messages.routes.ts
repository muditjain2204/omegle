import { Router, Response } from "express";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../auth";
import { RequestStatus } from "@prisma/client";

const router = Router();

// Get incoming and outgoing message requests
router.get("/requests", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const incoming = await prisma.messageRequest.findMany({
      where: { receiverId: userId, status: RequestStatus.PENDING },
      include: {
        sender: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const sent = await prisma.messageRequest.findMany({
      where: { senderId: userId },
      include: {
        receiver: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      incoming: incoming.map((r) => ({
        id: r.id,
        messageText: r.messageText,
        createdAt: r.createdAt,
        sender: {
          id: r.sender.id,
          displayName: r.sender.profile?.displayName || "User",
          avatarUrl: r.sender.profile?.avatarUrl,
        },
      })),
      sent: sent.map((r) => ({
        id: r.id,
        messageText: r.messageText,
        status: r.status,
        createdAt: r.createdAt,
        receiver: {
          id: r.receiver.id,
          displayName: r.receiver.profile?.displayName || "User",
          avatarUrl: r.receiver.profile?.avatarUrl,
        },
      })),
    });
  } catch (error: any) {
    console.error("Get requests error:", error);
    return res.status(500).json({ error: "Failed to retrieve message requests" });
  }
});

// Send a message request
router.post("/requests/send", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { receiverId, messageText } = req.body;

    if (!receiverId || !messageText) {
      return res.status(400).json({ error: "Receiver and message text are required" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: "Cannot send message request to yourself" });
    }

    // Check if there is already an active conversation
    const existingConv = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: senderId },
        ],
      },
    });

    if (existingConv) {
      return res.status(400).json({
        error: "Conversation already established. You can message directly.",
        conversationId: existingConv.id,
      });
    }

    // Check existing pending request
    const existingReq = await prisma.messageRequest.findFirst({
      where: {
        senderId,
        receiverId,
        status: RequestStatus.PENDING,
      },
    });

    if (existingReq) {
      return res.status(400).json({ error: "A message request is already pending approval" });
    }

    const request = await prisma.messageRequest.create({
      data: {
        senderId,
        receiverId,
        messageText: messageText.trim(),
        status: RequestStatus.PENDING,
      },
    });

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        title: "New Message Request",
        body: `You received a message request: "${messageText.slice(0, 40)}..."`,
        type: "MESSAGE_REQUEST",
      },
    });

    return res.json({ success: true, request });
  } catch (error: any) {
    console.error("Send request error:", error);
    return res.status(500).json({ error: "Failed to send message request" });
  }
});

// Accept or Reject a message request
router.post("/requests/:id/respond", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { action } = req.body; // 'accept' or 'reject'

    const request = await prisma.messageRequest.findUnique({
      where: { id },
    });

    if (!request || request.receiverId !== userId) {
      return res.status(404).json({ error: "Request not found or unauthorized" });
    }

    if (action === "accept") {
      await prisma.messageRequest.update({
        where: { id },
        data: { status: RequestStatus.ACCEPTED },
      });

      // Create conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          user1Id_user2Id: {
            user1Id: request.senderId < userId ? request.senderId : userId,
            user2Id: request.senderId < userId ? userId : request.senderId,
          },
        },
        update: { lastMessageAt: new Date() },
        create: {
          user1Id: request.senderId < userId ? request.senderId : userId,
          user2Id: request.senderId < userId ? userId : request.senderId,
          lastMessageAt: new Date(),
        },
      });

      // Create initial message from the request text
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: request.senderId,
          content: request.messageText,
        },
      });

      return res.json({ success: true, status: "ACCEPTED", conversationId: conversation.id });
    } else {
      await prisma.messageRequest.update({
        where: { id },
        data: { status: RequestStatus.REJECTED },
      });

      return res.json({ success: true, status: "REJECTED" });
    }
  } catch (error: any) {
    console.error("Respond request error:", error);
    return res.status(500).json({ error: "Failed to respond to request" });
  }
});

// List all active conversations
router.get("/conversations", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const formatted = conversations.map((c) => {
      const partner = c.user1Id === userId ? c.user2 : c.user1;
      const lastMsg = c.messages[0];
      return {
        id: c.id,
        isDatingMatch: c.isDatingMatch,
        lastMessageAt: c.lastMessageAt,
        partner: {
          id: partner.id,
          displayName: partner.profile?.displayName || "User",
          avatarUrl: partner.profile?.avatarUrl,
          isOnline: partner.profile?.isOnline,
        },
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          senderId: lastMsg.senderId,
          createdAt: lastMsg.createdAt,
        } : null,
      };
    });

    return res.json({ conversations: formatted });
  } catch (error: any) {
    console.error("Get conversations error:", error);
    return res.status(500).json({ error: "Failed to retrieve conversations" });
  }
});

// Get messages in a conversation
router.get("/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
      },
    });

    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      return res.status(403).json({ error: "Conversation not found or unauthorized" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    const partner = (conversation.user1Id === userId ? conversation.user2 : conversation.user1) as any;

    return res.json({
      conversationId: conversation.id,
      partner: {
        id: partner.id,
        displayName: partner.profile?.displayName || "User",
        avatarUrl: partner.profile?.avatarUrl,
        isOnline: partner.profile?.isOnline,
      },
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get messages error:", error);
    return res.status(500).json({ error: "Failed to load messages" });
  }
});

// Send message in an accepted conversation
router.post("/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        content: content.trim(),
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return res.json({ message });
  } catch (error: any) {
    console.error("Send message error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
