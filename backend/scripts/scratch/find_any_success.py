import os
import litellm
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.getenv('AI_API_KEY')

models = [
    "openrouter/google/gemma-2-9b-it:free",
    "openrouter/meta-llama/llama-3-8b-instruct:free",
    "openrouter/mistralai/mistral-7b-instruct:free",
    "openrouter/microsoft/phi-3-mini-128k-instruct:free",
    "openrouter/google/gemini-2.0-flash-lite-preview-02-05:free"
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
