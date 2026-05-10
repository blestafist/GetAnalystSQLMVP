const fs = require("node:fs");
const path = require("node:path");
const { createLogger } = require("./logger");

const logger = createLogger("usage_tracker");

/**
 * Трекер использования токенов OpenAI API.
 *
 * Записывает статистику вызовов в usage.json:
 * - Общее количество вызовов
 * - Суммарное количество токенов
 * - Детальный лог каждого запроса с timestamp, моделью, токенами
 *
 * Для локальной разработки пишет в корень проекта.
 * В serverless окружении (Netlify) пытается писать в /tmp (эфемерное хранилище).
 * Ошибки записи не прерывают основной запрос (best-effort logging).
 */
class UsageTracker {
  constructor() {
    this.usageFile = this.resolveUsageFilePath();
    this.ensureUsageFile();
  }

  /**
   * Определяет доступный путь для записи usage.json.
   *
   * Пробует кандидатов в порядке приоритета:
   * 1. ./usage.json (локальная разработка)
   * 2. /tmp/getanalyst/usage.json (serverless окружение)
   *
   * @returns {string} Путь к файлу usage.json (может быть недоступен для записи)
   */
  resolveUsageFilePath() {
    const candidates = [path.resolve(process.cwd(), "usage.json"), path.resolve("/tmp/getanalyst/usage.json")];

    for (const candidate of candidates) {
      try {
        fs.mkdirSync(path.dirname(candidate), { recursive: true });
        fs.appendFileSync(candidate, "", "utf-8");
        return candidate;
      } catch (_error) {}
    }

    return candidates[0];
  }

  /**
   * Создаёт usage.json с начальной структурой, если файл не существует.
   *
   * @throws Не выбрасывает исключения - логирует предупреждение при ошибке
   */
  ensureUsageFile() {
    try {
      if (!fs.existsSync(this.usageFile) || fs.statSync(this.usageFile).size === 0) {
        fs.writeFileSync(
          this.usageFile,
          JSON.stringify({ calls: 0, total_tokens: 0, log: [] }, null, 2),
          "utf-8"
        );
      }
    } catch (error) {
      logger.warning(`Usage storage unavailable: ${error.message}`);
    }
  }

  /**
   * Читает текущую статистику из usage.json.
   *
   * @returns {Object} Объект статистики: {calls: number, total_tokens: number, log: Array}
   * @returns {number} return.calls - Общее количество вызовов API
   * @returns {number} return.total_tokens - Суммарное количество токенов
   * @returns {Array} return.log - Массив записей с деталями каждого вызова
   */
  readUsage() {
    try {
      return JSON.parse(fs.readFileSync(this.usageFile, "utf-8"));
    } catch {
      return { calls: 0, total_tokens: 0, log: [] };
    }
  }

  /**
   * Записывает обновлённую статистику в usage.json.
   *
   * @param {Object} data - Объект статистики для записи
   */
  writeUsage(data) {
    fs.writeFileSync(this.usageFile, JSON.stringify(data, null, 2), "utf-8");
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
