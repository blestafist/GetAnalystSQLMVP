"""
Main LLM service for SQL Assistant.

Handles:
1. System prompt injection
2. OpenAI API calls
3. JSON response normalization and parsing
"""

import json
import re
from typing import Optional
from openai import OpenAI
from backend.exceptions import LLMParseError, LLMAPIError
from backend.logger import setup_logger

logger = setup_logger(__name__)


class LLMService:
    """Main service for generating SQL schemas and queries via LLM."""

    def __init__(self, api_key: str):
        """
        Initialize LLM service with OpenAI client.

        Args:
            api_key: OpenAI API key
        """
        self.client = OpenAI(api_key=api_key)

        # System prompt enforcing strict JSON output
        self.system_prompt = """You are a PostgreSQL database designer and SQL expert.
The user will describe a data query in natural language.
You must:
1. Design a minimal but complete database schema that fits the request.
2. Write a valid PostgreSQL query using that schema.
3. Briefly explain the query logic in Russian.

CRITICAL: You MUST respond with ONLY a valid JSON object.
No markdown, no code fences, no preamble, no explanations outside JSON.
Exactly this structure:
{
  "mermaid_code": "erDiagram\\n  CUSTOMERS ||--o{ ORDERS : places\\n  CUSTOMERS {\\n    int id PK\\n    string name\\n  }\\n  ORDERS {\\n    int id PK\\n    int customer_id FK\\n  }",
  "sql_query": "SELECT c.name, COUNT(o.id) AS order_count\\nFROM customers c\\nJOIN orders o ON c.id = o.customer_id\\nGROUP BY c.id, c.name\\nHAVING COUNT(o.id) > 3;",
  "explanation": "Запрос объединяет таблицы customers и orders по внешнему ключу customer_id, группирует результаты по клиентам и фильтрует только тех, у кого больше 3 заказов."
}

Rules:
- mermaid_code MUST start with "erDiagram" and use Mermaid ER diagram syntax
- sql_query MUST be valid PostgreSQL
- explanation MUST be in Russian, 2-3 sentences max
- Use \\n for newlines inside JSON strings
- NO markdown code fences (```) in your response
- NO text outside the JSON object"""

    def generate(
        self,
        prompt: str,
        model: str,
        temperature: Optional[float] = None
    ) -> dict:
        """
        Generate SQL schema, query, and explanation from user prompt.

        Args:
            prompt: User's natural language request
            model: OpenAI model ID (e.g., "gpt-5.4")
            temperature: Sampling temperature (None = use model default)

        Returns:
            Dict with keys: mermaid_code, sql_query, explanation

        Raises:
            LLMAPIError: If OpenAI API call fails
            LLMParseError: If response cannot be parsed
        """
        try:
            # Build API call parameters
            params = {
                "model": model,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "max_completion_tokens": 2000
            }

            # Add temperature only if provided and model supports it
            if temperature is not None:
                params["temperature"] = temperature

            logger.info(f"Calling OpenAI API: model={model}, temperature={temperature}")

            # Call OpenAI API
            response = self.client.chat.completions.create(**params)

            raw_response = response.choices[0].message.content
            logger.info(f"LLM raw response length: {len(raw_response)} chars")

            # Parse and validate response
            result = self._parse_llm_response(raw_response)

            # Log token usage
            usage = response.usage
            logger.info(
                f"Token usage: prompt={usage.prompt_tokens}, "
                f"completion={usage.completion_tokens}, "
                f"total={usage.total_tokens}"
            )

            # Attach usage info to result for tracker
            result["_usage"] = {
                "model": model,
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens
            }

            return result

        except Exception as e:
            if "parse" in str(e).lower():
                raise
            logger.error(f"OpenAI API error: {e}")
            raise LLMAPIError(f"Ошибка вызова OpenAI API: {str(e)}")

    def _parse_llm_response(self, raw: str) -> dict:
        """
        Normalize and parse raw LLM response into structured dict.

        LLM often wraps JSON in markdown blocks like ```json ... ```.
        Parser applies multiple cleanup levels before calling json.loads().

        Args:
            raw: Raw string response from OpenAI API

        Returns:
            Dict with keys: mermaid_code, sql_query, explanation

        Raises:
            LLMParseError: If JSON cannot be parsed or required keys are missing
        """
        # Step 1: Remove markdown code fences (```json ... ``` or ``` ... ```)
        cleaned = raw.strip()
        cleaned = re.sub(
            r"^```(?:json)?\s*|\s*```$",
            "",
            cleaned,
            flags=re.DOTALL
        )

        # Step 2: Extract only valid JSON object (from first { to last })
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1

        if start == -1 or end == 0:
            logger.error(f"No JSON object found in response: {raw[:200]}")
            raise LLMParseError("Не найден JSON-объект в ответе LLM")

        json_str = cleaned[start:end]

        # Step 3: Parse JSON
        try:
            result = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}\nJSON string: {json_str[:200]}")
            raise LLMParseError(f"Не удалось распарсить JSON: {str(e)}")

        # Step 4: Validate required keys
        required_keys = ["mermaid_code", "sql_query", "explanation"]
        missing_keys = [key for key in required_keys if key not in result]

        if missing_keys:
            logger.error(f"Missing keys in response: {missing_keys}")
            raise LLMParseError(
                f"Отсутствуют обязательные ключи в ответе: {', '.join(missing_keys)}"
            )

        # Step 5: Basic sanity check on mermaid_code
        mermaid_code = result["mermaid_code"].strip()
        if not mermaid_code.startswith("erDiagram"):
            logger.warning(
                f"Mermaid code doesn't start with 'erDiagram': {mermaid_code[:50]}"
            )
            raise LLMParseError(
                "Код диаграммы должен начинаться с 'erDiagram'"
            )

        logger.info("LLM response parsed successfully")
        return result
