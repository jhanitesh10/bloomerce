import os
import asyncio
from dotenv import load_dotenv
from ai_service import get_ai_provider

async def test_openrouter():
    # Load .env from backend directory
    dotenv_path = os.path.join(os.getcwd(), 'backend', '.env')
    load_dotenv(dotenv_path)
    
    print(f"Testing with AI_MODEL: {os.getenv('AI_MODEL')}")
    # Test auto-free mode
    os.environ['AI_MODEL'] = "openrouter/auto-free"
    provider = get_ai_provider()
    
    if not provider:
        print("Failed to get AI provider")
        return

    try:
        # Test generic content (text)
        print("Testing text generation...")
        response = await provider.generate_generic_content(
            prompt="Hello, who are you? Tell me your model name if you know it.",
            system_prompt="You are a helpful assistant."
        )
        print(f"Response: {response}")
        
        # Test Vision (using a placeholder image or real one if available)
        print("\nTesting vision (with placeholder)...")
        # We'll use a public image for testing
        test_image = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/640px-Image_created_with_a_mobile_phone.png"
        
        # We need a dummy SkuContentResponse test
        sku_response = await provider.generate_sku_content(
            product_name="Test Product",
            brand="Test Brand",
            category="Test Category",
            image_url=test_image,
            target_fields=["product_name", "description"]
        )
        print(f"Vision Response: {sku_response.product_name} - {sku_response.description[:100]}...")
        
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    async def main():
        await test_openrouter()
    
    asyncio.run(main())
