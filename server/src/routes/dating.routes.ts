import { Router, Response } from "express";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../auth";
import { Gender } from "@prisma/client";

const router = Router();

// 1. Discover eligible profiles
router.get("/discover", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { minAge, maxAge, gender, city, intention, interest } = req.query;

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

    // Exclude users already liked, passed, matched, or blocked, PLUS self
    const existingLikes = await prisma.like.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
    });
    const likedUserIds = existingLikes.map((l) => l.receiverId);

    const existingPasses = await prisma.datingPass.findMany({
      where: { userId },
      select: { targetId: true },
    });
    const passedUserIds = existingPasses.map((p) => p.targetId);

    const existingMatches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { user1Id: true, user2Id: true },
    });
    const matchedUserIds = existingMatches.map((m) =>
      m.user1Id === userId ? m.user2Id : m.user1Id
    );

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });
    const blockedUserIds = blockedUsers.map((b) =>
      b.blockerId === userId ? b.blockedId : b.blockerId
    );

    // Strict exclusion list - user can NEVER see themselves or already processed profiles
    const excludeIds = Array.from(new Set([
      userId,
      ...likedUserIds,
      ...passedUserIds,
      ...matchedUserIds,
      ...blockedUserIds,
    ]));

    // Build filter conditions
    const whereConditions: any = {
      id: { notIn: excludeIds },
      isBanned: false,
      datingProfile: { isActive: true },
    };

    if (gender && typeof gender === "string" && gender !== "ALL" && gender !== "ANY") {
      whereConditions.profile = {
        ...(whereConditions.profile || {}),
        gender: gender as Gender,
      };
    }

    if (minAge || maxAge) {
      whereConditions.profile = {
        ...(whereConditions.profile || {}),
        age: {
          ...(minAge ? { gte: Number(minAge) } : {}),
          ...(maxAge ? { lte: Number(maxAge) } : {}),
        },
      };
    }

    if (city && typeof city === "string" && city.trim()) {
      whereConditions.OR = [
        { profile: { location: { contains: city.trim(), mode: "insensitive" } } },
        { datingProfile: { city: { contains: city.trim(), mode: "insensitive" } } },
      ];
    }

    if (intention && typeof intention === "string" && intention !== "ANY") {
      whereConditions.datingProfile = {
        ...(whereConditions.datingProfile || {}),
        relationshipIntention: intention,
      };
    }

    if (interest && typeof interest === "string" && interest.trim()) {
      whereConditions.datingProfile = {
        ...(whereConditions.datingProfile || {}),
        interests: { has: interest.trim() },
      };
    }

    const profiles = await prisma.user.findMany({
      where: whereConditions,
      include: {
        profile: true,
        datingProfile: true,
      },
      take: 25,
    });

    const formatted = profiles
      .filter((p) => p.id !== userId) // Extra safety check: never include self
      .map((p) => ({
        userId: p.id,
        displayName: p.profile?.displayName || "Anonymous",
        age: p.profile?.age || 22,
        gender: p.profile?.gender || "OTHER",
        avatarUrl: p.profile?.avatarUrl,
        location: p.datingProfile?.city || p.profile?.location || "Nearby",
        headline: p.datingProfile?.headline || "Hey there!",
        bio: p.datingProfile?.bio || p.profile?.bio || "Let's connect and have a genuine chat.",
        photos: (p.datingProfile?.photos && p.datingProfile.photos.length > 0)
          ? p.datingProfile.photos
          : [p.profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"],
        interests: p.datingProfile?.interests && p.datingProfile.interests.length > 0
          ? p.datingProfile.interests
          : (p.profile?.interests && p.profile.interests.length > 0 ? p.profile.interests : ["Music", "Films", "Travel"]),
        relationshipIntention: p.datingProfile?.relationshipIntention || "Casual Dating",
        verifiedBadge: p.datingProfile?.verifiedBadge ?? true,
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

// 2. Like or Super Like a profile
router.post("/like", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { targetUserId, isSuperLike } = req.body;

    if (!targetUserId || targetUserId === userId) {
      return res.status(400).json({ error: "Cannot like yourself or invalid target" });
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

    // Fetch sender info for rich notification
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, datingProfile: true },
    });
    const senderName = sender?.profile?.displayName || "Someone";
    const senderAvatar = sender?.profile?.avatarUrl || sender?.datingProfile?.photos?.[0] || "";

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

    // Create Notification for Target User that someone liked or super liked them!
    const likeNotifTitle = isSuperLike
      ? `⭐ Super Like from ${senderName}!`
      : `❤️ New Like from ${senderName}!`;
    const likeNotifBody = isSuperLike
      ? `${senderName} sent you a Super Like! Check their profile in Likes You.`
      : `${senderName} liked your profile. Like them back to match!`;

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: likeNotifTitle,
        body: likeNotifBody,
        type: isSuperLike ? "SUPER_LIKE" : "LIKE",
        metadata: {
          senderId: userId,
          senderName,
          avatarUrl: senderAvatar,
          isSuperLike: Boolean(isSuperLike),
        },
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
      include: {
        sender: { include: { profile: true, datingProfile: true } },
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

        // Create mutual match notification for BOTH users!
        const targetName = reciprocalLike.sender.profile?.displayName || "Match Partner";
        const targetAvatar = reciprocalLike.sender.profile?.avatarUrl || reciprocalLike.sender.datingProfile?.photos?.[0] || "";

        await prisma.notification.createMany({
          data: [
            {
              userId: targetUserId,
              title: "🎉 It's a Mutual Match!",
              body: `You and ${senderName} liked each other! Start chatting now.`,
              type: "MATCH",
              metadata: { partnerId: userId, partnerName: senderName, avatarUrl: senderAvatar },
            },
            {
              userId: userId,
              title: "🎉 It's a Mutual Match!",
              body: `You and ${targetName} liked each other! Start chatting now.`,
              type: "MATCH",
              metadata: { partnerId: targetUserId, partnerName: targetName, avatarUrl: targetAvatar },
            },
          ],
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

// 3. Pass profile (stores permanent pass so profile is never shown again)
router.post("/pass", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.body;

    if (targetUserId && targetUserId !== userId) {
      await prisma.datingPass.upsert({
        where: {
          userId_targetId: {
            userId,
            targetId: targetUserId,
          },
        },
        update: {},
        create: {
          userId,
          targetId: targetUserId,
        },
      });
    }

    return res.json({ success: true, message: "Profile passed" });
  } catch (error: any) {
    console.error("Pass error:", error);
    return res.status(500).json({ error: "Failed to record pass" });
  }
});

// 4. Likes You (people who liked the current user)
router.get("/likes-you", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all likes sent to current user
    const likesReceived = await prisma.like.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          include: { profile: true, datingProfile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Exclude users already liked back (matches) or passed
    const myLikes = await prisma.like.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
    });
    const myLikedIds = new Set(myLikes.map((l) => l.receiverId));

    const myPasses = await prisma.datingPass.findMany({
      where: { userId },
      select: { targetId: true },
    });
    const myPassedIds = new Set(myPasses.map((p) => p.targetId));

    const filtered = likesReceived.filter(
      (l) => !myLikedIds.has(l.senderId) && !myPassedIds.has(l.senderId) && l.senderId !== userId
    );

    const formatted = filtered.map((l) => ({
      likeId: l.id,
      isSuperLike: l.isSuperLike,
      createdAt: l.createdAt,
      user: {
        id: l.sender.id,
        displayName: l.sender.profile?.displayName || "Admirer",
        age: l.sender.profile?.age || 22,
        gender: l.sender.profile?.gender || "OTHER",
        avatarUrl: l.sender.profile?.avatarUrl,
        location: l.sender.datingProfile?.city || l.sender.profile?.location || "Nearby",
        headline: l.sender.datingProfile?.headline || "Liked your profile",
        bio: l.sender.datingProfile?.bio || l.sender.profile?.bio || "",
        photos: (l.sender.datingProfile?.photos && l.sender.datingProfile.photos.length > 0)
          ? l.sender.datingProfile.photos
          : [l.sender.profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"],
        interests: l.sender.datingProfile?.interests || l.sender.profile?.interests || [],
        relationshipIntention: l.sender.datingProfile?.relationshipIntention || "Casual Dating",
      },
    }));

    return res.json({ likes: formatted, count: formatted.length });
  } catch (error: any) {
    console.error("Likes-you error:", error);
    return res.status(500).json({ error: "Failed to load incoming likes" });
  }
});

// 5. Get user's mutual matches
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

    const formatted = await Promise.all(
      matches.map(async (m) => {
        const partner = m.user1Id === userId ? m.user2 : m.user1;

        const conv = await prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id: userId, user2Id: partner.id },
              { user1Id: partner.id, user2Id: userId },
            ],
          },
          select: { id: true, lastMessageAt: true },
        });

        return {
          matchId: m.id,
          matchedAt: m.matchedAt,
          conversationId: conv?.id,
          partner: {
            id: partner.id,
            displayName: partner.profile?.displayName || "Match Partner",
            avatarUrl: partner.profile?.avatarUrl,
            age: partner.profile?.age,
            gender: partner.profile?.gender,
            location: partner.datingProfile?.city || partner.profile?.location || "Nearby",
            bio: partner.datingProfile?.bio || partner.profile?.bio,
            headline: partner.datingProfile?.headline,
            photos: partner.datingProfile?.photos || [],
            interests: partner.datingProfile?.interests || [],
            relationshipIntention: partner.datingProfile?.relationshipIntention || "Casual Dating",
            isOnline: partner.profile?.isOnline || false,
          },
        };
      })
    );

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

