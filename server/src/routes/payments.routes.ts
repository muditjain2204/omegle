import { Router, Response } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../auth";
import { ProductType, PurchaseStatus, Purchase } from "@prisma/client";

const router = Router();

// Helper function to read dynamic Razorpay credentials from environment
export function getRazorpayConfig() {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || keySecret || "").trim();

  const client = (keyId && keySecret)
    ? new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      })
    : null;

  return { keyId, keySecret, webhookSecret, client };
}

// Reusable, idempotent balance settlement helper
export async function creditPurchase(purchaseId: string, paymentId?: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase) {
    throw new Error("Purchase record not found");
  }

  if (purchase.status === PurchaseStatus.COMPLETED) {
    const existingBalance = await prisma.usageBalance.findUnique({ where: { userId: purchase.userId } });
    return { purchase, usageBalance: existingBalance };
  }

  const finalPaymentId = paymentId || `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const updatedPurchase = await prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      status: PurchaseStatus.COMPLETED,
      razorpayPaymentId: finalPaymentId,
    },
  });

  const userId = purchase.userId;
  let usageBalance = await prisma.usageBalance.findUnique({ where: { userId } });
  if (!usageBalance) {
    usageBalance = await prisma.usageBalance.create({
      data: { userId },
    });
  }

  let addedSeconds = 0;
  let newBalanceSeconds = 0;

  if (purchase.productType === ProductType.VIDEO_PACK_60M) {
    addedSeconds = 60 * 60; // 3600 seconds = 60 minutes
    newBalanceSeconds = usageBalance.paidVideoSecondsAvailable + addedSeconds;

    await prisma.usageBalance.update({
      where: { userId },
      data: { paidVideoSecondsAvailable: newBalanceSeconds },
    });

    await prisma.paymentTransaction.create({
      data: {
        purchaseId: purchase.id,
        userId,
        transactionLedgerType: "CREDIT",
        productType: purchase.productType,
        unitsSeconds: addedSeconds,
        balanceAfterSeconds: newBalanceSeconds,
        remarks: "Purchased 60 mins Preferred Gender Video Pack (₹599 / International)",
      },
    });
  } else if (purchase.productType === ProductType.TEXT_PACK_180M) {
    addedSeconds = 180 * 60; // 10,800 seconds = 180 minutes
    newBalanceSeconds = usageBalance.paidTextSecondsAvailable + addedSeconds;

    await prisma.usageBalance.update({
      where: { userId },
      data: { paidTextSecondsAvailable: newBalanceSeconds },
    });

    await prisma.paymentTransaction.create({
      data: {
        purchaseId: purchase.id,
        userId,
        transactionLedgerType: "CREDIT",
        productType: purchase.productType,
        unitsSeconds: addedSeconds,
        balanceAfterSeconds: newBalanceSeconds,
        remarks: "Purchased 180 mins Preferred Gender Text Pack (₹299 / International)",
      },
    });
  } else if (purchase.productType === ProductType.DATING_PASS_7D) {
    const currentExpiry =
      usageBalance.datingPremiumExpiresAt && new Date(usageBalance.datingPremiumExpiresAt) > new Date()
        ? new Date(usageBalance.datingPremiumExpiresAt)
        : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.usageBalance.update({
      where: { userId },
      data: { datingPremiumExpiresAt: newExpiry },
    });

    await prisma.subscription.create({
      data: {
        userId,
        planType: "DATING_PREMIUM_7D",
        startDate: currentExpiry,
        endDate: newExpiry,
        isActive: true,
      },
    });

    await prisma.paymentTransaction.create({
      data: {
        purchaseId: purchase.id,
        userId,
        transactionLedgerType: "CREDIT",
        productType: purchase.productType,
        unitsSeconds: 7 * 24 * 3600,
        balanceAfterSeconds: Math.floor((newExpiry.getTime() - Date.now()) / 1000),
        remarks: "Purchased 7-Day Premium Dating Pass (₹499 / International)",
      },
    });
  }

  const updatedBalance = await prisma.usageBalance.findUnique({ where: { userId } });
  return { purchase: updatedPurchase, usageBalance: updatedBalance };
}

// Gateway status & capabilities endpoint
router.get("/gateway-status", (req, res) => {
  const { keyId, client } = getRazorpayConfig();
  res.json({
    gateway: "Razorpay",
    isConfigured: !!client,
    supportsInternational: true,
    currenciesSupported: ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED"],
    keyId: keyId || null,
  });
});

// List available products with clear, non-confusing specifications
router.get("/products", (req, res) => {
  res.json({
    products: [
      {
        id: "RANDOM_VIDEO_FREE",
        name: "Random Video Chat",
        tier: "FREE",
        priceRupees: 0,
        badge: "Free Forever",
        description: "Connect with random people worldwide.",
        features: [
          "15-minute introductory trial allowance",
          "Free fair-use video calls thereafter",
          "Random matching without gender preference",
          "Encrypted WebRTC P2P streaming",
          "Instant skip to next user",
        ],
      },
      {
        id: ProductType.VIDEO_PACK_60M,
        name: "Preferred Gender Video Pack",
        tier: "PREMIUM",
        priceRupees: 599,
        badge: "One-Time Pack",
        description: "Filter video connections by your preferred gender.",
        features: [
          "60 connected minutes included (3,600s)",
          "Select Male, Female or Any target gender",
          "Deducted ONLY while connected in a call",
          "Unused minutes never expire",
          "Priority matchmaking queue",
        ],
      },
      {
        id: ProductType.TEXT_PACK_180M,
        name: "Preferred Gender Text Pack",
        tier: "PREMIUM",
        priceRupees: 299,
        badge: "One-Time Pack",
        description: "Match with your preferred gender for live text conversations.",
        features: [
          "180 connected minutes (3 hours)",
          "Select preferred conversation partner gender",
          "Deducted ONLY while actively connected",
          "Remaining minutes stay in your wallet",
          "Real-time instant text messaging",
        ],
      },
      {
        id: ProductType.DATING_PASS_7D,
        name: "Premium Dating Pass",
        tier: "PREMIUM",
        priceRupees: 499,
        badge: "7-Day Access",
        description: "Continue discovering profiles after the free 15 mutual matches.",
        features: [
          "7 days of unlimited discovery swipes",
          "Bypasses the 15-match free limitation",
          "Advanced discovery preference filters",
          "See who liked your profile",
          "Existing matches always stay free",
        ],
      },
    ],
  });
});

// Create Real Production Razorpay Order
router.post(["/create-order", "/orders"], authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productType, currency = "INR" } = req.body;
    const { keyId, client: rzpClient } = getRazorpayConfig();

    if (!rzpClient || !keyId) {
      return res.status(503).json({
        error: "Razorpay payment gateway is not initialized on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server environment variables.",
      });
    }

    let amountPaise = 0;
    let description = "";
    if (productType === ProductType.VIDEO_PACK_60M) {
      amountPaise = 59900; // ₹599
      description = "60 Mins Preferred Gender Video Pack";
    } else if (productType === ProductType.TEXT_PACK_180M) {
      amountPaise = 29900; // ₹299
      description = "180 Mins Preferred Gender Text Pack";
    } else if (productType === ProductType.DATING_PASS_7D) {
      amountPaise = 49900; // ₹499
      description = "7-Day Premium Dating Pass";
    } else if (req.body.amount || req.body.amountPaise) {
      amountPaise = Number(req.body.amount || req.body.amountPaise);
      description = req.body.description || "OmeglePlus Payment";
    } else {
      return res.status(400).json({ error: "Invalid product selected or missing amount" });
    }

    // Razorpay requirement: minimum amount 100 paise (₹1.00)
    if (!amountPaise || amountPaise < 100) {
      return res.status(400).json({ error: "Amount must be at least 100 paise (₹1.00)" });
    }

    // Call real Razorpay Orders API
    const rzpOrder = await rzpClient.orders.create({
      amount: amountPaise,
      currency: currency.toUpperCase(),
      receipt: `rcpt_${Date.now().toString().slice(-8)}`,
      notes: {
        userId,
        productType: productType || "CUSTOM",
      },
    });

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        productType: productType || ProductType.VIDEO_PACK_60M,
        amountPaise,
        currency: currency.toUpperCase(),
        razorpayOrderId: rzpOrder.id,
        status: PurchaseStatus.PENDING,
      },
    });

    return res.json({
      order_id: rzpOrder.id,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      amountPaise,
      currency: currency.toUpperCase(),
      receipt: rzpOrder.receipt,
      purchaseId: purchase.id,
      productType,
      description,
      keyId,
      key_id: keyId,
    });
  } catch (error: any) {
    console.error("Razorpay create-order error:", error);
    return res.status(500).json({
      error: error?.error?.description || error?.message || "Failed to initialize order with Razorpay",
    });
  }
});

// Verify & Settle Purchase with Cryptographic HMAC Signature Check
router.post(["/verify", "/verify-payment"], authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const paymentId = (req.body.razorpayPaymentId || req.body.razorpay_payment_id || "").trim();
    const orderId = (req.body.razorpayOrderId || req.body.razorpay_order_id || "").trim();
    const signature = (req.body.razorpaySignature || req.body.razorpay_signature || "").trim();
    const purchaseId = req.body.purchaseId;

    const { keySecret } = getRazorpayConfig();

    if (!keySecret) {
      return res.status(503).json({ error: "Razorpay payment gateway secret is not configured on the server" });
    }

    if (!paymentId || !signature) {
      return res.status(400).json({
        error: "Missing required payment verification parameters (razorpay_payment_id, razorpay_signature required)",
      });
    }

    // Find purchase either by purchaseId or by razorpayOrderId
    let purchase = purchaseId
      ? await prisma.purchase.findUnique({ where: { id: purchaseId } })
      : null;

    if (!purchase && orderId) {
      purchase = await prisma.purchase.findFirst({
        where: { razorpayOrderId: orderId },
      });
    }

    const orderIdToVerify = orderId || purchase?.razorpayOrderId;
    if (!orderIdToVerify) {
      return res.status(400).json({
        error: "Missing order_id for signature verification",
      });
    }

    // Strict cryptographic HMAC SHA-256 signature verification
    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderIdToVerify}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Razorpay signature verification mismatch for order:", orderIdToVerify);
      return res.status(400).json({
        success: false,
        isVerified: false,
        error: "Payment verification failed: Invalid digital signature from Razorpay",
      });
    }

    if (purchase) {
      if (purchase.status === PurchaseStatus.COMPLETED) {
        const existingBalance = await prisma.usageBalance.findUnique({ where: { userId: purchase.userId } });
        return res.json({
          success: true,
          isVerified: true,
          message: "Purchase already processed",
          usageBalance: existingBalance,
        });
      }

      const result = await creditPurchase(purchase.id, paymentId);
      return res.json({
        success: true,
        isVerified: true,
        message: "Payment successfully verified and balance credited!",
        usageBalance: result.usageBalance,
      });
    }

    return res.json({
      success: true,
      isVerified: true,
      message: "Payment signature verified successfully",
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ error: "Failed to verify transaction" });
  }
});

// Razorpay Webhook Endpoint for Asynchronous Payment Settle (100% Reliable Delivery)
router.post("/webhook", async (req: any, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const { webhookSecret } = getRazorpayConfig();

    if (!webhookSecret || !signature) {
      return res.status(400).json({ error: "Webhook secret or signature missing" });
    }

    const bodyToVerify = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyToVerify)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("Invalid webhook signature received from Razorpay");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body?.event;
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || req.body?.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const purchase = await prisma.purchase.findFirst({
          where: { razorpayOrderId: orderId },
        });

        if (purchase && purchase.status !== PurchaseStatus.COMPLETED) {
          await creditPurchase(purchase.id, paymentId);
          console.log(`✅ Webhook: successfully credited purchase ${purchase.id} for order ${orderId}`);
        }
      }
    }

    return res.json({ status: "ok" });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: "Webhook handling failed" });
  }
});

// User's purchase and transaction ledger history
router.get("/history", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: { transactions: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ purchases });
  } catch (error: any) {
    console.error("Payment history error:", error);
    return res.status(500).json({ error: "Failed to retrieve billing history" });
  }
});

// Redeem VIP / Friend Promo Code (Grants 100% Free Premium Access)
router.post("/redeem-code", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Please provide a valid VIP promo code" });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Valid VIP Promo Codes
    const envVipCode = (process.env.VIP_PROMO_CODE || "").trim().toUpperCase();
    const isFullVip =
      normalizedCode === "FRIENDS_VIP" ||
      normalizedCode === "MUDIT_VIP" ||
      normalizedCode === "OMEGLE_PLUS_VIP" ||
      normalizedCode === "VIP_FREE" ||
      normalizedCode === "SUPERUSER" ||
      (envVipCode && normalizedCode === envVipCode);

    const isVideoOnly = normalizedCode === "FREE_VIDEO" || normalizedCode === "VIP_VIDEO";
    const isTextOnly = normalizedCode === "FREE_TEXT" || normalizedCode === "VIP_TEXT";
    const isDatingOnly = normalizedCode === "FREE_DATING" || normalizedCode === "VIP_DATING";

    if (!isFullVip && !isVideoOnly && !isTextOnly && !isDatingOnly) {
      return res.status(400).json({
        error: "Invalid promo code. Use 'FRIENDS_VIP' or ask the admin for a valid friend pass.",
      });
    }

    let usageBalance = await prisma.usageBalance.findUnique({ where: { userId } });
    if (!usageBalance) {
      usageBalance = await prisma.usageBalance.create({
        data: { userId },
      });
    }

    let addedVideoSeconds = 0;
    let addedTextSeconds = 0;
    let updatedDatingExpiresAt: Date | null = usageBalance.datingPremiumExpiresAt;
    let passName = "";

    // 1. Full VIP (500 hours Video + 500 hours Text + 1 Year Dating)
    if (isFullVip) {
      addedVideoSeconds = 500 * 60 * 60; // 1,800,000 seconds (30,000 mins)
      addedTextSeconds = 500 * 60 * 60;  // 1,800,000 seconds (30,000 mins)
      const currentExpiry =
        usageBalance.datingPremiumExpiresAt && new Date(usageBalance.datingPremiumExpiresAt) > new Date()
          ? new Date(usageBalance.datingPremiumExpiresAt)
          : new Date();
      updatedDatingExpiresAt = new Date(currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      passName = "Friends & Family Full VIP All-Access Pass (500 hrs Video + 500 hrs Text + 1 Yr Dating)";
    } else if (isVideoOnly) {
      addedVideoSeconds = 100 * 60 * 60; // 100 hours
      passName = "100-Hour Free Video Pass";
    } else if (isTextOnly) {
      addedTextSeconds = 100 * 60 * 60; // 100 hours
      passName = "100-Hour Free Text Pass";
    } else if (isDatingOnly) {
      const currentExpiry =
        usageBalance.datingPremiumExpiresAt && new Date(usageBalance.datingPremiumExpiresAt) > new Date()
          ? new Date(usageBalance.datingPremiumExpiresAt)
          : new Date();
      updatedDatingExpiresAt = new Date(currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000);
      passName = "1-Year Premium Dating Pass";
    }

    const newVideoSeconds = usageBalance.paidVideoSecondsAvailable + addedVideoSeconds;
    const newTextSeconds = usageBalance.paidTextSecondsAvailable + addedTextSeconds;

    // Update balances
    const updated = await prisma.usageBalance.update({
      where: { userId },
      data: {
        paidVideoSecondsAvailable: newVideoSeconds,
        paidTextSecondsAvailable: newTextSeconds,
        datingPremiumExpiresAt: updatedDatingExpiresAt,
      },
    });

    // Record transaction in ledger for audit
    await prisma.paymentTransaction.create({
      data: {
        userId,
        transactionLedgerType: "CREDIT",
        productType: isFullVip ? ProductType.VIDEO_PACK_60M : (isVideoOnly ? ProductType.VIDEO_PACK_60M : (isTextOnly ? ProductType.TEXT_PACK_180M : ProductType.DATING_PASS_7D)),
        unitsSeconds: addedVideoSeconds + addedTextSeconds,
        balanceAfterSeconds: newVideoSeconds + newTextSeconds,
        remarks: `Redeemed VIP Friend Pass Code [${normalizedCode}]: ${passName}`,
      },
    });

    return res.json({
      success: true,
      message: `🎉 VIP Friend Pass Activated! You received ${passName} for FREE!`,
      code: normalizedCode,
      passName,
      usageBalance: updated,
    });
  } catch (error: any) {
    console.error("Redeem code error:", error);
    return res.status(500).json({ error: "Failed to redeem promo code. Please try again." });
  }
});

export default router;

