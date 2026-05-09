const { getEnvSettings } = require("./_lib/settings");
const { verifySecretKey } = require("./_lib/auth");
const { ok, fail, BASE_HEADERS } = require("./_lib/http");
const { SQLAssistantError } = require("./_lib/errors");

/**
 * POST /auth
 * Проверяет X-Secret-Key и возвращает статус авторизации.
 */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: BASE_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return fail(new SQLAssistantError("Method Not Allowed", "METHOD_NOT_ALLOWED", 405));
  }

  try {
    const settings = getEnvSettings();
    verifySecretKey(event.headers || {}, settings.SECRET_KEY_HASH);
    return ok({ authenticated: true });
  } catch (error) {
    return fail(error);
  }
};
