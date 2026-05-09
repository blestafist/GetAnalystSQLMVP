const { getSettings } = require("./_lib/settings");
const { ok, fail, BASE_HEADERS } = require("./_lib/http");
const { SQLAssistantError } = require("./_lib/errors");

/**
 * GET /config
 * Публичный endpoint: возвращает только несекретные параметры UI/моделей.
 */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: BASE_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return fail(new SQLAssistantError("Method Not Allowed", "METHOD_NOT_ALLOWED", 405));
  }

  try {
    const settings = getSettings();
    const config = settings.appConfig;

    return ok({
      models: config.models,
      validation_model: config.validation_model,
      rate_limit: config.rate_limit,
      accent_color: config.accent_color
    });
  } catch (error) {
    return fail(error);
  }
};

