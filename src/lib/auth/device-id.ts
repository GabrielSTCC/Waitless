const STORAGE_KEY = "waitless-device-id";

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `device-${Date.now()}`;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateDeviceId();
  }
}

export function getDeviceHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return {
    "X-Waitless-Device-Id": getDeviceId(),
    "X-Waitless-User-Agent": navigator.userAgent,
  };
}
