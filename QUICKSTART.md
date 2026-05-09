# SQL Assistant MVP — Быстрый старт 🚀

## Что это?

Веб-приложение для генерации SQL-запросов и ER-диаграмм из текстовых описаний на русском языке.

**Технологии:**

- Backend: FastAPI + OpenAI API (gpt-4o-mini)
- Frontend: Vanilla JS + Tailwind CSS + Material You Design
- Auth: bcrypt SecretKey
- Rate Limiting: 10 запросов/минуту

---

## Предварительные требования

- Python 3.11+
- OpenAI API ключ (уже настроен в `.env`)
- Виртуальное окружение (уже создано в `venv/`)

---

## Установка и запуск

### 1. Активировать виртуальное окружение

```bash
source venv/bin/activate
```

### 2. Установить зависимости (если еще не установлены)

```bash
pip install -r requirements.txt
```

### 3. Проверить конфигурацию

Файл `.env` уже содержит:

```
OPENAI_API_KEY=sk-proj-...  # Ваш реальный ключ
SECRET_KEY_HASH=$2b$12$...   # Хеш для аутентификации
```

**Важно:** Не коммитьте `.env` в git! Он уже в `.gitignore`.

### 4. Запустить сервер

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Или с автоперезагрузкой при изменениях:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Открыть в браузере

```
http://localhost:8000
```

---

## Первый вход

При первом открытии появится модальное окно для ввода **SecretKey**.

**Ваш SecretKey:**

```
a3407c6794e254f86d9aa6513cde9ded2496438abb3daf2ca7360c02728d7feb
```

Ключ сохраняется в `sessionStorage` браузера (действует до закрытия вкладки).

---

## Использование

### Интерфейс

**Левая панель (Sidebar):**

- **Textarea**: Введите запрос на русском (например: "Показать всех клиентов с более чем 3 заказами")
- **Tab**: Вставляет пример запроса
- **Model Selector**: Выбор модели (gpt-4o-mini по умолчанию)
- **Temperature Slider**: Настройка креативности (0.0-2.0, если модель поддерживает)
- **Кнопка "Сгенерировать"**: Отправляет запрос

**Правая панель (Main Content):**

- **ER Diagram**: Визуализация схемы базы данных (Mermaid.js)
- **SQL Query**: Готовый PostgreSQL запрос с подсветкой синтаксиса
- **Explanation**: Объяснение логики запроса на русском

### Примеры запросов

```
Показать всех клиентов, у которых больше 3 заказов
```

```
Найти топ-10 самых продаваемых товаров за последний месяц
```

```
Вывести список сотрудников с их зарплатами и отделами
```

---

## Тестирование

### Компонентные тесты (без API)

```bash
python test_part2.py
```

Проверяет:

- JSON парсер (5 тестов)
- Usage tracker (3 теста)

### Полный pipeline (с реальным API)

```bash
python test_full_pipeline.py
```

Проверяет:

- Валидацию промпта (gpt-4o-mini)
- Генерацию SQL и диаграммы
- Трекинг токенов

### Тест через curl

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -H "X-Secret-Key: a3407c6794e254f86d9aa6513cde9ded2496438abb3daf2ca7360c02728d7feb" \
  -d '{
    "prompt": "Показать всех клиентов с более чем 3 заказами",
    "model": "gpt-4o-mini",
    "temperature": 0.7
  }'
