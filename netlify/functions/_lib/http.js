const { SQLAssistantError } = require("./errors");

/**
 * Стандартные заголовки для JSON API.
 * CORS оставлен открытым, чтобы локальная разработка и интеграции не ломались.
 */
const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Secret-Key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

/**
 * Формирует успешный JSON-ответ.
 */
function ok(body, statusCode = 200) {
  return {
    statusCode,
    headers: BASE_HEADERS,
    body: JSON.stringify(body)
  };
}

/**
 * Формирует предсказуемый ответ с ошибкой для фронтенда.
 */
function fail(error) {
  if (error instanceof SQLAssistantError) {
    return {
      statusCode: error.statusCode,
      headers: BASE_HEADERS,
      body: JSON.stringify({
        error: true,
        code: error.errorCode,
        message: error.message
      })
    };
  }

  return {
    statusCode: 500,
    headers: BASE_HEADERS,
    body: JSON.stringify({
      error: true,
      code: "INTERNAL_ERROR",
      message: "Внутренняя ошибка сервера."
    })
  };
}

module.exports = { BASE_HEADERS, ok, fail };

