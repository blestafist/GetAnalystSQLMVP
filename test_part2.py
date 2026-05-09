"""
Тестовый скрипт для проверки Part 2 без реальных API вызовов.
Проверяет:
1. Парсинг JSON ответов LLM
2. Работу usage_tracker
3. Структуру сервисов
"""

import json
from backend.services.llm import LLMService
from backend.services.usage_tracker import UsageTracker

print("=" * 60)
print("  Part 2 Testing - LLM Service Components")
print("=" * 60)
print()

# TEST 1: JSON Parser
print("TEST 1: JSON Response Parser")
print("-" * 60)

llm = LLMService(api_key="dummy")

# Тест 1.1: Чистый JSON
test_response_1 = '''
{
  "mermaid_code": "erDiagram\\n  CUSTOMERS ||--o{ ORDERS : places",
  "sql_query": "SELECT * FROM customers;",
  "explanation": "Простой запрос"
}
'''

try:
    result = llm._parse_llm_response(test_response_1)
    print("✓ Test 1.1 PASS: Clean JSON parsed")
except Exception as e:
    print(f"✗ Test 1.1 FAIL: {e}")

# Тест 1.2: JSON в markdown обёртке
test_response_2 = '''```json
{
  "mermaid_code": "erDiagram\\n  CUSTOMERS ||--o{ ORDERS : places",
  "sql_query": "SELECT * FROM customers;",
  "explanation": "Запрос с обёрткой"
}
```'''

try:
    result = llm._parse_llm_response(test_response_2)
    print("✓ Test 1.2 PASS: Markdown-wrapped JSON parsed")
except Exception as e:
    print(f"✗ Test 1.2 FAIL: {e}")

# Тест 1.3: JSON с мусором вокруг
test_response_3 = '''Here is your response:
{
  "mermaid_code": "erDiagram\\n  CUSTOMERS ||--o{ ORDERS : places",
  "sql_query": "SELECT * FROM customers;",
  "explanation": "Запрос с префиксом"
}
Hope this helps!'''

try:
    result = llm._parse_llm_response(test_response_3)
    print("✓ Test 1.3 PASS: JSON with surrounding text parsed")
except Exception as e:
    print(f"✗ Test 1.3 FAIL: {e}")

# Тест 1.4: Невалидный JSON (должен упасть)
test_response_4 = "This is not JSON at all"

try:
    result = llm._parse_llm_response(test_response_4)
    print("✗ Test 1.4 FAIL: Should have raised LLMParseError")
except Exception as e:
    print(f"✓ Test 1.4 PASS: Correctly raised error for invalid JSON")

# Тест 1.5: JSON без обязательных ключей (должен упасть)
test_response_5 = '{"mermaid_code": "erDiagram", "sql_query": "SELECT 1"}'

try:
    result = llm._parse_llm_response(test_response_5)
    print("✗ Test 1.5 FAIL: Should have raised error for missing keys")
except Exception as e:
    print(f"✓ Test 1.5 PASS: Correctly raised error for missing 'explanation'")

print()

# TEST 2: Usage Tracker
print("TEST 2: Usage Tracker")
print("-" * 60)

import tempfile
import os

# Создаём временный файл для тестирования
temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
temp_file.close()

tracker = UsageTracker(usage_file=temp_file.name)

# Тест 2.1: Инициализация файла
try:
    with open(temp_file.name, 'r') as f:
        data = json.load(f)
    if data["calls"] == 0 and data["total_tokens"] == 0 and data["log"] == []:
        print("✓ Test 2.1 PASS: Usage file initialized correctly")
    else:
        print("✗ Test 2.1 FAIL: Wrong initial structure")
except Exception as e:
    print(f"✗ Test 2.1 FAIL: {e}")

# Тест 2.2: Запись использования
try:
    tracker.track(
        model="gpt-5.4",
        prompt_tokens=100,
        completion_tokens=200,
        temperature=0.7
    )

    data = tracker.get_stats()
    if data["calls"] == 1 and data["total_tokens"] == 300:
        print("✓ Test 2.2 PASS: Usage tracked correctly")
    else:
        print(f"✗ Test 2.2 FAIL: Wrong counts - calls={data['calls']}, tokens={data['total_tokens']}")
except Exception as e:
    print(f"✗ Test 2.2 FAIL: {e}")

# Тест 2.3: Множественные записи
try:
    tracker.track("gpt-5.4-mini", 50, 100)
    tracker.track("gpt-5", 200, 300)

    data = tracker.get_stats()
    if data["calls"] == 3 and data["total_tokens"] == 950:
        print("✓ Test 2.3 PASS: Multiple calls tracked correctly")
    else:
        print(f"✗ Test 2.3 FAIL: Wrong counts - calls={data['calls']}, tokens={data['total_tokens']}")
except Exception as e:
    print(f"✗ Test 2.3 FAIL: {e}")

# Очистка
os.unlink(temp_file.name)

print()
print("=" * 60)
print("  Part 2 Component Tests Complete")
print("=" * 60)
