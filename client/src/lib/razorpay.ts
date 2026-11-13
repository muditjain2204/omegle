import { verifyPayment, UserProfile } from "./api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayOrderPayload {
  purchaseId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  productType: string;
  description?: string;
  keyId: string;
}

export interface CheckoutOptions {
  orderData: RazorpayOrderPayload;
  user: UserProfile | null;
  onSuccess: (verifyResult: any) => void;
  onError: (error: any) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout({
  orderData,
  user,
  onSuccess,
  onError,
  onDismiss,
}: CheckoutOptions) {
  if (!orderData.keyId) {
    onError(new Error("Razorpay Key ID is not configured. Please set up the payment gateway in production."));
    return;
  }

  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    onError(new Error("Unable to load Razorpay payment window. Please check your internet connection."));
    return;
  }

  try {
    const options: any = {
      key: orderData.keyId,
      amount: orderData.amountPaise,
      currency: orderData.currency || "INR",
      name: "OmeglePlus",
      description: orderData.description || "Premium Social Discovery",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
      order_id: orderData.orderId,
      handler: async function (response: any) {
        try {
          const verifyRes = await verifyPayment(
            orderData.purchaseId,
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature
          );
          onSuccess(verifyRes);
        } catch (err) {
          onError(err);
        }
      },
      prefill: {
        name: user?.profile?.displayName || "OmeglePlus User",
        email: user?.email || "",
      },
      notes: {
        purchaseId: orderData.purchaseId,
        productType: orderData.productType,
      },
      theme: {
        color: "#2563eb",
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (resp: any) {
      const msg = resp.error?.description || "Payment failed at gateway";
      onError(new Error(msg));
    });
    rzp.open();
  } catch (err: any) {
    onError(err);
  }
}
