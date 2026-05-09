const { RateLimitError } = require("./errors");

/**
 * In-memory rate limiter (10 req/min по умолчанию).
 * Для serverless это best-effort лимит: работает в рамках тёплого инстанса функции.
 */
const bucket = new Map();

function extractClientIp(headers = {}) {
  const xff = headers["x-forwarded-for"] || headers["X-Forwarded-For"] || "";
  if (!xff) return "unknown";
  return xff.split(",")[0].trim() || "unknown";
}

function applyRateLimit(headers, requestsPerMinute) {
  const ip = extractClientIp(headers);
  const now = Date.now();
  const windowMs = 60_000;

  const current = bucket.get(ip);
  if (!current || current.resetAt <= now) {
    bucket.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= requestsPerMinute) {
    throw new RateLimitError(
      "Превышен лимит запросов. Пожалуйста, повторите попытку позже."
    );
  }

  current.count += 1;
  bucket.set(ip, current);
}

module.exports = { applyRateLimit };

