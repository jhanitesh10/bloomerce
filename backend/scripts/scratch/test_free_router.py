import os
import asyncio
from dotenv import load_dotenv
from ai_service import get_ai_provider

# Load our .env configuration
load_dotenv('backend/.env')

async def run_test():
    provider = get_ai_provider()
    if not provider:
        print("Provider not found")
        return
        
    print(f"Testing with provider model: {provider.model}")
    try:
        # This will trigger the rotation logic internally if needed
        response = await provider.generate_generic_content("Say hello!")
        print(f"SUCCESS: {response}")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())
