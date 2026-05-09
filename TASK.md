# Техническое задание — SQL Assistant

---

## 1. Общее описание

Веб-приложение-ассистент, которое принимает текстовый запрос пользователя на естественном языке, самостоятельно проектирует подходящую схему базы данных, строит SQL-запрос и визуализирует структуру в виде ER-диаграммы.

**Пример сценария:** пользователь вводит «Показать всех клиентов, у которых больше 3 заказов» — приложение придумывает таблицы `customers` и `orders`, рисует ER-диаграмму, генерирует PostgreSQL-запрос и объясняет его логику.

---

## 2. Стек технологий

| Слой               | Технология                                 |
| ------------------ | ------------------------------------------ |
| Бэкенд             | Python 3.11+, FastAPI                      |
| Фронтенд           | Vanilla HTML + Tailwind CSS (CDN)          |
| ER-диаграммы       | **mermaid.js** (CDN, рендеринг на клиенте) |
| LLM                | OpenAI API                                 |
| Валидация промптов | OpenAI `gpt-5.4-nano` (быстрая и дешёвая)  |
| Переменные среды   | `python-dotenv` + файл `.env`              |
| Аутентификация     | SecretKey + bcrypt-хэширование             |
| Rate Limiting      | `slowapi`                                  |
| Логирование        | `logging` (stdlib) → консоль + файл        |
| SQL-диалект        | PostgreSQL                                 |

> **Примечание по mermaid.js:** диаграммы рендерятся прямо в браузере через `mermaid.js`, подключённый через CDN (`https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js`). Никакого внешнего API не требуется — авторизация не нужна.

---

## 3. Архитектура проекта

```
sql-assistant/
├── backend/
│   ├── main.py              # Точка входа FastAPI, роутер, middleware
│   ├── config.py            # Загрузка config.json и .env
│   ├── models.py            # Pydantic-модели запросов и ответов
│   ├── auth.py              # Проверка SecretKey (bcrypt)
│   ├── services/
│   │   ├── llm.py           # Основной сервис: вызов LLM, парсинг ответа
│   │   ├── validator.py     # Микросервис валидации промпта (gpt-5.4-nano)
│   │   └── usage_tracker.py # Запись токенов в usage.json
│   ├── exceptions.py        # Кастомные классы исключений
│   └── logger.py            # Настройка логгера (консоль + файл)
├── frontend/
│   └── index.html           # SPA: весь HTML/CSS/JS в одном файле
├── scripts/
│   └── generate_key.py      # Утилита генерации SecretKey и его хэша
├── config.json              # Настройки приложения (без секретов)
├── .env                     # Секреты: API-ключи + хэш ключа (не коммитить!)
├── .env.example             # Шаблон .env для документации
├── usage.json               # Авто-создаётся: учёт токенов и вызовов
├── logs/
│   └── app.log              # Логи приложения
└── requirements.txt
```

---

## 4. Безопасность и конфиденциальность

### 4.1 Хранение секретов

- **API-ключи и хэш SecretKey** — исключительно в `.env`, никогда в коде или `config.json`.
- `.env` добавляется в `.gitignore`. В репозитории лежит только `.env.example` с пустыми значениями.
- `config.json` содержит только несекретные настройки (список моделей, rate limits, параметры UI).

```bash
# .env.example
OPENAI_API_KEY=your_openai_key_here
SECRET_KEY_HASH=your_bcrypt_hash_here   # генерируется скриптом generate_key.py
```

### 4.2 Аутентификация через SecretKey

Приложение использует простую схему аутентификации: каждому пользователю выдаётся уникальный SecretKey. На сервере хранится **только bcrypt-хэш** этого ключа — сам ключ нигде не сохраняется.

#### Схема работы

```
Генерация (один раз, офлайн):
  generate_key.py → raw_key (выдаётся пользователю) + bcrypt_hash (пишется в .env)

Каждый запрос:
  Клиент → заголовок X-Secret-Key: <raw_key>
         → FastAPI auth middleware
         → bcrypt.checkpw(raw_key, SECRET_KEY_HASH из .env)
         → OK: запрос идёт дальше
         → FAIL: 401 Unauthorized, запрос остановлен
```

