"""
Vendor Service — LLM client factory for free-tier providers.

Supported vendors:
  - groq       : Groq API (llama3, mixtral, gemma2)
  - google     : Google Gemini (gemini-1.5-flash, gemini-2.0-flash)
  - mistral    : Mistral AI (mistral-small, open-mistral-nemo)
  - ollama     : Local Ollama server (llama3.2, phi3, qwen2.5)
  - openrouter : OpenRouter free models (via OpenAI-compatible API)
"""
from typing import Dict, Optional
from langchain_core.language_models import BaseChatModel


VENDOR_MODELS: Dict[str, list] = {
    "groq": [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    ],
    "google": [
        "gemini-1.5-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro",
    ],
    "mistral": [
        "mistral-small-latest",
        "open-mistral-nemo",
        "mistral-large-latest",
    ],
    "ollama": [
        "llama3.2",
        "phi3",
        "qwen2.5",
        "mistral",
        "gemma2",
    ],
    "openrouter": [
        "meta-llama/llama-3.3-70b:free",
        "mistralai/mistral-7b-instruct:free",
        "microsoft/phi-3-mini-128k-instruct:free",
        "google/gemma-3-27b-it:free",
    ],
}


def get_vendor_models() -> Dict[str, list]:
    """Return the catalog of vendors and their available models."""
    return VENDOR_MODELS


def create_llm(
    vendor: str,
    model: str,
    api_keys: Dict[str, str],
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> BaseChatModel:
    """
    Factory function — returns a LangChain chat model for the given vendor/model.
    api_keys: decrypted dict from user's stored keys, e.g. {"groq": "gsk_..."}
    """
    vendor = vendor.lower()

    if vendor == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            groq_api_key=api_keys.get("groq", ""),
        )

    elif vendor == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            temperature=temperature,
            max_output_tokens=max_tokens,
            google_api_key=api_keys.get("google", ""),
        )

    elif vendor == "mistral":
        from langchain_mistralai import ChatMistralAI
        return ChatMistralAI(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            mistral_api_key=api_keys.get("mistral", ""),
        )

    elif vendor == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=model,
            temperature=temperature,
            # No API key needed for local Ollama
        )

    elif vendor == "openrouter":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            openai_api_key=api_keys.get("openrouter", ""),
            openai_api_base="https://openrouter.ai/api/v1",
        )

    else:
        raise ValueError(f"Unsupported vendor: {vendor}")
