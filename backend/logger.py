"""
Настройка логирования для SQL Assistant.

Логирует в консоль и в файл ~/GetAnalystMVP/logs/app.log
Формат: [TIMESTAMP] [LEVEL] [MODULE] — message
"""

import logging
import os
from pathlib import Path


def setup_logger(name: str = "sql_assistant") -> logging.Logger:
    """
    Настраивает логгер с двумя обработчиками: консоль и файл.

    Args:
        name: Название логгера

    Returns:
        Сконфигурированный logger объект
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    # Формат логов: [TIMESTAMP] [LEVEL] [MODULE] — message
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Консольный обработчик (WARNING и выше)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Файловый обработчик (WARNING и выше)
    # Создаём директорию logs, если её нет
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)

    log_file = log_dir / "app.log"
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.WARNING)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


# Глобальный логгер приложения
logger = setup_logger()
