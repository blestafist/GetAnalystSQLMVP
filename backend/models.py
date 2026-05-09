"""
Pydantic модели для валидации входящих/исходящих данных.

Первая линия обороны: все входящие данные валидируются Pydantic
до попадания в бизнес-логику.
"""

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    """Запрос на генерацию SQL и диаграммы."""
    prompt: str = Field(..., min_length=1, max_length=2000, description="Текстовое описание запроса")
    model: str = Field(..., description="ID модели (напр. 'gpt-5.4')")
    temperature: float | None = Field(0.7, ge=0.0, le=2.0, description="Temperature для LLM")


class GenerateResponse(BaseModel):
    """Успешный ответ с SQL, диаграммой и объяснением."""
    mermaid_code: str = Field(..., description="Код ER-диаграммы в формате Mermaid")
    sql_query: str = Field(..., description="Сгенерированный SQL-запрос")
    explanation: str = Field(..., description="Объяснение логики запроса")


class ErrorResponse(BaseModel):
    """Ответ с ошибкой."""
    error: bool = Field(True, description="Флаг ошибки")
    code: str = Field(..., description="Код ошибки (напр. 'UNAUTHORIZED')")
    message: str = Field(..., description="Описание ошибки")


class ConfigResponse(BaseModel):
    """Ответ эндпоинта /config."""
    models: list[dict] = Field(..., description="Список доступных моделей")
    validation_model: str = Field(..., description="Модель для валидации")
    rate_limit: dict = Field(..., description="Конфигурация rate limiting")
    accent_color: str = Field(..., description="Акцентный цвет")
