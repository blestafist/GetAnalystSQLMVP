"""
End-to-end test with real OpenAI API call.
Tests the complete pipeline: validator → llm → usage_tracker
"""

import os
from dotenv import load_dotenv
from backend.services.validator import PromptValidator
from backend.services.llm import LLMService
from backend.services.usage_tracker import UsageTracker

load_dotenv()

print("=" * 60)
print("  Full Pipeline Test - Real API Call")
print("=" * 60)
print()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key or api_key.startswith("sk-test-dummy"):
    print("❌ No valid API key found in .env")
    exit(1)

print("✓ API key loaded")
print()

# Initialize services
validator = PromptValidator(api_key=api_key, validation_model="gpt-4o-mini")
llm_service = LLMService(api_key=api_key)
usage_tracker = UsageTracker(usage_file="usage_test.json")

print("✓ Services initialized")
print()

# Test prompt
test_prompt = "Показать всех клиентов, у которых больше 3 заказов"

print(f"Test prompt: {test_prompt}")
print()

# Step 1: Validation
print("Step 1: Validating prompt...")
try:
    validation_result = validator.validate(test_prompt)
    print("✓ Prompt validation passed")
    print(f"  Validation reason: {validation_result['reason']}")
except Exception as e:
    print(f"✗ Validation failed: {e}")
    exit(1)

print()

# Step 2: LLM Generation
print("Step 2: Generating SQL and diagram...")
try:
    result = llm_service.generate(
        prompt=test_prompt,
        model="gpt-4o-mini",
        temperature=0.7
    )
    print("✓ Generation successful")
    print()
    print("Result keys:", list(result.keys()))
    print()
    print("Mermaid code preview:")
    print(result["mermaid_code"][:200] + "..." if len(result["mermaid_code"]) > 200 else result["mermaid_code"])
    print()
    print("SQL query preview:")
    print(result["sql_query"][:200] + "..." if len(result["sql_query"]) > 200 else result["sql_query"])
    print()
    print("Explanation preview:")
    print(result["explanation"][:200] + "..." if len(result["explanation"]) > 200 else result["explanation"])
    print()
except Exception as e:
    print(f"✗ Generation failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Step 3: Usage Tracking
print("Step 3: Tracking usage...")
try:
    usage_data = result.get("_usage")
    if usage_data:
        usage_tracker.track(
            model=usage_data["model"],
            prompt_tokens=usage_data["prompt_tokens"],
            completion_tokens=usage_data["completion_tokens"],
            temperature=0.7,
            validation_reason=validation_result["reason"],
            validator_response=validation_result["validator_response"]
        )
        print("✓ Usage tracked")
        print(f"  Tokens: {usage_data['total_tokens']} (prompt={usage_data['prompt_tokens']}, completion={usage_data['completion_tokens']})")
    else:
        print("⚠ No usage data in response")
except Exception as e:
    print(f"✗ Tracking failed: {e}")

print()
print("=" * 60)
print("  Full Pipeline Test Complete ✓")
print("=" * 60)
