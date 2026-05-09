# SQL Assistant (JavaScript + Netlify)

Проект полностью переписан на JavaScript для деплоя на **Netlify**.  
Исходная Python-версия сохранена в `python_legacy/`.

## Структура

```text
GetAnalystMVP/
├── index.html                  # SPA интерфейс (Tailwind + Mermaid + Highlight.js)
├── config.json                 # Публичная конфигурация UI/моделей
├── usage.json                  # Локальный usage tracking
├── netlify.toml                # Настройки билда и редиректов Netlify
├── netlify/functions/
│   ├── config.js               # GET /config
│   ├── generate.js             # POST /generate
│   └── _lib/                   # Общие модули (auth, llm, validator, errors...)
├── scripts/
│   └── generate-key.js         # Генератор SecretKey + bcrypt hash
└── python_legacy/              # Архив старой Python-реализации
```

## Быстрый старт

1. Установить зависимости:

```bash
npm install
```

2. Создать `.env` по шаблону:

```bash
cp .env.example .env
```

3. Сгенерировать SecretKey:

```bash
npm run generate:key
```

4. Запустить локально в Netlify-среде:

```bash
npm run dev
```

Приложение откроется через локальный Netlify URL (обычно `http://localhost:8888`).

## Переменные окружения

```env
OPENAI_API_KEY=sk-...
SECRET_KEY_HASH=$2b$12$...
```

## API

- `GET /config` — публичный конфиг (модели, лимиты, accent color)
- `POST /generate` — генерация SQL/ER-диаграммы (требует заголовок `X-Secret-Key`)

## Деплой на Netlify

1. Подключить репозиторий к Netlify.
2. Build command: `npm install`
3. Publish directory: `.`
4. Functions directory: `netlify/functions`
5. Добавить env vars `OPENAI_API_KEY` и `SECRET_KEY_HASH` в Site settings → Environment variables.

