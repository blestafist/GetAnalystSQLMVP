const fs = require("node:fs");
const path = require("node:path");
const { createLogger } = require("./logger");

const logger = createLogger("usage_tracker");

/**
 * Для локальной разработки пишем usage в usage.json в корне проекта.
 * В serverless production файловая система эфемерная, поэтому запись best-effort:
 * приложение продолжит работать, даже если запись статистики недоступна.
 */
class UsageTracker {
  constructor() {
    this.usageFile = this.resolveUsageFilePath();
    this.ensureUsageFile();
  }

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

  readUsage() {
    try {
      return JSON.parse(fs.readFileSync(this.usageFile, "utf-8"));
    } catch {
      return { calls: 0, total_tokens: 0, log: [] };
    }
  }

  writeUsage(data) {
    fs.writeFileSync(this.usageFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Фиксирует статистику вызова OpenAI.
   * Ошибки записи намеренно не пробрасываются, чтобы не ломать основной ответ пользователю.
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
