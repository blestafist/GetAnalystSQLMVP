/**
 * Простой логгер для Netlify Functions.
 *
 * Логирует сообщения только в консоль (console.log/error).
 * Netlify автоматически захватывает console output в Function Logs.
 * Поддерживает 4 уровня: INFO, DEBUG, WARNING, ERROR.
 *
 * Формат: [TIMESTAMP] [LEVEL] [MODULE] — message
 */

/**
 * Форматирует текущее время для логов.
 *
 * @returns {string} Timestamp в формате "YYYY-MM-DD HH:MM:SS.mmm"
 */
function timestamp() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

/**
 * Записывает сообщение в консоль.
 * Netlify Functions автоматически захватывают console output в логи.
 *
 * @param {string} level - Уровень логирования: INFO, DEBUG, WARNING, ERROR
 * @param {string} moduleName - Имя модуля (для идентификации источника)
 * @param {string} message - Текст сообщения
 */
function write(level, moduleName, message) {
  const line = `[${timestamp()}] [${level}] [${moduleName}] — ${message}`;

  if (level === "ERROR") {
    console.error(line);
  } else {
    console.log(line);
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