#### Генерация ключа (`scripts/generate_key.py`)

Скрипт запускается один раз администратором перед деплоем. Выводит готовую строку для `.env` и ключ для передачи пользователю.

```python
# scripts/generate_key.py
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
```

#### Проверка ключа на бэкенде (`backend/auth.py`)

```python
# backend/auth.py
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
    is_valid = bcrypt.checkpw(
        raw_key.encode("utf-8"),
        secret_key_hash.encode("utf-8")
    )

    if not is_valid:
        raise AuthError("Неверный SecretKey.")
```

#### Подключение middleware в `main.py`

```python
# В FastAPI: зависимость (Depends) применяется к защищённым роутам
# Это чище, чем глобальный middleware — /config и / остаются публичными

from fastapi import Depends
from backend.auth import verify_secret_key
from backend.config import settings

def auth_dependency(request: Request):
    """Зависимость FastAPI для проверки SecretKey."""
    verify_secret_key(request, settings.SECRET_KEY_HASH)

# Только /generate требует аутентификации:
@app.post("/generate", dependencies=[Depends(auth_dependency)])
async def generate(...):
    ...
```

#### Фронтенд: хранение и передача ключа

При первом открытии приложения пользователю показывается модальное окно с полем для ввода SecretKey. После ввода ключ сохраняется в `sessionStorage` (не `localStorage` — очищается при закрытии вкладки).

```javascript
// Ключ берётся из sessionStorage и добавляется в заголовок каждого fetch-запроса
const response = await fetch("/generate", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "X-Secret-Key": sessionStorage.getItem("secret_key") ?? ""
    },
    body: JSON.stringify(payload)
});

// При получении 401 — показываем Toast с предложением ввести ключ заново
if (response.status === 401) {
    showToast("Неверный ключ доступа. Проверьте SecretKey.", "error");
    openKeyModal();
}
```

### 4.3 Архитектура обработки ошибок

Вместо `try/except Exception` везде — централизованная система:

```
Запрос → FastAPI Exception Handler → кастомный класс ошибки → нормализованный JSON → фронтенд
```

**Кастомные классы исключений** (`exceptions.py`):

- `AuthError` — неверный или отсутствующий SecretKey → HTTP 401
- `PromptInjectionError` — небезопасный промпт → HTTP 400
- `OffTopicError` — промпт не по теме БД → HTTP 400
- `LLMParseError` — не удалось распарсить ответ LLM → HTTP 502
- `LLMAPIError` — ошибка вызова OpenAI API → HTTP 502
- `RateLimitError` — превышен лимит запросов → HTTP 429

FastAPI `@app.exception_handler` перехватывает все кастомные исключения и возвращает **только** структурированный JSON с понятным сообщением. Сырые трейсбеки на фронтенд никогда не отправляются.

### 4.4 Pydantic как первая линия обороны

Все входящие данные валидируются Pydantic-моделями до попадания в бизнес-логику:

```python
# models.py — пример
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    model: str = Field(..., pattern="^gpt-")
    temperature: float = Field(0.7, ge=0.0, le=2.0)
```

Если данные не соответствуют схеме — FastAPI автоматически возвращает `422 Unprocessable Entity` ещё до вызова любой логики.

### 4.5 Rate Limiting

`slowapi` ограничивает количество запросов к эндпоинту `/generate`:

```json
// config.json
{
  "rate_limit": {
    "requests_per_minute": 10
  }
}
```

---

## 5. Модели LLM и конфигурация

### 5.1 Файл `config.json` (Пример, модели будут дорабатываться)

