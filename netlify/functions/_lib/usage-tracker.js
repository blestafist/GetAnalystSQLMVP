const { createLogger } = require("./logger");

const logger = createLogger("usage_tracker");

/**
 * Трекер использования токенов OpenAI API.
 *
 * В serverless окружении (Netlify) хранит статистику в памяти (in-memory).
 * Данные сбрасываются при каждом cold start функции.
 *
 * Для персистентного хранения рекомендуется интеграция с:
 * - Netlify Blobs API
 * - Внешней БД (Supabase, MongoDB Atlas, PlanetScale)
 * - Сервисом аналитики (Mixpanel, Amplitude)
 *
 * Записывает статистику вызовов:
 * - Общее количество вызовов
 * - Суммарное количество токенов
 * - Детальный лог каждого запроса с timestamp, моделью, токенами
 */
class UsageTracker {
  constructor() {
    // In-memory storage для serverless окружения
    if (!global.__usageData) {
      global.__usageData = { calls: 0, total_tokens: 0, log: [] };
      logger.info("Usage tracker initialized (in-memory storage)");
    }
  }

  /**
   * Читает текущую статистику из памяти.
   *
   * @returns {Object} Объект статистики: {calls: number, total_tokens: number, log: Array}
   * @returns {number} return.calls - Общее количество вызовов API
   * @returns {number} return.total_tokens - Суммарное количество токенов
   * @returns {Array} return.log - Массив записей с деталями каждого вызова
   */
  readUsage() {
    return global.__usageData || { calls: 0, total_tokens: 0, log: [] };
  }

  /**
   * Записывает обновлённую статистику в память.
   *
   * @param {Object} data - Объект статистики для записи
   */
  writeUsage(data) {
    global.__usageData = data;
  }

  /**
   * Фиксирует статистику вызова OpenAI API.
   *
   * Добавляет запись в лог и обновляет счётчики.
   * Ошибки записи намеренно не пробрасываются, чтобы не ломать основной ответ пользователю.
   *
   * @param {Object} params - Параметры вызова для трекинга
   * @param {string} params.model - ID модели OpenAI (например, "gpt-5.4")
   * @param {number} params.promptTokens - Количество токенов в промпте
   * @param {number} params.completionTokens - Количество токенов в ответе
   * @param {number|null} [params.temperature=null] - Температура генерации
   * @param {string|null} [params.validationReason=null] - Результат валидации промпта
   * @param {string|null} [params.validatorResponse=null] - Сырой ответ валидатора
   *
   * @example
   * tracker.track({
   *   model: "gpt-5.4",
   *   promptTokens: 312,
   *   completionTokens: 480,
   *   temperature: 0.7,
   *   validationReason: "ok"
   * });
   */
  track({
    model,
    promptTokens,
    completionTokens,
    temperature = null,
    validationReason = null,
    validatorResponse = null
  }) {
    try {
      const data = this.readUsage();
      const totalTokens = Number(promptTokens || 0) + Number(completionTokens || 0);
      data.calls += 1;
      data.total_tokens += totalTokens;

      const logEntry = {
        timestamp: new Date().toISOString(),
        model,
        prompt_tokens: promptTokens || 0,
        completion_tokens: completionTokens || 0,
        total_tokens: totalTokens
      };

      if (temperature !== null && temperature !== undefined) {
        logEntry.temperature = temperature;
      }
      if (validationReason !== null) {
        logEntry.validation_reason = validationReason;
      }
      if (validatorResponse !== null) {
        logEntry.validator_response = validatorResponse;
      }

      data.log.push(logEntry);
      this.writeUsage(data);
    } catch (error) {
      logger.error(`Failed to track usage: ${error.message}`);
    }
  }
}

module.exports = { UsageTracker };
