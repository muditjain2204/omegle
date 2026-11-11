import { Router, Response } from "express";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../auth";
import { ReportReason } from "@prisma/client";

const router = Router();

// Submit user report
router.post("/report", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reporterId = req.user!.id;
    const { reportedUserId, reason, details } = req.body;

    if (!reportedUserId) {
      return res.status(400).json({ error: "Reported user ID is required" });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        reason: (reason && Object.values(ReportReason).includes(reason)) ? reason : ReportReason.INAPPROPRIATE_BEHAVIOR,
        details: details ? details.trim() : null,
      },
    });

    return res.json({
      success: true,
      message: "Report submitted. Our safety team will review this interaction immediately.",
      reportId: report.id,
    });
  } catch (error: any) {
    console.error("Report error:", error);
    return res.status(500).json({ error: "Failed to submit report" });
  }
});

// Block a user
router.post("/block", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user!.id;
    const { blockedId } = req.body;

    if (!blockedId || blockerId === blockedId) {
      return res.status(400).json({ error: "Invalid user to block" });
    }

    await prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      update: {},
      create: { blockerId, blockedId },
    });

    return res.json({
      success: true,
      message: "User blocked. You will not be paired with or contacted by them again.",
    });
  } catch (error: any) {
    console.error("Block error:", error);
    return res.status(500).json({ error: "Failed to block user" });
  }
});

export default router;