```json
{
  "models": [
    {
      "id": "gpt-5.4",
      "display_name": "OpenAI - GPT-5.4",
      "supports_temperature": true,
      "temperature_range": [0.0, 1.0],
      "default_temperature": 0.7
    },
    {
      "id": "gpt-5.4-mini",
      "display_name": "OpenAI - GPT-5.4 Mini",
      "supports_temperature": true,
      "temperature_range": [0.0, 2.0],
      "default_temperature": 0.7
    },
    {
      "id": "gpt-5",
      "display_name": "OpenAI - GPT-5",
      "supports_temperature": false,
      "temperature_range": null,
      "default_temperature": null
    }
  ],
  "validation_model": "gpt-5.4-nano",
  "rate_limit": {
    "requests_per_minute": 10
  },
  "accent_color": "#6750A4"
}
```

> `gpt-5.4-nano` используется **только** для быстрой валидации промптов — это дешево и быстро. Основная генерация идёт через выбранную пользователем модель.

### 5.2 Слайдер Temperature

- Если `supports_temperature: false` — слайдер визуально задизаблен, запрос отправляется без параметра `temperature`.
- Конфигурация берётся из `config.json`, не захардкожена во фронтенде.

---

## 6. Логика бэкенда

### 6.1 Валидация промпта (`validator.py`)

Перед основным вызовом LLM запрос проходит быструю проверку через `gpt-5.4-nano`:

**Что проверяется:**

1. **Пустой промпт** — обычная алгоритмическая проверка (без вызова LLM).
2. **Prompt injection** — попытка изменить поведение системы («игнорируй предыдущие инструкции», вывод ключей и т.д.).
3. **Нерелевантность** — запрос не имеет отношения к базам данных или SQL.

Микровалидатор возвращает структурированный ответ:

```json
{"valid": true/false, "reason": "injection|off_topic|ok"}
```

Если `valid: false` — выбрасывается соответствующее исключение, основной вызов LLM не происходит.

### 6.2 Основной вызов LLM (`llm.py`)

**System prompt** задаёт жёсткую схему ответа. Пример инжектируемого системного промпта (только пример, требует доработки):

```
You are a PostgreSQL database designer and SQL expert.
The user will describe a data query in natural language.
You must:
1. Design a minimal but complete database schema that fits the request.
2. Write a valid PostgreSQL query using that schema.
3. Briefly explain the query logic.

CRITICAL: You MUST respond with ONLY a valid JSON object.
No markdown, no code fences, no preamble. Exactly this structure:
{
  "mermaid_code": "erDiagram\n  ...",
  "sql_query": "SELECT ...",
  "explanation": "..."
}
```

### 6.3 Парсинг ответа LLM

LLM часто оборачивает JSON в markdown-блоки. Парсер последовательно применяет нормализаторы:

1. Срезать обёртку ` ```json ... ``` ` или ` ``` ... ``` `
2. Найти первый `{` и последний `}`, вырезать подстроку (на случай мусора снаружи)
3. `json.loads()` — если упало, выбросить `LLMParseError`
4. Проверить наличие всех трёх ключей: `mermaid_code`, `sql_query`, `explanation`
5. Проверить, что `mermaid_code` начинается с `erDiagram` (базовая санитизация)

### 6.4 Стриминг

Стриминг **не используется** — ответ приходит целиком для надёжного JSON-парсинга.

На фронтенде для UX добавляется **имитация печати**: после получения ответа текст `explanation` выводится посимвольно с задержкой (~20мс/символ). `mermaid_code` и `sql_query` появляются мгновенно.

### 6.5 Логирование (`logger.py`)

```python
# Два хендлера: консоль (WARNING+) и файл (WARNING+)
# Формат: [TIMESTAMP] [LEVEL] [MODULE] — message
```

В `usage.json` дописывается запись после каждого успешного вызова:

```json
{
  "calls": 42,
  "total_tokens": 158340,
  "log": [
    {
      "timestamp": "2026-05-09T14:22:01Z",
      "model": "openai/gpt-5.4",
      "prompt_tokens": 312,
      "completion_tokens": 480
    }
  ]
}
```

