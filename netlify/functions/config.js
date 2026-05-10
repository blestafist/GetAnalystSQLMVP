const { getSettings } = require("./_lib/settings");
const { ok, fail, BASE_HEADERS } = require("./_lib/http");
const { SQLAssistantError } = require("./_lib/errors");

/**
 * GET /config
 *
 * Публичный эндпоинт для получения конфигурации приложения.
 * Возвращает только несекретные параметры: список моделей, настройки UI, rate limits.
 * Не требует аутентификации.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP метод запроса (должен быть GET)
 *
 * @returns {Object} Netlify function response
 * @returns {number} return.statusCode - 200 при успехе, 405 при неверном методе
 * @returns {Object} return.headers - HTTP заголовки ответа с CORS
 * @returns {string} return.body - JSON строка с конфигурацией
 *
 * @example
 * // Успешный ответ:
 * {
 *   "models": [
 *     {
 *       "id": "gpt-5.4",
 *       "display_name": "OpenAI - GPT-5.4",
 *       "supports_temperature": true,
 *       "temperature_range": [0.0, 1.0],
 *       "default_temperature": 0.7
 *     }
 *   ],
 *   "validation_model": "gpt-5.4-nano",
 *   "rate_limit": { "requests_per_minute": 10 },
 *   "accent_color": "#6750A4"
 * }
 */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: BASE_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return fail(new SQLAssistantError("Method Not Allowed", "METHOD_NOT_ALLOWED", 405));
  }

  try {
    const settings = getSettings();
    const config = settings.appConfig;

    return ok({
      models: config.models,
      validation_model: config.validation_model,
      rate_limit: config.rate_limit,
      accent_color: config.accent_color
    });
  } catch (error) {
    return fail(error);
  }
};

