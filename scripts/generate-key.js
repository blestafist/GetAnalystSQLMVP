#!/usr/bin/env node
/**
 * Утилита генерации SecretKey и bcrypt-хэша (JS-эквивалент Python-скрипта).
 *
 * Запуск:
 *   npm run generate:key
 *   или
 *   node scripts/generate-key.js
 *
 * Вывод:
 *   - RAW KEY: передаётся пользователю
 *   - ENV LINE: вставляется в .env на сервере
 */
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

/**
 * Генерирует криптостойкий ключ и его bcrypt-хэш.
 * rawKey: 32 байта -> hex-строка длиной 64 символа.
 */
function generateSecretKey() {
  const rawKey = crypto.randomBytes(32).toString("hex");
  const hashedKey = bcrypt.hashSync(rawKey, 12);
  return { rawKey, hashedKey };
}

const { rawKey, hashedKey } = generateSecretKey();

console.log("=".repeat(60));
console.log("  SQL Assistant — генерация SecretKey");
console.log("=".repeat(60));
console.log();
console.log("  RAW KEY (передать пользователю):");
console.log(`  ${rawKey}`);
console.log();
console.log("  ENV LINE (вставить в .env на сервере):");
console.log(`  SECRET_KEY_HASH=${hashedKey}`);
console.log();
console.log("  ВНИМАНИЕ: сохраните RAW KEY — он больше не будет показан.");
console.log("=".repeat(60));