```

---

## Структура проекта

```
GetAnalystMVP/
├── backend/
│   ├── main.py              # FastAPI приложение
│   ├── auth.py              # Middleware аутентификации
│   ├── config.py            # Загрузка конфигурации
│   ├── models.py            # Pydantic модели
│   ├── exceptions.py        # Кастомные исключения
│   ├── logger.py            # Логирование
│   └── services/
│       ├── validator.py     # Проверка промптов на инъекции
│       ├── llm.py           # Генерация через OpenAI API
│       └── usage_tracker.py # Трекинг токенов
├── frontend/
│   └── index.html           # Material You UI
├── scripts/
│   └── generate_key.py      # Генератор SecretKey
├── config.json              # Конфигурация моделей
├── .env                     # API ключи (не коммитить!)
├── requirements.txt         # Python зависимости
└── usage.json               # Лог использования токенов
```

---

## API Endpoints

### `GET /`

Возвращает `frontend/index.html`

### `GET /config`

Возвращает конфигурацию моделей из `config.json`

**Response:**

```json
{
  "models": [
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4o Mini",
      "supports_temperature": true,
      "temperature_range": [0.0, 2.0]
    }
  ],
  "validation_model": "gpt-4o-mini",
  "accent_color": "#6750A4"
}
```

### `POST /generate`

Генерирует SQL и диаграмму из текстового описания

**Headers:**

- `X-Secret-Key`: SecretKey для аутентификации

**Request:**

```json
{
  "prompt": "Показать всех клиентов с более чем 3 заказами",
  "model": "gpt-4o-mini",
  "temperature": 0.7
}
```

**Response:**

```json
{
  "mermaid_code": "erDiagram\n  CUSTOMERS ||--o{ ORDERS : places\n  ...",
  "sql_query": "SELECT c.name, COUNT(o.id) AS order_count\nFROM customers c\n...",
  "explanation": "Запрос объединяет таблицы customers и orders..."
}
```

**Errors:**

- `401`: Неверный SecretKey
- `429`: Превышен лимит запросов (10/мин)
- `400`: Обнаружена prompt injection или оффтоп
- `500`: Ошибка OpenAI API

---

## Безопасность

### Аутентификация

- SecretKey хранится в `.env` как bcrypt хеш
- Проверка через middleware на каждый запрос к `/generate`
- Ключ передается в заголовке `X-Secret-Key`

### Rate Limiting

- 10 запросов в минуту на IP
- Реализовано через `slowapi`

### Prompt Injection Protection

- Валидация через gpt-4o-mini перед основным запросом
- Fail-open дизайн (если валидатор упал, запрос проходит)
- Фильтрация оффтоп запросов

---

## Мониторинг

### Логи

Все логи выводятся в консоль с timestamp и уровнем:

```
[2026-05-09 15:38:03] [INFO] [backend.services.llm] — Calling OpenAI API: model=gpt-4o-mini, temperature=0.7
[2026-05-09 15:38:05] [INFO] [backend.services.llm] — Token usage: prompt=348, completion=156, total=504
```

### Usage Tracking

Все API вызовы логируются в `usage.json`:

```json
{
  "calls": 3,
  "total_tokens": 1504,
  "log": [
    {
      "timestamp": "2026-05-09T13:38:05.123Z",
      "model": "gpt-4o-mini",
      "prompt_tokens": 348,
      "completion_tokens": 156,
      "total_tokens": 504,
      "temperature": 0.7
    }
  ]
}
```

---

## Генерация нового SecretKey

Если нужно создать новый ключ:

```bash
python scripts/generate_key.py
```

Скрипт выведет:

1. Сырой ключ (для пользователей)
2. Bcrypt хеш (для `.env`)

Обновите `.env`:

```
SECRET_KEY_HASH=новый_хеш
```

---

## Troubleshooting

### Ошибка: "ModuleNotFoundError: No module named 'openai'"

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Ошибка: "401 Unauthorized"

Проверьте, что SecretKey правильный:

```
a3407c6794e254f86d9aa6513cde9ded2496438abb3daf2ca7360c02728d7feb
```

### Ошибка: "OpenAI API error"

Проверьте `.env`:

- API ключ должен начинаться с `sk-proj-`
- Ключ должен быть активным на platform.openai.com

### Порт 8000 занят

Используйте другой порт:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080
```

---

## Статус разработки

✅ **Part 1**: Backend Infrastructure (Auth, Rate Limiting, Endpoints)
✅ **Part 2**: LLM Service (Validator, Generator, Usage Tracker)
✅ **Part 3**: Material You UI (Layout, Animations, Auth Modal)
🚧 **Part 4**: Integration (Mermaid.js, Syntax Highlighting, Live Editor)

---

## Следующие шаги

1. Интеграция Mermaid.js для рендера диаграмм
2. Подсветка синтаксиса SQL (Highlight.js)
3. Live редактор Mermaid кода
4. Финальный чеклист из TASK.md

---

## Контакты

Проект: SQL Assistant MVP
Версия: 0.1.0 (Parts 1-3 Complete)
