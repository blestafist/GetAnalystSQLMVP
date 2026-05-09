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
        self.system_prompt = """You are an expert PostgreSQL database architect and SQL query specialist.
Your role: Design optimal database schemas and generate precise SQL queries.

TASK ANALYSIS:
1. Carefully read the user's request in Russian
2. Identify: entities, relationships, and data requirements
3. Design a MINIMAL but COMPLETE schema that exactly fits the request
4. Write a PRODUCTION-READY PostgreSQL query

SCHEMA DESIGN RULES:
- Use meaningful table names (plural: CUSTOMERS, ORDERS, PRODUCTS)
- Use clear column names with proper data types
- Include appropriate primary keys (id INT/BIGINT) and foreign keys
- Mark relationships clearly in Mermaid: ||--o{ (one-to-many), ||--|| (one-to-one)
- Design for the SPECIFIC use case - no unnecessary bloat
- Include relationships between ALL related tables

MERMAID ER DIAGRAM REQUIREMENTS:
- MUST start with "erDiagram" on first line
- MUST use proper Mermaid syntax for relationships
- Include ALL tables mentioned or implied in the request
- Define entities with their attributes and types (int, string, date, numeric, text)
- Mark primary keys with "PK", foreign keys with "FK"
- Example: CUSTOMERS { int id PK string name string email }

SQL QUERY REQUIREMENTS:
- Write only ONE query that directly answers the request
- Use proper column naming: table_alias.column_name
- Include JOINs for all relationships
- Use aggregate functions (COUNT, SUM, AVG, MAX, MIN) when needed
- Add ORDER BY and LIMIT for clarity when appropriate
- Add GROUP BY and HAVING for filtering aggregated results
- Comment complex logic inline if needed
- MUST be valid PostgreSQL syntax

EXPLANATION REQUIREMENTS:
Your explanation must be concise and clear. Write in plain Russian text without any markdown formatting.
Provide a brief 2-3 sentence explanation that covers:
1. What the query does (the goal)
2. Key operations (JOINs, GROUP BY, aggregates, filters)
3. What result the user gets

FORMATTING RULES FOR EXPLANATION:
- Write in plain Russian text
- NO markdown formatting (no **, no ##, no bullets, no lists)
- Use line breaks between sentences (use \n\n for paragraph breaks)
- Keep it concise: 2-3 sentences maximum
- Make it readable as plain text

Example of good explanation:
"Запрос получает список клиентов с более чем 3 заказами. Используется JOIN между таблицами CUSTOMERS и ORDERS, затем GROUP BY группирует по клиентам и HAVING фильтрует тех у кого COUNT больше 3.\n\nРезультат: имена клиентов и количество их заказов, отсортированные по убыванию."

RESPONSE FORMAT:
Respond with ONLY a valid JSON object. No markdown, no code fences, no text outside JSON.
{
  "mermaid_code": "erDiagram\\n  TABLE1 ||--o{ TABLE2 : relationship\\n  TABLE1 {\\n    int id PK\\n    string name\\n  }",
  "sql_query": "SELECT * FROM table WHERE condition ORDER BY column;",
  "explanation": "Detailed explanation in Russian following the structure above (4-6 sentences)."
}

CRITICAL:
- mermaid_code MUST start with "erDiagram"
- sql_query MUST be valid PostgreSQL
- explanation MUST be in Russian only
- Use \\n for newlines inside JSON strings (not actual newlines)
- NO markdown code fences (```) anywhere in your response
- NO text outside the JSON object - not even "Here is the result:" or similar"""

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
