#!/usr/bin/env python3
"""
Утилита для генерации SecretKey и его bcrypt-хэша.

Запуск: python scripts/generate_key.py

Выводит:
  - RAW KEY:  случайный ключ — передать пользователю
  - ENV LINE: строку для вставки в .env на сервере

Сам ключ нигде не сохраняется автоматически — только хэш.
"""

import secrets
import bcrypt


def generate_secret_key() -> tuple[str, str]:
    """
    Генерирует криптографически стойкий случайный ключ и его bcrypt-хэш.

    Returns:
        Кортеж (raw_key, hashed_key):
          - raw_key:    строка из 32 случайных байт в hex — выдаётся пользователю
          - hashed_key: bcrypt-хэш для записи в .env
    """
    # secrets.token_hex — криптографически стойкий генератор (не random!)
    raw_key = secrets.token_hex(32)  # 64 символа hex = 256 бит энтропии

    # bcrypt автоматически генерирует соль и встраивает её в хэш
    # rounds=12 — баланс между безопасностью и скоростью проверки (~250мс)
    hashed = bcrypt.hashpw(raw_key.encode("utf-8"), bcrypt.gensalt(rounds=12))

    return raw_key, hashed.decode("utf-8")


if __name__ == "__main__":
    raw, hashed = generate_secret_key()

    print("=" * 60)
    print("  SQL Assistant — генерация SecretKey")
    print("=" * 60)
    print()
    print(f"  RAW KEY (передать пользователю):")
    print(f"  {raw}")
    print()
    print(f"  ENV LINE (вставить в .env на сервере):")
    print(f"  SECRET_KEY_HASH={hashed}")
    print()
    print("  ВНИМАНИЕ: сохраните RAW KEY — он больше не будет показан.")
    print("=" * 60)
