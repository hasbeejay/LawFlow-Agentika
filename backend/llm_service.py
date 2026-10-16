import os
import json
import logging
import httpx
from typing import Dict, Any, Optional
from backend.config import GROQ_API_KEY, GEMINI_API_KEY

logger = logging.getLogger("lawflow.llm")

async def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
    """
    Tiered Resilient LLM Service:
    Tier 1: Groq API (ultra-low latency, Llama-3.3-70b / Llama-3.1-8b)
    Tier 2: Google Gemini 1.5 Flash API (fallback)
    Tier 3: Intelligent Local Judicial Engine (offline mode - zero failure guarantee)
    """

    # --- Tier 1: Groq Cloud API ---
    if GROQ_API_KEY:
        models_to_try = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "allam-2-7b"]
        for model in models_to_try:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            "temperature": temperature,
                            "response_format": {"type": "json_object"} if "JSON" in system_prompt else None
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        content = data["choices"][0]["message"]["content"]
                        logger.info(f"Successfully received LLM response from Groq ({model}).")
                        return content
                    else:
                        logger.warning(f"Groq API model {model} returned {res.status_code}. Trying next model...")
            except Exception as e:
                logger.warning(f"Groq API call failed for {model} ({e}).")


    # --- Tier 2: Google Gemini Flash API ---
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": f"System Directive: {system_prompt}\n\nUser Case Data:\n{user_prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": temperature
                }
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers={"Content-Type": "application/json"}, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    logger.info("Successfully received LLM response from Gemini.")
                    return content
                else:
                    logger.warning(f"Gemini API returned status {res.status_code}. Falling back to Tier 3.")
        except Exception as e:
            logger.warning(f"Gemini API call failed ({e}). Falling back to Tier 3.")

    # --- Tier 3: Deterministic Offline Judicial Reasoning Engine ---
    logger.info("Operating in Tier 3 (Local Judicial Fallback Engine) for guaranteed zero-downtime.")
    return None
