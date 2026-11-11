import { Router, Response } from "express";
import { prisma } from "../db";
import { authMiddleware, adminOnly, AuthRequest } from "../auth";
import { ReportStatus, Gender } from "@prisma/client";

const router = Router();

// Analytics overview
router.get("/overview", authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const onlineUsers = await prisma.profile.count({ where: { isOnline: true } });
    const maleCount = await prisma.profile.count({ where: { gender: Gender.MALE } });
    const femaleCount = await prisma.profile.count({ where: { gender: Gender.FEMALE } });
    const otherCount = await prisma.profile.count({
      where: { gender: { notIn: [Gender.MALE, Gender.FEMALE] } },
    });

    const activeVideoSessions = await prisma.videoSession.count({ where: { status: "ACTIVE" } });
    const activeTextSessions = await prisma.textSession.count({ where: { status: "ACTIVE" } });
    const totalMatches = await prisma.match.count();

    const completedPurchases = await prisma.purchase.findMany({
      where: { status: "COMPLETED" },
    });

    const totalRevenuePaise = completedPurchases.reduce((acc, curr) => acc + curr.amountPaise, 0);
    const totalRevenueRupees = Math.round(totalRevenuePaise / 100);

    const pendingReportsCount = await prisma.report.count({
      where: { status: ReportStatus.PENDING },
    });

    return res.json({
      metrics: {
        totalUsers,
        onlineUsers,
        maleCount,
        femaleCount,
        otherCount,
        activeVideoSessions,
        activeTextSessions,
        totalMatches,
        totalPurchasesCount: completedPurchases.length,
        totalRevenueRupees,
        pendingReportsCount,
      },
    });
  } catch (error: any) {
    console.error("Admin overview error:", error);
    return res.status(500).json({ error: "Failed to load admin metrics" });
  }
});

// Moderation reports
router.get("/reports", authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { include: { profile: true } },
        reportedUser: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ reports });
  } catch (error: any) {
    console.error("Admin reports error:", error);
    return res.status(500).json({ error: "Failed to load reports" });
  }
});

// Action on report (Dismiss or Ban)
router.post("/reports/:id/action", authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { action, notes } = req.body; // 'ban' or 'dismiss'

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (action === "ban") {
      await prisma.user.update({
        where: { id: report.reportedUserId },
        data: { isBanned: true },
      });

      await prisma.report.update({
        where: { id },
        data: {
          status: ReportStatus.RESOLVED,
          actionTaken: `User banned: ${notes || "Violated terms of service"}`,
        },
      });

      return res.json({ success: true, message: "User suspended and report resolved" });
    } else {
      await prisma.report.update({
        where: { id },
        data: {
          status: ReportStatus.DISMISSED,
          actionTaken: `Dismissed: ${notes || "No violation found"}`,
        },
      });

      return res.json({ success: true, message: "Report dismissed" });
    }
  } catch (error: any) {
    console.error("Admin report action error:", error);
    return res.status(500).json({ error: "Failed to process report action" });
  }
});

// Admin: Grant Free VIP / Friend Access to any user by email
router.post("/grant-vip", authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { email, passType = "FULL_VIP", customMinutes } = req.body;

    if (!email) {
      return res.status(400).json({ error: "User email is required" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true, usageBalance: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: `No user found with email "${email}"` });
    }

    let usageBalance = targetUser.usageBalance;
    if (!usageBalance) {
      usageBalance = await prisma.usageBalance.create({
        data: { userId: targetUser.id },
      });
    }

    let addedVideoSeconds = 0;
    let addedTextSeconds = 0;
    let updatedDatingExpiresAt = usageBalance.datingPremiumExpiresAt;
    let description = "";

    const minutes = customMinutes ? Number(customMinutes) : 30000;

    if (passType === "FULL_VIP") {
      addedVideoSeconds = minutes * 60;
      addedTextSeconds = minutes * 60;
      const currentExpiry =
        usageBalance.datingPremiumExpiresAt && new Date(usageBalance.datingPremiumExpiresAt) > new Date()
          ? new Date(usageBalance.datingPremiumExpiresAt)
          : new Date();
      updatedDatingExpiresAt = new Date(currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000);
      description = `Admin Granted Full VIP: ${minutes}m Video + ${minutes}m Text + 1 Yr Dating`;
    } else if (passType === "VIDEO") {
      addedVideoSeconds = minutes * 60;
      description = `Admin Granted ${minutes}m Preferred Video Access`;
    } else if (passType === "TEXT") {
      addedTextSeconds = minutes * 60;
      description = `Admin Granted ${minutes}m Preferred Text Access`;
    } else if (passType === "DATING") {
      const currentExpiry =
        usageBalance.datingPremiumExpiresAt && new Date(usageBalance.datingPremiumExpiresAt) > new Date()
          ? new Date(usageBalance.datingPremiumExpiresAt)
          : new Date();
      updatedDatingExpiresAt = new Date(currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000);
      description = "Admin Granted 1 Year Premium Dating Pass";
    }

    const newVideo = usageBalance.paidVideoSecondsAvailable + addedVideoSeconds;
    const newText = usageBalance.paidTextSecondsAvailable + addedTextSeconds;

    const updated = await prisma.usageBalance.update({
      where: { userId: targetUser.id },
      data: {
        paidVideoSecondsAvailable: newVideo,
        paidTextSecondsAvailable: newText,
        datingPremiumExpiresAt: updatedDatingExpiresAt,
      },
    });

    await prisma.paymentTransaction.create({
      data: {
        userId: targetUser.id,
        transactionLedgerType: "CREDIT",
        productType: "VIDEO_PACK_60M",
        unitsSeconds: addedVideoSeconds + addedTextSeconds,
        balanceAfterSeconds: newVideo + newText,
        remarks: description,
      },
    });

    return res.json({
      success: true,
      message: `Successfully granted VIP privileges to ${targetUser.profile?.displayName || targetUser.email}!`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.profile?.displayName,
        usageBalance: updated,
      },
    });
  } catch (error: any) {
    console.error("Grant VIP error:", error);
    return res.status(500).json({ error: "Failed to grant VIP privileges" });
  }
});

export default router;