// 6. Unmatch a user
router.post("/unmatch", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID required" });
    }

    await prisma.match.deleteMany({
      where: {
        OR: [
          { user1Id: userId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: userId },
        ],
      },
    });

    await prisma.like.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });

    return res.json({ success: true, message: "Unmatched successfully" });
  } catch (error: any) {
    console.error("Unmatch error:", error);
    return res.status(500).json({ error: "Failed to unmatch" });
  }
});

// 7. Get user's own dating profile
router.get("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, datingProfile: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      profile: {
        userId: user.id,
        displayName: user.profile?.displayName || "",
        age: user.profile?.age || 21,
        gender: user.profile?.gender || "OTHER",
        avatarUrl: user.profile?.avatarUrl,
        location: user.datingProfile?.city || user.profile?.location || "",
        headline: user.datingProfile?.headline || "",
        bio: user.datingProfile?.bio || user.profile?.bio || "",
        photos: (user.datingProfile?.photos && user.datingProfile.photos.length > 0)
          ? user.datingProfile.photos
          : (user.profile?.avatarUrl ? [user.profile.avatarUrl] : []),
        interests: user.datingProfile?.interests && user.datingProfile.interests.length > 0
          ? user.datingProfile.interests
          : (user.profile?.interests || []),
        relationshipIntention: user.datingProfile?.relationshipIntention || "Casual Dating",
        interestedIn: user.datingProfile?.interestedIn || "Everyone",
      },
    });
  } catch (error: any) {
    console.error("Get dating profile error:", error);
    return res.status(500).json({ error: "Failed to get profile" });
  }
});

