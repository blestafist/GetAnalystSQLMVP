"""
Загрузка конфигурации из config.json и .env.

Гарантирует, что все необходимые переменные окружения установлены.
"""

import json
import os
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv


# Загружаем .env файл
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class ModelConfig(BaseModel):
    """Конфигурация одной модели LLM."""
    id: str
    display_name: str
    supports_temperature: bool
    temperature_range: list[float] | None = None
    default_temperature: float | None = None


class RateLimitConfig(BaseModel):
    """Конфигурация rate limiting."""
    requests_per_minute: int


class AppConfig(BaseModel):
    """Полная конфигурация приложения."""
    models: list[ModelConfig]
    validation_model: str
    rate_limit: RateLimitConfig
    accent_color: str


class Settings:
    """Синглтон с настройками приложения и переменными окружения."""

    def __init__(self):
        # Загружаем config.json
        config_path = Path(__file__).parent.parent / "config.json"
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = json.load(f)

        self.app_config = AppConfig(**config_data)

        # Загружаем переменные окружения
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        if not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY не установлена в .env")

        self.SECRET_KEY_HASH = os.getenv("SECRET_KEY_HASH")
        if not self.SECRET_KEY_HASH:
            raise ValueError("SECRET_KEY_HASH не установлена в .env. Запустите scripts/generate_key.py")

    @property
    def models(self) -> list[ModelConfig]:
        """Список доступных моделей."""
        return self.app_config.models

    @property
    def validation_model(self) -> str:
        """Модель для валидации промптов."""
        return self.app_config.validation_model

    @property
    def rate_limit(self) -> RateLimitConfig:
        """Конфигурация rate limiting."""
        return self.app_config.rate_limit

    @property
    def accent_color(self) -> str:
        """Акцентный цвет из конфига."""
        return self.app_config.accent_color


# Глобальный объект настроек
try:
    settings = Settings()
except Exception as e:
    raise RuntimeError(f"Ошибка при загрузке конфигурации: {e}")
