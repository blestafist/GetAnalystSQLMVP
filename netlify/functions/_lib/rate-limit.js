const { RateLimitError } = require("./errors");

/**
 * In-memory rate limiter для защиты от злоупотреблений.
 *
 * Ограничивает количество запросов с одного IP-адреса в минуту.
 * Для serverless окружения это best-effort лимит: работает в рамках тёплого инстанса функции.
 * При холодном старте счётчики сбрасываются.
 *
 * Использует скользящее окно (sliding window) на 60 секунд.
 */
const bucket = new Map();

/**
 * Извлекает IP-адрес клиента из заголовков запроса.
 *
 * @param {Object} [headers={}] - HTTP заголовки запроса
 *
 * @returns {string} IP-адрес клиента или "unknown" если не удалось определить
 *
 * @example
 * const ip = extractClientIp({ "X-Forwarded-For": "203.0.113.1, 198.51.100.2" });
 * // ip = "203.0.113.1"
 */
function extractClientIp(headers = {}) {
  const xff = headers["x-forwarded-for"] || headers["X-Forwarded-For"] || "";
  if (!xff) return "unknown";
  return xff.split(",")[0].trim() || "unknown";
}

/**
 * Применяет rate limiting к запросу.
 *
 * Проверяет количество запросов с IP-адреса клиента за последнюю минуту.
 * Использует скользящее окно: счётчик сбрасывается через 60 секунд после первого запроса в окне.
 *
 * @param {Object} headers - HTTP заголовки запроса (для извлечения IP)
 * @param {number} requestsPerMinute - Максимальное количество запросов в минуту
 *
 * @throws {RateLimitError} Если превышен лимит запросов (HTTP 429)
 *
 * @example
 * applyRateLimit(event.headers, 10); // Разрешает 10 запросов в минуту
 */
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

