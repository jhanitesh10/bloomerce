import os
from litellm import completion
from dotenv import load_dotenv

# Load .env
load_dotenv('backend/.env')
api_key = os.getenv('AI_API_KEY')
os.environ['OPENROUTER_API_KEY'] = api_key

models_to_try = [
    "openrouter/google/gemini-2.0-flash-lite-preview-02-05:free",
    "openrouter/google/gemini-2.0-flash-exp:free",
    "openrouter/meta-llama/llama-3.1-8b-instruct:free",
    "openrouter/mistralai/mistral-7b-instruct:free"
]

for model in models_to_try:
    print(f"\nTrying model: {model}")
    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": "Say hello!"}],
            timeout=30
        )
        print(f"SUCCESS: {response.choices[0].message.content}")
        break
    except Exception as e:
        print(f"FAILED: {e}")
