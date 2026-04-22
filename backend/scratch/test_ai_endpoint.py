import requests
import json
import sys

def test_ai_generation():
    url = "http://localhost:8000/api/ai/generate-content"
    
    payload = {
        "product_name": "Rose Face Wash",
        "brand": "Bloom Botanics",
        "category": "Skincare",
        "reference_url": "https://www.nykaa.com/forest-essentials-delicate-facial-cleanser-mashobra-honey-lemon-rosewater/p/16281",
        "message": "Focus on the organic Mashobra honey aspect if possible.",
        "target_fields": ["product_name", "alternate_product_name", "description", "key_feature", "seo_keywords"],
        "custom_instruction": "Make it sound very luxury, organic, and suitable for the Indian market."
    }
    
    print(f"Testing AI Generation Endpoint: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print("\n--- Response Received ---")
        print(json.dumps(data, indent=2))
        print("\nVerification: SUCCESS")
        
    except requests.exceptions.HTTPError as e:
        print(f"\nVerification: FAILED (HTTP Error)")
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"\nVerification: FAILED")
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_ai_generation()
