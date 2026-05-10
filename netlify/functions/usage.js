const { getEnvSettings } = require("./_lib/settings");
const { verifySecretKey } = require("./_lib/auth");
const { UsageTracker } = require("./_lib/usage-tracker");
const { ok, fail, BASE_HEADERS } = require("./_lib/http");
const { SQLAssistantError } = require("./_lib/errors");

/**
 * GET /usage
 *
 * Защищённый эндпоинт для просмотра статистики использования токенов.
 * Требует аутентификацию через заголовок X-Secret-Key.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP метод запроса
 * @param {Object} event.headers - HTTP заголовки запроса
 *
 * @returns {Object} Netlify function response
 * @returns {number} return.statusCode - HTTP статус код
 * @returns {Object} return.headers - HTTP заголовки ответа
 * @returns {string} return.body - JSON строка с данными статистики
 *
 * @example
 * // Успешный ответ:
 * {
 *   "calls": 42,
 *   "total_tokens": 158340,
 *   "log": [
 *     {
 *       "timestamp": "2026-05-10T09:30:00.000Z",
 *       "model": "gpt-5.4",
 *       "prompt_tokens": 312,
 *       "completion_tokens": 480,
 *       "total_tokens": 792,
 *       "temperature": 0.7,
 *       "validation_reason": "ok"
 *     }
 *   ]
 * }
 */
exports.handler = async (event) => {
  // Обработка preflight CORS запроса
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: BASE_HEADERS, body: "" };
  }

  // Разрешаем только GET запросы
  if (event.httpMethod !== "GET") {
    return fail(new SQLAssistantError("Method Not Allowed", "METHOD_NOT_ALLOWED", 405));
  }

  try {
    // Проверяем аутентификацию
    const settings = getEnvSettings();
    verifySecretKey(event.headers || {}, settings.SECRET_KEY_HASH);

    // Читаем статистику использования
    const tracker = new UsageTracker();
    const usageData = tracker.readUsage();

    // Возвращаем данные
    return ok(usageData);
  } catch (error) {
    return fail(error);
  }
};
