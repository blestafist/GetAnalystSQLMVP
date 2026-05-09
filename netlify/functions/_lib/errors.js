/**
 * Централизованные классы ошибок для единообразных JSON-ответов API.
 * Мы сохраняем ту же контрактную схему, что была в Python-версии:
 * { error: true, code: "SOME_CODE", message: "Описание" }.
 */
class SQLAssistantError extends Error {
  constructor(message, errorCode = "INTERNAL_ERROR", statusCode = 500) {
    super(message);
    this.name = "SQLAssistantError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

class AuthError extends SQLAssistantError {
  constructor(message) {
    super(message, "UNAUTHORIZED", 401);
    this.name = "AuthError";
  }
}

class PromptInjectionError extends SQLAssistantError {
  constructor(message) {
    super(message, "PROMPT_INJECTION", 400);
    this.name = "PromptInjectionError";
  }
}

class OffTopicError extends SQLAssistantError {
  constructor(message) {
    super(message, "OFF_TOPIC", 400);
    this.name = "OffTopicError";
  }
}

class LLMParseError extends SQLAssistantError {
  constructor(message) {
    super(message, "LLM_PARSE_ERROR", 502);
    this.name = "LLMParseError";
  }
}

class LLMAPIError extends SQLAssistantError {
  constructor(message) {
    super(message, "LLM_API_ERROR", 502);
    this.name = "LLMAPIError";
  }
}

class RateLimitError extends SQLAssistantError {
  constructor(message) {
    super(message, "RATE_LIMIT_EXCEEDED", 429);
    this.name = "RateLimitError";
  }
}

module.exports = {
  SQLAssistantError,
  AuthError,
  PromptInjectionError,
  OffTopicError,
  LLMParseError,
  LLMAPIError,
  RateLimitError
};

