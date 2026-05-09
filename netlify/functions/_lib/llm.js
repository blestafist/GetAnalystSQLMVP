const OpenAI = require("openai");
const { LLMParseError, LLMAPIError } = require("./errors");
const { createLogger } = require("./logger");

const logger = createLogger("llm");

class LLMService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });

    this.systemPrompt = `You are an expert PostgreSQL database architect and SQL query specialist.
Your role: Design optimal database schemas and generate precise SQL queries.

TASK ANALYSIS:
1. Carefully read the user's request in Russian
2. Identify: entities, relationships, and data requirements
3. Design a MINIMAL but COMPLETE schema that exactly fits the request
4. Write a PRODUCTION-READY PostgreSQL query

SCHEMA DESIGN RULES:
- Use meaningful table names (plural: CUSTOMERS, ORDERS, PRODUCTS)
- Use clear column names with proper data types
- Include appropriate primary keys and foreign keys
- Mark relationships clearly in Mermaid
- Design for the SPECIFIC use case - no unnecessary bloat

RESPONSE FORMAT:
Respond with ONLY a valid JSON object:
{
  "mermaid_code": "erDiagram\\n  ...",
  "sql_query": "SELECT ...",
  "explanation": "..."
}

CRITICAL:
- mermaid_code MUST start with "erDiagram"
- sql_query MUST be valid PostgreSQL
- explanation MUST be in Russian
- NO markdown code fences`;
  }

  /**
   * Основной вызов OpenAI:
   * 1) формируем параметры запроса
   * 2) вызываем модель
   * 3) парсим/валидируем JSON
   * 4) прикрепляем usage для usage-tracker
   */
  async generate(prompt, model, temperature = null) {
    try {
      const params = {
        model,
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 2000
      };

      if (temperature !== null && temperature !== undefined) {
        params.temperature = temperature;
      }

      const response = await this.client.chat.completions.create(params);
      const raw = response.choices?.[0]?.message?.content || "";
      const parsed = this.parseLLMResponse(raw);
      const usage = response.usage || {};

      parsed._usage = {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0
      };

      return parsed;
    } catch (error) {
      if (error instanceof LLMParseError) {
        throw error;
      }
      logger.error(`OpenAI API error: ${error.message}`);
      throw new LLMAPIError(`Ошибка вызова OpenAI API: ${error.message}`);
    }
  }

  /**
   * Многоступенчатый парсер ответа LLM (1:1 с Python-версией):
   * - удаляем markdown fences
   * - вырезаем участок от первого "{" до последнего "}"
   * - JSON.parse
   * - проверяем обязательные ключи и старт mermaid с erDiagram
   */
  parseLLMResponse(raw) {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}") + 1;
    if (start === -1 || end === 0) {
      throw new LLMParseError("Не найден JSON-объект в ответе LLM");
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned.slice(start, end));
    } catch (error) {
      throw new LLMParseError(`Не удалось распарсить JSON: ${error.message}`);
    }

    for (const key of ["mermaid_code", "sql_query", "explanation"]) {
      if (!(key in parsed)) {
        throw new LLMParseError(`Отсутствуют обязательные ключи в ответе: ${key}`);
      }
    }

    if (!String(parsed.mermaid_code || "").trim().startsWith("erDiagram")) {
      throw new LLMParseError("Код диаграммы должен начинаться с 'erDiagram'");
    }

    return parsed;
  }
}

module.exports = { LLMService };

