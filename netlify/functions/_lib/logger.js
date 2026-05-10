const fs = require("node:fs");
const path = require("node:path");

/**
 * Простой логгер в стиле Python-версии.
 *
 * Логирует сообщения в консоль и файл (для WARNING и ERROR).
 * Поддерживает 4 уровня: INFO, DEBUG, WARNING, ERROR.
 *
 * Для локальной разработки пишет в ./logs/app.log.
 * В serverless окружении пытается писать в /tmp/getanalyst/logs/app.log (эфемерное хранилище).
 *
 * Формат: [TIMESTAMP] [LEVEL] [MODULE] — message
 */

/**
 * Кандидаты путей для файла логов (в порядке приоритета).
 */
const LOG_CANDIDATES = [
  path.resolve(process.cwd(), "logs", "app.log"),
  path.resolve("/tmp/getanalyst/logs/app.log")
];

/**
 * Определяет доступный для записи путь к файлу логов.
 *
 * @returns {string|null} Путь к файлу логов или null если запись недоступна
 */
function resolveWritableLogFile() {
  for (const filePath of LOG_CANDIDATES) {
    try {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(filePath, "", "utf-8");
      return filePath;
    } catch (_error) {}
  }
  return null;
}

/**
 * Форматирует текущее время для логов.
 *
 * @returns {string} Timestamp в формате "YYYY-MM-DD HH:MM:SS.mmm"
 */
function timestamp() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

/**
 * Записывает сообщение в консоль и файл (для WARNING/ERROR).
 *
 * @param {string} level - Уровень логирования: INFO, DEBUG, WARNING, ERROR
 * @param {string} moduleName - Имя модуля (для идентификации источника)
 * @param {string} message - Текст сообщения
 */
function write(level, moduleName, message) {
  const line = `[${timestamp()}] [${level}] [${moduleName}] — ${message}`;
  console.log(line);
  if (level === "WARNING" || level === "ERROR") {
    const logFile = resolveWritableLogFile();
    if (!logFile) {
      return;
    }

    try {
      fs.appendFileSync(logFile, `${line}\n`, "utf-8");
    } catch (_error) {}
  }
}

/**
 * Создаёт экземпляр логгера для модуля.
 *
 * @param {string} [moduleName="sql_assistant"] - Имя модуля для логов
 *
 * @returns {Object} Объект логгера с методами: info, warning, error, debug
 *
 * @example
 * const logger = createLogger("my_module");
 * logger.info("Информационное сообщение");
 * logger.warning("Предупреждение");
 * logger.error("Ошибка");
 */
function createLogger(moduleName = "sql_assistant") {
  return {
    info: (message) => write("INFO", moduleName, message),
    warning: (message) => write("WARNING", moduleName, message),
    error: (message) => write("ERROR", moduleName, message),
    debug: (message) => write("DEBUG", moduleName, message)
  };
}

module.exports = { createLogger };
