/**
 * Re-exports for appointment routes (backward compatible).
 * Prefer importing from `@/lib/rate-limit/check-rate-limit`.
 */
export {
  checkRateLimit,
  checkSimpleRateLimit,
  getRequestIp,
  rateLimitResponse,
  type RateLimitResult,
} from "@/lib/rate-limit/check-rate-limit";
