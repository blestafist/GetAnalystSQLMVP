const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

let bundledConfig = null;
try {
  bundledConfig = require("../../../config.json");
} catch (_error) {}

/**
 * Загружает публичный config.json.
 * В отличие от .env, это не секретные данные и они отдаются фронтенду.
 */
function loadConfig() {
  const candidatePaths = [
    path.resolve(process.cwd(), "config.json"),
    path.resolve(__dirname, "../../../config.json")
  ];

  const configPath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));
  if (configPath) {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  }

  if (bundledConfig) {
    return bundledConfig;
  }

  throw new Error(`config.json не найден. Проверены пути: ${candidatePaths.join(", ")}`);
}

function getEnvSettings() {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    SECRET_KEY_HASH: process.env.SECRET_KEY_HASH || ""
  };
}

/**
 * Возвращает runtime-настройки (config + env).
 * Вызывается внутри handler, чтобы любые изменения .env/.json применялись без перезапуска.
 */
function getSettings() {
  const envSettings = getEnvSettings();
  const config = loadConfig();

  return {
    ...envSettings,
    appConfig: config
  };
}

module.exports = { getSettings, getEnvSettings };
