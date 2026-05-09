"""
Основной модуль FastAPI приложения SQL Assistant.

Настройка:
- CORS для фронтенда
- Rate limiting через slowapi
- Exception handlers для кастомных исключений
- Три основных эндпоинта: /, /config, /generate
"""

import json
from pathlib import Path
from fastapi import FastAPI, Request, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.config import settings
from backend.auth import verify_secret_key
from backend.models import GenerateRequest, GenerateResponse, ErrorResponse, ConfigResponse
from backend.exceptions import SQLAssistantError, RateLimitError
from backend.logger import logger
from backend.services.validator import PromptValidator
from backend.services.llm import LLMService
from backend.services.usage_tracker import UsageTracker


# Инициализация FastAPI
app = FastAPI(
    title="SQL Assistant API",
    description="Генерация SQL и ER-диаграмм через AI",
    version="1.0.0"
)


# CORS: разрешаем запросы с фронтенда (localhost и потенциальный продакшн)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Rate limiting (slowapi)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


# Инициализация сервисов
validator = PromptValidator(
    api_key=settings.OPENAI_API_KEY,
    validation_model=settings.validation_model
)
llm_service = LLMService(api_key=settings.OPENAI_API_KEY)
usage_tracker = UsageTracker(usage_file="usage.json")


# Exception handlers для кастомных ошибок
@app.exception_handler(SQLAssistantError)
async def sql_assistant_error_handler(request: Request, exc: SQLAssistantError):
    """
    Преобразует кастомные исключения в структурированный JSON с правильным HTTP кодом.
    """
    logger.warning(f"{exc.error_code}: {exc.message}")
    return JSONResponse(
        status_code=exc.http_status_code,
        content={
            "error": True,
            "code": exc.error_code,
            "message": exc.message
        }
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    """
    Обработчик для ошибок rate limiting от slowapi.
    """
    return JSONResponse(
        status_code=429,
        content={
            "error": True,
            "code": "RATE_LIMIT_EXCEEDED",
            "message": "Превышен лимит запросов. Пожалуйста, повторите попытку позже."
        }
    )


# Зависимость для проверки SecretKey
def auth_dependency(request: Request):
    """Зависимость FastAPI для проверки SecretKey."""
    verify_secret_key(request, settings.SECRET_KEY_HASH)


# ============================================================================
# ЭНДПОИНТЫ
# ============================================================================

@app.get("/", responses={200: {"description": "HTML страница приложения"}})
async def root():
    """
    Отдаёт основную HTML страницу приложения (SPA).
    """
    html_path = Path(__file__).parent.parent / "frontend" / "index.html"
    if not html_path.exists():
        return JSONResponse(
            status_code=404,
            content={
                "error": True,
                "code": "NOT_FOUND",
                "message": "frontend/index.html не найден"
            }
        )
    return FileResponse(html_path, media_type="text/html")


@app.get("/config", response_model=ConfigResponse)
async def get_config():
    """
    Возвращает публичную конфигурацию приложения (без секретов).
    
    Используется фронтендом для инициализации UI (список моделей, цвета и т.д.).
    """
    return ConfigResponse(
        models=[model.model_dump() for model in settings.models],
        validation_model=settings.validation_model,
        rate_limit=settings.rate_limit.model_dump(),
        accent_color=settings.accent_color
    )


@app.post(
    "/generate",
    response_model=GenerateResponse,
    dependencies=[Depends(auth_dependency)],
    responses={
        200: {"model": GenerateResponse, "description": "Успешная генерация"},
        400: {"model": ErrorResponse, "description": "Ошибка валидации промпта"},
        401: {"model": ErrorResponse, "description": "Неверный SecretKey"},
        429: {"model": ErrorResponse, "description": "Превышен rate limit"},
        502: {"model": ErrorResponse, "description": "Ошибка LLM"},
    }
)
@limiter.limit("10/minute")  # 10 запросов в минуту
async def generate(request: Request, payload: GenerateRequest):
    """
    Основной эндпоинт генерации SQL и диаграммы.
    
    Требует заголовок X-Secret-Key с верным ключом.
    
    Args:
        request: FastAPI Request (для rate limiting)
        payload: GenerateRequest с полями prompt, model, temperature
        
    Returns:
        GenerateResponse с mermaid_code, sql_query, explanation
    """
    logger.warning(f"Запрос генерации: модель={payload.model}, длина_промпта={len(payload.prompt)}")

    # Шаг 1: Валидация промпта (проверка на injection и off-topic)
    validator.validate(payload.prompt)

    # Шаг 2: Вызов основного LLM для генерации
    result = llm_service.generate(
        prompt=payload.prompt,
        model=payload.model,
        temperature=payload.temperature
    )

    # Шаг 3: Извлекаем usage данные из результата
    usage_data = result.pop("_usage", None)

    # Шаг 4: Записываем статистику использования
    if usage_data:
        usage_tracker.track(
            model=payload.model,
            prompt_tokens=usage_data["prompt_tokens"],
            completion_tokens=usage_data["completion_tokens"],
            temperature=payload.temperature
        )

    # Возвращаем результат
    return GenerateResponse(
        mermaid_code=result["mermaid_code"],
        sql_query=result["sql_query"],
        explanation=result["explanation"]
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