// 8. Update user's own dating profile
router.put("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      displayName,
      age,
      gender,
      location,
      headline,
      bio,
      photos,
      interests,
      relationshipIntention,
      interestedIn,
    } = req.body;

    if (age && Number(age) < 18) {
      return res.status(400).json({ error: "Must be 18+ to use dating features" });
    }

    const trimmedBio = typeof bio === "string" ? bio.slice(0, 300) : undefined;

    // Update main profile
    await prisma.profile.updateMany({
      where: { userId },
      data: {
        ...(displayName ? { displayName } : {}),
        ...(age ? { age: Number(age) } : {}),
        ...(gender ? { gender } : {}),
        ...(location ? { location } : {}),
        ...(photos && photos.length > 0 ? { avatarUrl: photos[0] } : {}),
        ...(interests ? { interests } : {}),
      },
    });

    // Upsert dating profile
    const dating = await prisma.datingProfile.upsert({
      where: { userId },
      update: {
        headline,
        bio: trimmedBio,
        photos: Array.isArray(photos) ? photos.slice(0, 6) : undefined,
        interests: Array.isArray(interests) ? interests : undefined,
        relationshipIntention,
        city: location,
        interestedIn,
      },
      create: {
        userId,
        headline,
        bio: trimmedBio,
        photos: Array.isArray(photos) ? photos.slice(0, 6) : [],
        interests: Array.isArray(interests) ? interests : [],
        relationshipIntention: relationshipIntention || "Casual Dating",
        city: location,
        interestedIn: interestedIn || "Everyone",
      },
    });

    return res.json({ success: true, datingProfile: dating });
  } catch (error: any) {
    console.error("Update dating profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// 9. Get dating notifications
router.get("/notifications", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return res.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error("Notifications error:", error);
    return res.status(500).json({ error: "Failed to get notifications" });
  }
});

// 10. Mark notifications as read
router.post("/notifications/read", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Mark read error:", error);
    return res.status(500).json({ error: "Failed to mark notifications read" });
  }
});

export default router;
