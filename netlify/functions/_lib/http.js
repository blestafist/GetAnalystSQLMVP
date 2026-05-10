const { SQLAssistantError } = require("./errors");

/**
 * Стандартные HTTP заголовки для JSON API с CORS.
 *
 * CORS оставлен открытым (*) для упрощения локальной разработки и интеграций.
 * В production рекомендуется ограничить Access-Control-Allow-Origin конкретным доменом.
 */
const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Secret-Key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

/**
 * Формирует успешный JSON-ответ для Netlify Functions.
 *
 * @param {Object} body - Объект данных для сериализации в JSON
 * @param {number} [statusCode=200] - HTTP статус код
 *
 * @returns {Object} Netlify function response object
 * @returns {number} return.statusCode - HTTP статус код
 * @returns {Object} return.headers - HTTP заголовки с CORS
 * @returns {string} return.body - JSON строка
 *
 * @example
 * return ok({ message: "Success", data: {...} });
 * // { statusCode: 200, headers: {...}, body: '{"message":"Success","data":{...}}' }
 */
function ok(body, statusCode = 200) {
  return {
    statusCode,
    headers: BASE_HEADERS,
    body: JSON.stringify(body)
  };
}

/**
 * Формирует предсказуемый JSON-ответ с ошибкой для фронтенда.
 *
 * Преобразует кастомные исключения SQLAssistantError в структурированный JSON.
 * Для неизвестных ошибок возвращает generic 500 Internal Server Error.
 *
 * @param {Error} error - Объект ошибки (предпочтительно SQLAssistantError)
 *
 * @returns {Object} Netlify function response object
 * @returns {number} return.statusCode - HTTP статус код ошибки
 * @returns {Object} return.headers - HTTP заголовки с CORS
 * @returns {string} return.body - JSON строка с полями: error, code, message
 *
 * @example
 * return fail(new AuthError("Неверный ключ"));
 * // { statusCode: 401, headers: {...}, body: '{"error":true,"code":"UNAUTHORIZED","message":"Неверный ключ"}' }
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

