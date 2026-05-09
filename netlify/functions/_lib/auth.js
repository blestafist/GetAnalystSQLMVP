const bcrypt = require("bcryptjs");
const { AuthError } = require("./errors");

/**
 * Проверка SecretKey полностью повторяет Python-логику:
 * 1) читаем X-Secret-Key
 * 2) отклоняем пустой ключ
 * 3) bcrypt.compareSync(raw, hash)
 * 4) возвращаем 401 при несовпадении
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

