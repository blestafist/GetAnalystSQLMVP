const bcrypt = require("bcryptjs");
const { AuthError } = require("./errors");

/**
 * Проверяет SecretKey из заголовка запроса против bcrypt-хэша из .env.
 *
 * Реализует схему аутентификации через bcrypt:
 * 1. Извлекает raw ключ из заголовка X-Secret-Key
 * 2. Отклоняет пустые ключи без вызова bcrypt (оптимизация)
 * 3. Сравнивает через bcrypt.compareSync (защита от brute-force ~250ms)
 * 4. Выбрасывает AuthError при несовпадении
 *
 * @param {Object} headers - HTTP заголовки запроса (case-insensitive)
 * @param {string} secretKeyHash - bcrypt-хэш из переменной окружения SECRET_KEY_HASH
 *
 * @throws {AuthError} Если заголовок отсутствует, пустой или ключ не совпадает с хэшем
 *
 * @example
 * verifySecretKey(
 *   { "X-Secret-Key": "abc123..." },
 *   "$2b$12$..."
 * );
 */
function verifySecretKey(headers, secretKeyHash) {
  const rawKey = headers["x-secret-key"] || headers["X-Secret-Key"] || "";

  if (!rawKey) {
    throw new AuthError("Заголовок X-Secret-Key отсутствует.");
  }

  if (!secretKeyHash) {
    throw new AuthError("SECRET_KEY_HASH не настроен на сервере.");
  }

  const isValid = bcrypt.compareSync(rawKey, secretKeyHash);
  if (!isValid) {
    throw new AuthError("Неверный SecretKey.");
  }
}

module.exports = { verifySecretKey };

