import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
base_url = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

keys = {
    "GEMINI_ANALYSIS_API_KEY": os.getenv("GEMINI_ANALYSIS_API_KEY"),
    "GEMINI_ANALYSIS_API_KEY_2": os.getenv("GEMINI_ANALYSIS_API_KEY_2"),
    "GEMINI_CONTENT_API_KEY": os.getenv("GEMINI_CONTENT_API_KEY"),
    "GEMINI_CONTENT_API_KEY_2": os.getenv("GEMINI_CONTENT_API_KEY_2"),
    "GEMINI_API_KEY_5": os.getenv("GEMINI_API_KEY_5"),
    "GEMINI_API_KEY_6": os.getenv("GEMINI_API_KEY_6"),
}

print(f"Testing model: {model} with base_url: {base_url}", flush=True)

# First test available models or simple test on first key
for name, k in keys.items():
    if not k:
        print(f"{name}: NOT SET", flush=True)
        continue
    masked = f"{k[:6]}...{k[-4:]}"
    print(f"\n--- Testing {name} ({masked}) ---", flush=True)
    client = OpenAI(api_key=k, base_url=base_url)
    for test_model in [model, "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.5-pro"]:
        try:
            print(f"  Attempting model '{test_model}'...", end="", flush=True)
            res = client.chat.completions.create(
                model=test_model,
                messages=[{"role": "user", "content": "Say hello in 3 words"}],
                timeout=10.0,
            )
            print(f" SUCCESS: {res.choices[0].message.content.strip()}", flush=True)
            break
        except Exception as e:
            print(f" FAILED -> {type(e).__name__}: {e}", flush=True)