---

## 7. API эндпоинты (FastAPI)

| Метод  | Путь        | Авторизация    | Описание                                          |
| ------ | ----------- | -------------- | ------------------------------------------------- |
| `GET`  | `/`         | Нет            | Отдаёт `index.html`                               |
| `GET`  | `/config`   | Нет            | Возвращает `config.json` фронтенду (без секретов) |
| `POST` | `/generate` | X-Secret-Key ✓ | Основной эндпоинт генерации (rate limited)        |

**Схема запроса `POST /generate`:**

```json
// Заголовки:
// X-Secret-Key: <raw_key>
// Content-Type: application/json

{
  "prompt": "Показать всех клиентов с более чем 3 заказами",
  "model": "openai/gpt-5.4",
  "temperature": 0.7
}
```

**Схема успешного ответа:**

```json
{
  "mermaid_code": "erDiagram\n  CUSTOMERS ||--o{ ORDERS : places\n  ...",
  "sql_query": "SELECT c.name, COUNT(o.id) ...",
  "explanation": "Запрос джойнит таблицы..."
}
```

**Схема ответа с ошибкой:**

```json
{
  "error": true,
  "code": "UNAUTHORIZED",
  "message": "Неверный SecretKey."
}
```

---

## 8. UI/UX требования

### 8.1 Макет

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (левая панель ~320px)  │  Main Content (правая) │
│                                 │                        │
│  [Textarea — запрос]            │  ┌─ ER-диаграмма ───┐  │
│  Tab → подставить пример        │  │  (mermaid.js)    │  │
│                                 │  └──────────────────┘  │
│  Температура: [──●──] 0.7       │                        │
│  (задизаблен если не поддержив.)│  ┌─ SQL-запрос ─────┐  │
│                                 │  │  (тёмная тема)   │  │
│  Модель: [GPT-5.4 ▾]            │  └──────────────────┘  │
│                                 │                        │
│  [Сгенерировать ████]           │  ┌─ Объяснение ─────┐  │
│                                 │  │  (анимация печ.) │  │
│                                 │  └──────────────────┘  │
└─────────────────────────────────────────────────────────┘

При первом открытии — модальное окно ввода SecretKey (поверх всего)
```

### 8.2 Состояния UI

**При первом открытии (нет ключа в sessionStorage):**

- Модальное окно с полем ввода SecretKey и кнопкой «Войти»
- Основной интерфейс недоступен до успешного ввода ключа
- При неверном ключе: Toast «Неверный ключ доступа» + поле очищается

**До генерации:**

- Поле ввода с placeholder
- `Tab` подставляет пример: *«Показать всех клиентов, у которых больше 3 заказов»*
- Слайдер температуры (активен/задизаблен по конфигу модели)
- Дропдаун выбора модели (данные из `/config`)
- Кнопка «Сгенерировать»

**Во время генерации:**

- Кнопка заблокирована, внутри спиннер + текст «Генерирую...»
- Поля ввода задизаблены

**После генерации:**

- ER-диаграмма (mermaid.js, в акцентном цвете из `config.json`)
- SQL-блок с подсветкой синтаксиса + кнопка «Скопировать SQL» (Toast: «SQL скопирован!»)
- Блок объяснения с анимацией печати (typewriter effect)
- Если mermaid не отрендерился — показать кнопку «Посмотреть сырой код диаграммы»

### 8.3 Toast-уведомления

Вместо `alert()` — всплывающие Toast-уведомления (Material You стиль) в правом верхнем углу:

| Событие                | Текст                        | Цвет    |
| ---------------------- | ---------------------------- | ------- |
| Неверный ключ          | «Неверный ключ доступа»      | Красный |
| Ошибка API/валидации   | Текст ошибки из бэкенда      | Красный |
| SQL скопирован         | «SQL скопирован!»            | Зелёный |
| Ошибка рендера Mermaid | «Диаграмма не отрендерилась» | Жёлтый  |

Тост появляется с анимацией slide-in, автоматически исчезает через 4 секунды.

### 8.4 Визуальный стиль

- **Material You (MD3)** — скруглённые карточки, elevation shadows, акцентный цвет из `config.json`
- **Анимации** — плавные (как в Hyprland): `transition: all 0.3s cubic-bezier(0.2, 0, 0, 1)`
- **SQL-блок** — тёмная тема (тёмный фон, цветная подсветка токенов)
- **Шрифт** — Google Fonts: Roboto (основной), Roboto Mono (код)
- **Адаптивность** — на мобильных sidebar схлопывается наверх

### 8.5 Редактор Mermaid

После генерации — опциональный редактор raw-кода диаграммы с live preview: пользователь может подправить `erDiagram` и нажать «Обновить диаграмму». Реализуется через `mermaid.render()` в JS.

---

## 9. Документирование кода

Каждый файл, функция и нетривиальный блок кода должны иметь комментарии:

```python
# services/llm.py

