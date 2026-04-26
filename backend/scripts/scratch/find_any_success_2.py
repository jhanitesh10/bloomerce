import os
import litellm
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.getenv('AI_API_KEY')

models = [
    "openrouter/google/gemini-2.0-flash-lite-001:free",
    "openrouter/google/gemini-2.0-flash-lite:free",
    "openrouter/deepseek/deepseek-r1:free",
    "openrouter/meta-llama/llama-3.1-8b-instruct", # Not free but maybe trial?
    "openrouter/google/gemma-3-27b-it:free"
]

for m in models:
    print(f"Trying {m}...")
    try:
        res = litellm.completion(
            model=m,
            messages=[{"role": "user", "content": "hi"}],
            api_key=api_key,
            api_base="https://openrouter.ai/api/v1"
        )
        print(f"SUCCESS with {m}: {res.choices[0].message.content}")
        break
    except Exception as e:
        print(f"FAILED {m}: {e}")
