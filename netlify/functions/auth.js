const { getEnvSettings } = require("./_lib/settings");
const { verifySecretKey } = require("./_lib/auth");
const { ok, fail, BASE_HEADERS } = require("./_lib/http");
const { SQLAssistantError } = require("./_lib/errors");

/**
 * POST /auth
 *
 * Проверяет валидность SecretKey из заголовка X-Secret-Key.
 * Используется фронтендом при первом входе для проверки ключа доступа.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP метод запроса (должен быть POST)
 * @param {Object} event.headers - HTTP заголовки запроса, должны содержать X-Secret-Key
 *
 * @returns {Object} Netlify function response
 * @returns {number} return.statusCode - 200 при успехе, 401 при неверном ключе, 405 при неверном методе
 * @returns {Object} return.headers - HTTP заголовки ответа с CORS
 * @returns {string} return.body - JSON строка с результатом: {"authenticated": true} или {"error": true, "code": "...", "message": "..."}
 *
 * @example
 * // Успешный запрос:
 * // Headers: { "X-Secret-Key": "valid_key_here" }
 * // Response: { "authenticated": true }
 *
 * @example
 * // Неверный ключ:
 * // Response: { "error": true, "code": "UNAUTHORIZED", "message": "Неверный SecretKey." }
 */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: BASE_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return fail(new SQLAssistantError("Method Not Allowed", "METHOD_NOT_ALLOWED", 405));
  }

  try {
    const settings = getEnvSettings();
    verifySecretKey(event.headers || {}, settings.SECRET_KEY_HASH);
    return ok({ authenticated: true });
  } catch (error) {
    return fail(error);
  }
};
