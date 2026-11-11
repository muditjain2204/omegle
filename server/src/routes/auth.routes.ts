import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { generateToken, authMiddleware, AuthRequest } from "../auth";
import { Gender } from "@prisma/client";

const router = Router();

// 1-Click Fast Start for zero-friction landing page entry
router.post("/quick-start", async (req: Request, res: Response) => {
  try {
    const { displayName, gender, targetGender, isAdult } = req.body;

    if (!isAdult) {
      return res.status(400).json({ error: "You must be 18 years or older to use this service." });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestName = displayName ? displayName.trim() : `User_${randomSuffix}`;
    const guestEmail = `guest_${Date.now()}_${randomSuffix}@omegle-fast.local`;
    const selectedGender = (gender && Object.values(Gender).includes(gender)) ? (gender as Gender) : Gender.OTHER;
    const selectedTarget = (targetGender && Object.values(Gender).includes(targetGender)) ? (targetGender as Gender) : Gender.ANY;

    // Create user and initialize entitlements
    const user = await prisma.user.create({
      data: {
        email: guestEmail,
        isVerified: true,
        profile: {
          create: {
            displayName: guestName,
            age: 21,
            gender: selectedGender,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestName}`,
            isOnline: true,
          },
        },
        preferences: {
          create: {
            preferredGender: selectedTarget,
            videoGenderFilter: selectedTarget,
            textGenderFilter: selectedTarget,
          },
        },
        datingProfile: {
          create: {
            headline: `Hey, I'm ${guestName}!`,
            bio: "Exploring new conversations and meeting friendly people.",
            photos: [`https://images.unsplash.com/photo-${1534528741775 + randomSuffix % 100}?w=600&auto=format&fit=crop&q=80`],
            interests: ["Travel", "Music", "Tech", "Photography"],
          },
        },
        trialEntitlement: {
          create: {
            videoTrialTotalMinutes: 15,
            videoTrialUsedSeconds: 0,
            textTrialTotalMinutes: 15,
            textTrialUsedSeconds: 0,
          },
        },
        usageBalance: {
          create: {
            paidVideoSecondsAvailable: 0,
            paidTextSecondsAvailable: 0,
          },
        },
      },
      include: {
        profile: true,
        trialEntitlement: true,
        usageBalance: true,
        preferences: true,
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        trialEntitlement: user.trialEntitlement,
        usageBalance: user.usageBalance,
        preferences: user.preferences,
      },
    });
  } catch (error: any) {
    console.error("Quick start error:", error);
    return res.status(500).json({ error: "Failed to initialize guest session" });
  }
});

// Regular Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, gender, age } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Email, password, and display name are required" });
    }

    if (age && Number(age) < 18) {
      return res.status(400).json({ error: "Users must be at least 18 years old" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const selectedGender = (gender && Object.values(Gender).includes(gender)) ? (gender as Gender) : Gender.OTHER;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        isVerified: true,
        profile: {
          create: {
            displayName,
            age: age ? Number(age) : 21,
            gender: selectedGender,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
            isOnline: true,
          },
        },
        preferences: {
          create: {
            preferredGender: Gender.ANY,
          },
        },
        datingProfile: {
          create: {
            headline: `Hey, I'm ${displayName}!`,
            bio: "Excited to meet genuine people around the world.",
            photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"],
            interests: ["Coffee", "Art", "Movies", "Outdoors"],
          },
        },
        trialEntitlement: {
          create: {
            videoTrialTotalMinutes: 15,
            videoTrialUsedSeconds: 0,
            textTrialTotalMinutes: 15,
            textTrialUsedSeconds: 0,
          },
        },
        usageBalance: {
          create: {
            paidVideoSecondsAvailable: 0,
            paidTextSecondsAvailable: 0,
          },
        },
      },
      include: {
        profile: true,
        trialEntitlement: true,
        usageBalance: true,
        preferences: true,
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        trialEntitlement: user.trialEntitlement,
        usageBalance: user.usageBalance,
        preferences: user.preferences,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        trialEntitlement: true,
        usageBalance: true,
        preferences: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "This account has been suspended" });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        trialEntitlement: user.trialEntitlement,
        usageBalance: user.usageBalance,
        preferences: user.preferences,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

// Get current user info & updated balances
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        profile: true,
        trialEntitlement: true,
        usageBalance: true,
        preferences: true,
        datingProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Count mutual matches
    const mutualMatchesCount = await prisma.match.count({
      where: {
        OR: [{ user1Id: user.id }, { user2Id: user.id }],
        isActive: true,
      },
    });

    // Check dating premium status
    const isDatingPremium =
      user.usageBalance?.datingPremiumExpiresAt &&
      new Date(user.usageBalance.datingPremiumExpiresAt) > new Date();

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        trialEntitlement: user.trialEntitlement,
        usageBalance: user.usageBalance,
        preferences: user.preferences,
        datingProfile: user.datingProfile,
        mutualMatchesCount,
        isDatingPremium: Boolean(isDatingPremium),
      },
    });
  } catch (error: any) {
    console.error("Get /me error:", error);
    return res.status(500).json({ error: "Failed to load user profile" });
  }
});

// Update Profile
router.put("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, bio, interests, location, preferredGender, avatarUrl } = req.body;

    const updatedProfile = await prisma.profile.update({
      where: { userId: req.user!.id },
      data: {
        ...(displayName && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(interests && { interests }),
        ...(location !== undefined && { location }),
        ...(avatarUrl && { avatarUrl }),
      },
    });

    if (preferredGender) {
      await prisma.userPreference.upsert({
        where: { userId: req.user!.id },
        update: { preferredGender },
        create: { userId: req.user!.id, preferredGender },
      });
    }

    return res.json({ profile: updatedProfile });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
