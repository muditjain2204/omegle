import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { Role, Gender } from "@prisma/client";

async function main() {
  console.log("🌱 Seeding Omegle database...");

  // 1. Admin account
  const adminPasswordHash = await bcrypt.hash("Muditjain@1234", 10);
  const admin = await prisma.user.upsert({
    where: { email: "muditjain2204@gmail.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isVerified: true,
    },
    create: {
      email: "muditjain2204@gmail.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isVerified: true,
      profile: {
        create: {
          displayName: "Mudit Jain",
          age: 23,
          gender: Gender.MALE,
          avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&auto=format&fit=crop&q=80",
          isOnline: true,
        },
      },
      preferences: {
        create: {
          preferredGender: Gender.ANY,
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
          paidVideoSecondsAvailable: 7200, // 2 hours
          paidTextSecondsAvailable: 21600, // 6 hours
          datingPremiumExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      adminUser: {
        create: {
          role: "SUPER_ADMIN",
          permissions: { all: true },
        },
      },
    },
  });

  console.log("✅ Admin user ready:", admin.email);

  // 2. Realistic active profiles
  const profilesToSeed = [
    {
      email: "chloe.bennett@example.com",
      displayName: "Chloe Bennett",
      age: 24,
      gender: Gender.FEMALE,
      preferredGender: Gender.MALE,
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",
      bio: "Cardiology resident & coffee enthusiast. Love deep late-night conversations and spontaneous road trips.",
      location: "San Francisco, CA",
      interests: ["Medicine", "Travel", "Photography", "Running"],
      headline: "Let's share stories about life and science ☕",
      photos: [
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      ],
    },
    {
      email: "mark.wood@example.com",
      displayName: "Dr. Mark Wood",
      age: 29,
      gender: Gender.MALE,
      preferredGender: Gender.FEMALE,
      avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&auto=format&fit=crop&q=80",
      bio: "Doctor & amateur guitarist. Always curious to learn how people think around the world.",
      location: "London, UK",
      interests: ["Healthcare", "Acoustic Guitar", "Jazz", "Philosophy"],
      headline: "Curious mind seeking honest, genuine conversations 🎸",
      photos: [
        "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80",
      ],
    },
    {
      email: "chloe.bennett@example.com",
      displayName: "Chloe Bennett",
      age: 23,
      gender: Gender.FEMALE,
      preferredGender: Gender.MALE,
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
      bio: "UI/UX Designer who loves typography, indie pop, and pottery on weekends.",
      location: "New York, NY",
      interests: ["Design", "Art", "Ceramics", "Matcha"],
      headline: "Good energy only! Tell me your favorite song 🎨",
      photos: [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
      ],
    },
    {
      email: "lucas.vance@example.com",
      displayName: "Lucas Vance",
      age: 26,
      gender: Gender.MALE,
      preferredGender: Gender.FEMALE,
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
      bio: "Software developer & backcountry hiker. Believer that random encounters make the best memories.",
      location: "Seattle, WA",
      interests: ["Hiking", "Tech", "Cooking", "Sci-Fi"],
      headline: "Let's debate: mountains or beach? ⛰️",
      photos: [
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80",
      ],
    },
    {
      email: "maya.sharma@example.com",
      displayName: "Maya Sharma",
      age: 25,
      gender: Gender.FEMALE,
      preferredGender: Gender.ANY,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
      bio: "Product strategist & foodie. Love exploring street markets and learning new languages.",
      location: "Mumbai, India",
      interests: ["Cinema", "Food", "Startups", "Yoga"],
      headline: "Here to meet interesting souls across the globe ✨",
      photos: [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      ],
    },
    {
      email: "oliver.smith@example.com",
      displayName: "Oliver Smith",
      age: 27,
      gender: Gender.MALE,
      preferredGender: Gender.ANY,
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
      bio: "Architectural draftsman & swimmer. Big fan of vintage vinyl and cozy conversation.",
      location: "Toronto, Canada",
      interests: ["Architecture", "Vinyl", "Swimming", "Dogs"],
      headline: "Say hi and let's have a spontaneous chat 🏊‍♂️",
      photos: [
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
      ],
    },
  ];

  const defaultPasswordHash = await bcrypt.hash("password123", 10);

  for (const item of profilesToSeed) {
    await prisma.user.upsert({
      where: { email: item.email },
      update: {},
      create: {
        email: item.email,
        passwordHash: defaultPasswordHash,
        role: Role.USER,
        isVerified: true,
        profile: {
          create: {
            displayName: item.displayName,
            age: item.age,
            gender: item.gender,
            avatarUrl: item.avatarUrl,
            bio: item.bio,
            location: item.location,
            interests: item.interests,
            isOnline: true,
          },
        },
        preferences: {
          create: {
            preferredGender: item.preferredGender,
            videoGenderFilter: item.preferredGender,
            textGenderFilter: item.preferredGender,
          },
        },
        datingProfile: {
          create: {
            headline: item.headline,
            bio: item.bio,
            photos: item.photos,
            interests: item.interests,
            verifiedBadge: true,
          },
        },
        trialEntitlement: {
          create: {
            videoTrialTotalMinutes: 15,
            videoTrialUsedSeconds: 120, // 2 mins used
            textTrialTotalMinutes: 15,
            textTrialUsedSeconds: 60,
          },
        },
        usageBalance: {
          create: {
            paidVideoSecondsAvailable: 1800, // 30 mins
            paidTextSecondsAvailable: 3600,  // 60 mins
          },
        },
      },
    });
  }

  console.log("✅ Seed completed successfully with realistic profiles!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
