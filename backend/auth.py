"""
Middleware аутентификации через SecretKey.

Проверяет заголовок X-Secret-Key в каждом защищённом запросе.
Сравнивает через bcrypt — сервер никогда не знает сам ключ, только хэш.
"""

import bcrypt
from fastapi import Request
from backend.exceptions import AuthError


def verify_secret_key(request: Request, secret_key_hash: str) -> None:
    """
    Проверяет SecretKey из заголовка запроса против bcrypt-хэша из .env.

    Args:
        request:         FastAPI Request объект.
        secret_key_hash: Хэш из переменной окружения SECRET_KEY_HASH.

    Raises:
        AuthError: Если заголовок отсутствует или ключ не совпадает.
    """
    # Читаем ключ из заголовка запроса
    raw_key = request.headers.get("X-Secret-Key", "")

    # Пустой ключ — сразу отклоняем (bcrypt на пустой строке всё равно медленный)
    if not raw_key:
        raise AuthError("Заголовок X-Secret-Key отсутствует.")

    # bcrypt.checkpw возвращает True/False, не бросает исключений
    # Время проверки ~250мс — это защита от brute-force
    try:
        is_valid = bcrypt.checkpw(
            raw_key.encode("utf-8"),
            secret_key_hash.encode("utf-8")
        )
    except Exception as e:
        raise AuthError(f"Ошибка проверки ключа: {e}")

    if not is_valid:
        raise AuthError("Неверный SecretKey.")
