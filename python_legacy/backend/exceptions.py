"""
Кастомные классы исключений для SQL Assistant.

Централизованная обработка ошибок:
- Каждое исключение соответствует HTTP статусу
- FastAPI exception_handler преобразует их в структурированный JSON
"""


class SQLAssistantError(Exception):
    """Базовый класс для всех ошибок приложения."""
    http_status_code = 500
    error_code = "INTERNAL_ERROR"

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class AuthError(SQLAssistantError):
    """Ошибка аутентификации (неверный или отсутствующий SecretKey)."""
    http_status_code = 401
    error_code = "UNAUTHORIZED"


class PromptInjectionError(SQLAssistantError):
    """Обнаружена попытка инъекции в промпт."""
    http_status_code = 400
    error_code = "PROMPT_INJECTION"


class OffTopicError(SQLAssistantError):
    """Промпт не относится к базам данных или SQL."""
    http_status_code = 400
    error_code = "OFF_TOPIC"


class LLMParseError(SQLAssistantError):
    """Не удалось распарсить ответ LLM в JSON."""
    http_status_code = 502
    error_code = "LLM_PARSE_ERROR"


class LLMAPIError(SQLAssistantError):
    """Ошибка при вызове OpenAI API."""
    http_status_code = 502
    error_code = "LLM_API_ERROR"


class RateLimitError(SQLAssistantError):
    """Превышен лимит запросов."""
    http_status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"
