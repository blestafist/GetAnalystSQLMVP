"""
Usage tracking service for monitoring token consumption.

Tracks:
1. Total API calls
2. Token usage per call
3. Historical log of all requests
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from backend.logger import setup_logger

logger = setup_logger(__name__)


class UsageTracker:
    """Tracks and persists LLM API usage statistics."""

    def __init__(self, usage_file: str = "usage.json"):
        """
        Initialize usage tracker.

        Args:
            usage_file: Path to usage.json file (relative to project root)
        """
        self.usage_file = Path(usage_file)
        self._ensure_usage_file()

    def _ensure_usage_file(self) -> None:
        """Create usage.json if it doesn't exist or is empty."""
        if not self.usage_file.exists() or self.usage_file.stat().st_size == 0:
            initial_data = {
                "calls": 0,
                "total_tokens": 0,
                "log": []
            }
            self._write_usage(initial_data)
            logger.info(f"Created new usage file: {self.usage_file}")

    def _read_usage(self) -> dict:
        """
        Read current usage data from file.

        Returns:
            Dict with keys: calls, total_tokens, log
        """
        try:
            with open(self.usage_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read usage file: {e}")
            # Return default structure if file is corrupted
            return {
                "calls": 0,
                "total_tokens": 0,
                "log": []
            }

    def _write_usage(self, data: dict) -> None:
        """
        Write usage data to file.

        Args:
            data: Usage data dict
        """
        try:
            with open(self.usage_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to write usage file: {e}")

    def track(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        temperature: Optional[float] = None,
        validation_reason: Optional[str] = None,
        validator_response: Optional[str] = None
    ) -> None:
        """
        Record a new API call in usage.json.

        Args:
            model: Model ID used for the call
            prompt_tokens: Number of tokens in prompt
            completion_tokens: Number of tokens in completion
            temperature: Temperature parameter (if used)
            validation_reason: Validation result reason (ok, injection, off_topic)
            validator_response: Raw response from validator model
        """
        try:
            # Read current data
            data = self._read_usage()

            # Calculate total tokens for this call
            total_tokens = prompt_tokens + completion_tokens

            # Update counters
            data["calls"] += 1
            data["total_tokens"] += total_tokens

            # Create log entry
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            }

            # Add temperature if provided
            if temperature is not None:
                log_entry["temperature"] = temperature

            # Add validation info if provided
            if validation_reason is not None:
                log_entry["validation_reason"] = validation_reason
            if validator_response is not None:
                log_entry["validator_response"] = validator_response

            # Append to log
            data["log"].append(log_entry)

            # Write back to file
            self._write_usage(data)

            logger.info(
                f"Usage tracked: model={model}, "
                f"tokens={total_tokens} (prompt={prompt_tokens}, completion={completion_tokens}), "
                f"validation={validation_reason}"
            )

        except Exception as e:
            logger.error(f"Failed to track usage: {e}")
            # Don't raise - tracking failure shouldn't break the main flow

    def get_stats(self) -> dict:
        """
        Get current usage statistics.

        Returns:
            Dict with keys: calls, total_tokens, log
        """
        return self._read_usage()
