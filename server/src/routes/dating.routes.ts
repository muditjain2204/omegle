import { Router, Response } from "express";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../auth";

const router = Router();

// Discover eligible profiles
router.get("/discover", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check user's mutual match count & premium status
    const mutualMatchesCount = await prisma.match.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
    });

    const usageBalance = await prisma.usageBalance.findUnique({
      where: { userId },
    });

    const isDatingPremium =
      usageBalance?.datingPremiumExpiresAt &&
      new Date(usageBalance.datingPremiumExpiresAt) > new Date();

    if (mutualMatchesCount >= 15 && !isDatingPremium) {
      return res.status(403).json({
        error: "Free limit reached (15 mutual matches). Upgrade to Dating Premium to continue discovering profiles.",
        limitReached: true,
        mutualMatchesCount,
        maxFreeMatches: 15,
      });
    }

    // Exclude users already liked, passed, or blocked
    const existingLikes = await prisma.like.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
    });
    const likedUserIds = existingLikes.map((l) => l.receiverId);

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });
    const blockedUserIds = blockedUsers.map((b) =>
      b.blockerId === userId ? b.blockedId : b.blockerId
    );

    const excludeIds = [userId, ...likedUserIds, ...blockedUserIds];

    const profiles = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        isBanned: false,
        datingProfile: { isActive: true },
      },
      include: {
        profile: true,
        datingProfile: true,
      },
      take: 20,
    });

    const formatted = profiles.map((p) => ({
      userId: p.id,
      displayName: p.profile?.displayName || "Anonymous",
      age: p.profile?.age || 22,
      gender: p.profile?.gender,
      avatarUrl: p.profile?.avatarUrl,
      location: p.profile?.location || "Nearby",
      headline: p.datingProfile?.headline || "Hey there!",
      bio: p.datingProfile?.bio || p.profile?.bio || "Let's connect and have a genuine chat.",
      photos: p.datingProfile?.photos && p.datingProfile.photos.length > 0
        ? p.datingProfile.photos
        : [p.profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"],
      interests: p.datingProfile?.interests || p.profile?.interests || ["Music", "Films", "Travel"],
      verifiedBadge: p.datingProfile?.verifiedBadge || false,
    }));

    return res.json({
      profiles: formatted,
      mutualMatchesCount,
      maxFreeMatches: 15,
      isDatingPremium: Boolean(isDatingPremium),
    });
  } catch (error: any) {
    console.error("Dating discover error:", error);
    return res.status(500).json({ error: "Failed to fetch dating discovery profiles" });
  }
});

// Like a profile
router.post("/like", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { targetUserId, isSuperLike } = req.body;

    if (!targetUserId || targetUserId === userId) {
      return res.status(400).json({ error: "Invalid target user" });
    }

    // Check 15-match limit before processing
    const mutualMatchesCount = await prisma.match.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
    });

    const usageBalance = await prisma.usageBalance.findUnique({
      where: { userId },
    });

    const isDatingPremium =
      usageBalance?.datingPremiumExpiresAt &&
      new Date(usageBalance.datingPremiumExpiresAt) > new Date();

    if (mutualMatchesCount >= 15 && !isDatingPremium) {
      return res.status(403).json({
        error: "Free match limit reached (15 mutual matches). Upgrade to Dating Premium.",
        limitReached: true,
      });
    }

    // Record or update like
    await prisma.like.upsert({
      where: {
        senderId_receiverId: {
          senderId: userId,
          receiverId: targetUserId,
        },
      },
      update: { isSuperLike: Boolean(isSuperLike) },
      create: {
        senderId: userId,
        receiverId: targetUserId,
        isSuperLike: Boolean(isSuperLike),
      },
    });

    // Check if target user also liked this user -> Mutual Match!
    const reciprocalLike = await prisma.like.findUnique({
      where: {
        senderId_receiverId: {
          senderId: targetUserId,
          receiverId: userId,
        },
      },
    });

    let isMutualMatch = false;
    let matchRecord = null;

    if (reciprocalLike) {
      isMutualMatch = true;

      // Check if match already exists
      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: targetUserId },
            { user1Id: targetUserId, user2Id: userId },
          ],
        },
      });

      if (!existingMatch) {
        matchRecord = await prisma.match.create({
          data: {
            user1Id: userId,
            user2Id: targetUserId,
            isActive: true,
          },
        });

        // Automatically create a conversation for the matched pair
        await prisma.conversation.upsert({
          where: {
            user1Id_user2Id: {
              user1Id: userId < targetUserId ? userId : targetUserId,
              user2Id: userId < targetUserId ? targetUserId : userId,
            },
          },
          update: { isDatingMatch: true },
          create: {
            user1Id: userId < targetUserId ? userId : targetUserId,
            user2Id: userId < targetUserId ? targetUserId : userId,
            isDatingMatch: true,
          },
        });

        // Create notification for target user
        await prisma.notification.create({
          data: {
            userId: targetUserId,
            title: "It's a Mutual Match! 🎉",
            body: "You and someone special just liked each other. Start chatting now!",
            type: "MATCH",
          },
        });
      } else {
        matchRecord = existingMatch;
      }
    }

    const updatedMatchCount = await prisma.match.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
    });

    return res.json({
      success: true,
      mutualMatch: isMutualMatch,
      match: matchRecord,
      mutualMatchesCount: updatedMatchCount,
      limitReached: updatedMatchCount >= 15 && !isDatingPremium,
    });
  } catch (error: any) {
    console.error("Dating like error:", error);
    return res.status(500).json({ error: "Failed to record like" });
  }
});

// Pass profile
router.post("/pass", authMiddleware, async (req: AuthRequest, res: Response) => {
  return res.json({ success: true, message: "Profile passed" });
});

// Get user's mutual matches
router.get("/matches", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
      include: {
        user1: { include: { profile: true, datingProfile: true } },
        user2: { include: { profile: true, datingProfile: true } },
      },
      orderBy: { matchedAt: "desc" },
    });

    const formatted = matches.map((m) => {
      const partner = m.user1Id === userId ? m.user2 : m.user1;
      return {
        matchId: m.id,
        matchedAt: m.matchedAt,
        partner: {
          id: partner.id,
          displayName: partner.profile?.displayName || "Match Partner",
          avatarUrl: partner.profile?.avatarUrl,
          age: partner.profile?.age,
          bio: partner.datingProfile?.bio || partner.profile?.bio,
          headline: partner.datingProfile?.headline,
          photos: partner.datingProfile?.photos || [],
        },
      };
    });

    return res.json({
      matches: formatted,
      count: formatted.length,
      maxFreeMatches: 15,
    });
  } catch (error: any) {
    console.error("Get matches error:", error);
    return res.status(500).json({ error: "Failed to retrieve matches" });
  }
});

export default router;