def parse_llm_response(raw: str) -> dict:
    """
    Нормализует и парсит сырой ответ от LLM в структурированный словарь.

    LLM часто оборачивает JSON в markdown-блоки вида ```json ... ```.
    Парсер применяет несколько уровней очистки, прежде чем вызвать json.loads().

    Args:
        raw: Сырая строка ответа от OpenAI API.

    Returns:
        Словарь с ключами: mermaid_code, sql_query, explanation.

    Raises:
        LLMParseError: Если JSON не удалось распарсить или отсутствуют обязательные ключи.
    """
    # Шаг 1: Срезаем markdown-обёртки (```json ... ```)
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.DOTALL)

    # Шаг 2: Вырезаем только валидный JSON-объект (от первого { до последнего })
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start == -1 or end == 0:
        raise LLMParseError("Не найден JSON-объект в ответе LLM")
    ...
```

Фронтенд (JS) — комментарии к каждой функции и к нетривиальной логике:

```javascript
// Инициализируем mermaid.js с темой, соответствующей акцентному цвету
// Тема задаётся через CSS-переменные, а не через конфиг mermaid,
// чтобы поддерживать динамическую смену цвета без перезагрузки
mermaid.initialize({ ... });
```

---

## 10. Требования к зависимостям

```
# requirements.txt
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
openai>=1.30.0
python-dotenv>=1.0.0
slowapi>=0.1.9
bcrypt>=4.1.0          # хэширование SecretKey
```

---

## 11. Дополнительные фичи (v2, опционально)

Реализуются после базовой версии, в порядке приоритета:

1. **Tab Suggestions** для поля ввода — список примеров запросов
2. **Скачать диаграмму как SVG** — через `mermaid.render()` + `Blob`
3. **Смена акцентного цвета** в UI → сохранение в `localStorage`
4. **Редактирование `config.json` через UI** (в разделе настроек)

---

## 12. Чеклист готовности

- [ ] `.env` не попадает в репозиторий (`.gitignore`)
- [ ] `scripts/generate_key.py` запускается без ошибок и выводит ключ + ENV LINE
- [ ] `/generate` без заголовка `X-Secret-Key` возвращает `401`
- [ ] `/generate` с неверным ключом возвращает `401`
- [ ] `/` и `/config` доступны без ключа
- [ ] Фронтенд показывает модальное окно при первом открытии
- [ ] Ключ хранится в `sessionStorage`, не в `localStorage`
- [ ] Все эндпоинты задокументированы через FastAPI `/docs` (Swagger auto-gen)
- [ ] Rate limiting работает и возвращает `429` с понятным сообщением
- [ ] `usage.json` обновляется после каждого вызова
- [ ] `app.log` содержит WARNING и ERROR уровни
- [ ] Кнопка заблокирована во время генерации
- [ ] Toast появляется при любой ошибке
- [ ] Если mermaid не рендерится — показывается кнопка «Посмотреть сырой код»
- [ ] Все функции задокументированы (docstring + inline comments)
