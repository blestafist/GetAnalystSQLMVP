const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Загружает публичный config.json.
 * В отличие от .env, это не секретные данные и они отдаются фронтенду.
 */
function loadConfig() {
  const configPath = path.resolve(process.cwd(), "config.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Возвращает runtime-настройки (config + env).
 * Вызывается внутри handler, чтобы любые изменения .env/.json применялись без перезапуска.
 */
function getSettings() {
  const config = loadConfig();

  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    SECRET_KEY_HASH: process.env.SECRET_KEY_HASH || "",
    appConfig: config
  };
}

module.exports = { getSettings };

