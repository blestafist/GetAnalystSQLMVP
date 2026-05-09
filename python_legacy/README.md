# SQL Assistant MVP 🚀

Веб-приложение для генерации SQL-запросов и ER-диаграмм из текстовых описаний на русском языке.

## Быстрый старт

### 1. Запуск сервера

```bash
cd /home/pestit/code/GetAnalystMVP
source venv/bin/activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 2. Открыть в браузере

```
http://localhost:8000
```

### 3. Войти с SecretKey

При первом входе введите:

```
a3407c6794e254f86d9aa6513cde9ded2496438abb3daf2ca7360c02728d7feb
```

## ⚠️ Важно: API Key

**Текущий статус:** API ключ в `.env` невалидный (возвращает 401 от OpenAI).

**Что нужно сделать:**

1. Получить новый API ключ на https://platform.openai.com/account/api-keys

2. Обновить `.env`:
   
   ```bash
   OPENAI_API_KEY=sk-proj-ваш-новый-ключ
   ```

3. Перезапустить сервер

**Что работает без API ключа:**

- ✅ Веб-интерфейс (Material You UI)
- ✅ Аутентификация (SecretKey)
- ✅ Rate limiting
- ✅ Все компонентные тесты

**Что требует API ключ:**

- ❌ Реальная генерация SQL/диаграмм
- ❌ Валидация промптов

## 📚 Документация

- **[QUICKSTART.md](QUICKSTART.md)** - Полная инструкция по установке и использованию
- **[PLAN.md](PLAN.md)** - Roadmap разработки
- **[TASK.md](TASK.md)** - Техническое задание

## 🧪 Тестирование

### Компонентные тесты (работают без API)

```bash
python test_part2.py
```

### Полный pipeline (требует валидный API ключ)

```bash
python test_full_pipeline.py
```

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

## 📊 Статус разработки

| Part   | Описание               | Статус     |
| ------ | ---------------------- | ---------- |
| Part 1 | Backend Infrastructure | ✅ Complete |
| Part 2 | LLM Service            | ✅ Complete |
| Part 3 | Material You UI        | ✅ Complete |
| Part 4 | Integration            | 🟡 Partial |

### Part 4 - Оставшиеся задачи:

- [ ] Интеграция Mermaid.js (рендер диаграмм)
- [ ] Подсветка синтаксиса SQL (Highlight.js)
- [ ] Live редактор Mermaid кода
- [ ] Финальный чеклист из TASK.md

## 🔧 Технологии

**Backend:**

- FastAPI
- OpenAI API (gpt-4o-mini)
- bcrypt (аутентификация)
- slowapi (rate limiting)

**Frontend:**

- Vanilla JavaScript
- Tailwind CSS
- Material You Design
- Hyprland-style animations

## 📁 Структура проекта

```
GetAnalystMVP/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── auth.py              # Auth middleware
│   ├── config.py            # Config loader
│   ├── models.py            # Pydantic models
│   ├── exceptions.py        # Custom exceptions
│   ├── logger.py            # Logging
│   └── services/
│       ├── validator.py     # Prompt validation
│       ├── llm.py           # OpenAI integration
│       └── usage_tracker.py # Token tracking
├── frontend/
│   └── index.html           # Material You UI
├── scripts/
│   └── generate_key.py      # SecretKey generator
├── config.json              # Model configuration
├── .env                     # API keys (не коммитить!)
├── requirements.txt         # Dependencies
└── usage.json               # Token usage log
```

## 🔐 Безопасность

- ✅ bcrypt SecretKey hashing
- ✅ Rate limiting (10 запросов/минуту)
- ✅ Prompt injection detection
- ✅ CORS configured
- ✅ Fail-open validator

## 📝 Результаты тестирования

- [TEST_RESULTS_PART1.md](TEST_RESULTS_PART1.md) - Backend Infrastructure
- [TEST_RESULTS_PART2.md](TEST_RESULTS_PART2.md) - LLM Service
- [TEST_RESULTS_PART3.md](TEST_RESULTS_PART3.md) - Material You UI
- [TEST_RESULTS_PART4_INTEGRATION.md](TEST_RESULTS_PART4_INTEGRATION.md) - Integration

## 🐛 Известные проблемы

1. **API Key Invalid (401)**
   
   - Решение: Обновить `.env` с валидным ключом OpenAI

2. **Model Names в config.json**
   
   - Текущие: `gpt-5.4`, `gpt-5.4-mini`, `gpt-5` (несуществующие)
   - Рекомендуется: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`

## 💡 Примеры использования

### Через веб-интерфейс:

1. Откройте http://localhost:8000
2. Введите SecretKey
3. Напишите запрос: "Показать всех клиентов с более чем 3 заказами"
4. Нажмите "Сгенерировать"

### Через API:

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -H "X-Secret-Key: a3407c6794e254f86d9aa6513cde9ded2496438abb3daf2ca7360c02728d7feb" \
  -d '{"prompt": "Ваш запрос", "model": "gpt-4o-mini", "temperature": 0.7}'
```

## 🚀 Следующие шаги

1. **Обновить API ключ** в `.env`
2. **Обновить названия моделей** в `config.json`
3. **Интегрировать Mermaid.js** для визуализации диаграмм
4. **Добавить Highlight.js** для подсветки SQL
5. **Реализовать live редактор** Mermaid кода

---

**Версия:** 0.1.0 (Parts 1-3 Complete)  
**Последнее обновление:** 2026-05-09
