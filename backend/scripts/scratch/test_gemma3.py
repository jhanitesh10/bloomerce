import os
from litellm import completion
from dotenv import load_dotenv

# Load .env
load_dotenv('backend/.env')
api_key = os.getenv('AI_API_KEY')
os.environ['OPENROUTER_API_KEY'] = api_key

model = "openrouter/google/gemma-3-27b-it:free"

print(f"\nTrying model: {model}")
try:
    response = completion(
        model=model,
        messages=[{"role": "user", "content": "Say hello!"}],
        timeout=30
    )
    print(f"SUCCESS: {response.choices[0].message.content}")
except Exception as e:
    print(f"FAILED: {e}")
