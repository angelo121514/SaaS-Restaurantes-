import { APP_CONFIG } from "../config/config";

// --------------------------------------------------------------------
// SESSION / STORAGE HELPERS
// Robust wrappers around localStorage that never throw on parse
// failures and enforce a signed-ish expiry so a stale or hand-forged
// entry cannot grant access indefinitely.
// --------------------------------------------------------------------

const SESSION_DURATION_MS = 1000 * 60 * 60 * 8; // 8 hours

interface StoredSession {
  __exp?: number;
  [key: string]: any;
}

/**
 * Read and validate a JSON session from localStorage.
 * Returns null if the entry is missing, malformed, or expired.
 * Never throws.
 */
export const getStoredSession = (key: string): any | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.__exp && Date.now() > parsed.__exp) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    // Corrupted entry — clear it so the route can recover.
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
};

/** Write a session object to localStorage with an expiry timestamp. */
export const setStoredSession = (key: string, data: any): void => {
  try {
    const payload: StoredSession = {
      ...data,
      __exp: Date.now() + SESSION_DURATION_MS,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* storage full or unavailable — ignore */
  }
};

/** Remove a session entry safely. */
export const clearStoredSession = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

/** Convenience wrappers for the restaurant user session. */
export const getStoredUser = (): any | null => getStoredSession("user");
export const getStoredAdmin = (): any | null => getStoredSession("admin");

export const formatCurrency = (
  amount: number | undefined | null,
  currency: string = "CLP",
  exchangeRate: number = 950,
  isConverted: boolean = false
): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return currency === "USD" ? "$0.00" : "$0";
  }
  
  let finalAmount = amount;
  if (currency === "USD" && !isConverted) {
    finalAmount = amount / exchangeRate;
  }
  
  if (currency === "USD") {
    return `$${finalAmount.toFixed(2)}`;
  } else {
    // CLP: no decimals, dot separator
    return `$${Math.round(finalAmount).toLocaleString("es-CL")}`;
  }
};

/**
 * Generate unique slug from restaurant name
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
};

/**
 * Generate random order number
 */
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${APP_CONFIG.orderPrefix}${timestamp}${random}`;
};

/**
 * Generate temporary password
 */
export const generateTempPassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Calculate order totals
 */
export const calculateOrderTotals = (items: any[]) => {
  const total = items.reduce((sum, item) => sum + item.item_total, 0);
  const subtotal = total / 1.19;
  const tax = total - subtotal;

  return { subtotal, tax, total };
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate phone number (Indian format)
 */
export const isValidPhone = (phone: string): boolean => {
  const re = /^[6-9]\d{9}$/;
  return re.test(phone.replace(/[\s\-()]/g, ""));
};

/**
 * Hash password using SHA-256
 * Works on both HTTP and HTTPS (mobile and desktop)
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Use crypto-js for consistent hashing across all platforms
  const CryptoJS = (await import("crypto-js")).default;
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Get status color class
 */
export const getStatusColor = (status: string): string => {
  const statusConfig =
    APP_CONFIG.orderStatuses[status as keyof typeof APP_CONFIG.orderStatuses];
  return statusConfig?.color || "neutral";
};

/**
 * Calculate item price with size and addons
 */
export const calculateItemPrice = (
  basePrice: number,
  selectedSize?: { price: number },
  selectedAddons?: { price: number }[]
): number => {
  let price = selectedSize ? selectedSize.price : basePrice;
  if (selectedAddons && selectedAddons.length > 0) {
    price += selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  }
  return price;
};

/**
 * Download file
 */
export const downloadFile = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Copy to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Play notification sound
 * Uses native Web Audio API to synthesize a high-fidelity, clean chime sound (ding-dong)
 * self-contained, high-performance, bypassing browser media file limitations.
 */
export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Helper to play a single bell/chime tone with attack and exponential decay
    const playTone = (startTime: number, frequency: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, startTime);
      
      // Clean chime volume envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Smooth decay
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    // Tone 1 ("Ding"): D5 (587.33 Hz) played immediately
    playTone(now, 587.33, 0.5, 0.25);
    // Tone 2 ("Dong"): A5 (880.00 Hz) played slightly delayed
    playTone(now + 0.12, 880.00, 0.7, 0.20);
  } catch (e) {
    console.warn("Audio playback blocked by autoplay policy or unsupported:", e);
  }
};

/**
 * Play sound (alias for playNotificationSound)
 */
export const playSound = (
  _type: "notification" | "success" | "error" = "notification"
) => {
  playNotificationSound();
};
