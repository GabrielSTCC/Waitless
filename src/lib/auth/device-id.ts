const STORAGE_KEY = "waitless-device-id";

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
