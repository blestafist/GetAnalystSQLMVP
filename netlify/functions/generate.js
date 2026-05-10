const { getSettings } = require("./_lib/settings");
const { verifySecretKey } = require("./_lib/auth");
const { applyRateLimit } = require("./_lib/rate-limit");
const { PromptValidator } = require("./_lib/validator");
const { LLMService } = require("./_lib/llm");
const { UsageTracker } = require("./_lib/usage-tracker");
const { createLogger } = require("./_lib/logger");
const { ok, fail, BASE_HEADERS } = require("./_lib/http");
const { SQLAssistantError } = require("./_lib/errors");

const logger = createLogger("generate");

/**
 * Валидация входящего JSON payload (аналог Pydantic-схемы из Python).
 *
 * @param {Object} payload - Тело запроса от клиента
 * @param {string} payload.prompt - Текстовый запрос пользователя (1-2000 символов)
 * @param {string} payload.model - ID модели OpenAI для генерации
 * @param {number|null} [payload.temperature] - Температура генерации (0.0-2.0) или null
 *
 * @throws {SQLAssistantError} Если payload не соответствует требованиям
 *
 * @example
 * validatePayload({
 *   prompt: "Показать всех клиентов с более чем 3 заказами",
 *   model: "gpt-5.4",
 *   temperature: 0.7
 * });
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new SQLAssistantError("Тело запроса должно быть JSON-объектом.", "VALIDATION_ERROR", 422);
  }

  if (typeof payload.prompt !== "string" || payload.prompt.trim().length < 1 || payload.prompt.length > 2000) {
    throw new SQLAssistantError("Поле prompt должно быть строкой от 1 до 2000 символов.", "VALIDATION_ERROR", 422);
  }

  if (typeof payload.model !== "string" || payload.model.trim().length < 1) {
    throw new SQLAssistantError("Поле model обязательно и должно быть строкой.", "VALIDATION_ERROR", 422);
  }

  if (
    payload.temperature !== null &&
    payload.temperature !== undefined &&
    (typeof payload.temperature !== "number" || payload.temperature < 0 || payload.temperature > 2)
  ) {
    throw new SQLAssistantError("Поле temperature должно быть числом от 0 до 2.", "VALIDATION_ERROR", 422);
  }
}

/**
 * POST /generate
 *
 * Основной эндпоинт для генерации SQL-запросов и ER-диаграмм.
 * Требует аутентификацию через X-Secret-Key и применяет rate limiting.
 *
 * Процесс обработки:
 * 1. Проверка аутентификации (X-Secret-Key)
 * 2. Применение rate limiting (10 запросов/минуту по умолчанию)
 * 3. Валидация промпта на injection/off-topic через gpt-5.4-nano
 * 4. Генерация SQL + ER-диаграммы через выбранную модель OpenAI
 * 5. Трекинг использования токенов в usage.json
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP метод запроса (должен быть POST)
 * @param {Object} event.headers - HTTP заголовки, должны содержать X-Secret-Key
 * @param {string} event.body - JSON строка с payload: {prompt, model, temperature}
 *
 * @returns {Object} Netlify function response
 * @returns {number} return.statusCode - 200 при успехе, 401/400/429/500 при ошибках
 * @returns {Object} return.headers - HTTP заголовки ответа с CORS
 * @returns {string} return.body - JSON строка с результатом генерации
 *
 * @example
 * // Успешный запрос:
 * // POST /generate
 * // Headers: { "X-Secret-Key": "...", "Content-Type": "application/json" }
 * // Body: { "prompt": "Показать клиентов с >3 заказами", "model": "gpt-5.4", "temperature": 0.7 }
 * // Response: {
 * //   "mermaid_code": "erDiagram\n  CUSTOMERS ||--o{ ORDERS : places\n  ...",
 * //   "sql_query": "SELECT c.name, COUNT(o.id) ...",
 * //   "explanation": "Запрос джойнит таблицы..."
 * // }
 */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: BASE_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return fail(new SQLAssistantError("Method Not Allowed", "METHOD_NOT_ALLOWED", 405));
  }

  try {
    const settings = getSettings();
    const config = settings.appConfig;

    if (!settings.OPENAI_API_KEY) {
      throw new SQLAssistantError("OPENAI_API_KEY не установлен.", "CONFIG_ERROR", 500);
    }

    verifySecretKey(event.headers || {}, settings.SECRET_KEY_HASH);
    applyRateLimit(event.headers || {}, config.rate_limit?.requests_per_minute || 10);

    const payload = JSON.parse(event.body || "{}");
    validatePayload(payload);

    logger.warning(`Запрос генерации: модель=${payload.model}, длина_промпта=${payload.prompt.length}`);

    const validator = new PromptValidator(settings.OPENAI_API_KEY, config.validation_model);
    const validationResult = await validator.validate(payload.prompt);

    const llmService = new LLMService(settings.OPENAI_API_KEY);
    const result = await llmService.generate(payload.prompt, payload.model, payload.temperature ?? null);

    const usage = result._usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    delete result._usage;

    const tracker = new UsageTracker();
    tracker.track({
      model: payload.model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      temperature: payload.temperature ?? null,
      validationReason: validationResult.reason,
      validatorResponse: validationResult.validator_response
    });

    return ok({
      mermaid_code: result.mermaid_code,
      sql_query: result.sql_query,
      explanation: result.explanation,
      _usage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens
      }
    });
  } catch (error) {
    logger.error(error.message || "Unknown generate error");
    return fail(error);
  }
};

