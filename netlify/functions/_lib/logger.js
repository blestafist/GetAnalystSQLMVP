const fs = require("node:fs");
const path = require("node:path");

/**
 * Простой логгер в стиле Python-версии:
 * - WARNING и ERROR пишем и в консоль, и в logs/app.log.
 * - INFO/DEBUG оставляем в консоли для локальной отладки.
 */
const LOG_CANDIDATES = [
  path.resolve(process.cwd(), "logs", "app.log"),
  path.resolve("/tmp/getanalyst/logs/app.log")
];

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

function timestamp() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

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

function createLogger(moduleName = "sql_assistant") {
  return {
    info: (message) => write("INFO", moduleName, message),
    warning: (message) => write("WARNING", moduleName, message),
    error: (message) => write("ERROR", moduleName, message),
    debug: (message) => write("DEBUG", moduleName, message)
  };
}

module.exports = { createLogger };
