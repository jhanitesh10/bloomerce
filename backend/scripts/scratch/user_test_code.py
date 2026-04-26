import os
import litellm
from dotenv import load_dotenv

# Load our .env configuration
load_dotenv('backend/.env')
api_key = os.getenv('AI_API_KEY')

# Set environment variables exactly as in the sample
os.environ["OPENROUTER_API_KEY"] = api_key
os.environ["OPENROUTER_API_BASE"] = "https://openrouter.ai/api/v1" # Recommended base
os.environ["OR_SITE_URL"] = "https://bloomerce.com" # Placeholder
os.environ["OR_APP_NAME"] = "Bloomerce" # Placeholder

messages = [{"role": "user", "content": "Say hello!"}]

print(f"Testing with model: openrouter/google/palm-2-chat-bison")
try:
    response = litellm.completion(
        model="openrouter/google/palm-2-chat-bison",
        messages=messages,
    )
    print(f"SUCCESS: {response.choices[0].message.content}")
except Exception as e:
    print(f"FAILED with palm-2-chat-bison: {e}")
    
    # Try with a modern free model to see if it's just the model being deprecated
    print(f"\nRetrying with modern model: openrouter/google/gemma-3-27b-it:free")
    try:
        response = litellm.completion(
            model="openrouter/google/gemma-3-27b-it:free",
            messages=messages,
        )
        print(f"SUCCESS (Gemma 3): {response.choices[0].message.content}")
    except Exception as e2:
        print(f"FAILED with Gemma 3: {e2}")
