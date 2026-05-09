const fs = require("node:fs");
const path = require("node:path");

/**
 * Простой логгер в стиле Python-версии:
 * - WARNING и ERROR пишем и в консоль, и в logs/app.log.
 * - INFO/DEBUG оставляем в консоли для локальной отладки.
 */
const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "", "utf-8");
  }
}

function timestamp() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function write(level, moduleName, message) {
  const line = `[${timestamp()}] [${level}] [${moduleName}] — ${message}`;
  console.log(line);
  if (level === "WARNING" || level === "ERROR") {
    ensureLogFile();
    fs.appendFileSync(LOG_FILE, `${line}\n`, "utf-8");
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

