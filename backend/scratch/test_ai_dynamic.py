import requests
import json
import sys

def test_ai_dynamic_generation():
    url = "http://localhost:8000/api/ai/generate-content"
    
    # Simulate a request for a product where we want the AI to pick the taxonomy
    payload = {
        "product_name": "Charcoal Deep Cleansing Face Wash",
        "brand": "PureNatura",
        "category": "Skin Care", # Initial hint
        "target_fields": [
            "product_name", 
            "alternate_product_name", 
            "category", 
            "sub_category", 
            "tax_rule_code", 
            "tax_percent",
            "key_feature"
        ],
        "custom_instruction": "Ensure the sub-category is selected from our list. Make it sound professional."
    }
    
    print(f"Testing AI Dynamic Generation: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print("\n--- Response Received ---")
        print(json.dumps(data, indent=2))
        
        # Basic validation
        if data.get("category") and data.get("sub_category"):
            print(f"\nCategorization: SUCCESS ({data['category']} > {data['sub_category']})")
        else:
            print(f"\nCategorization: FAILED (Missing fields)")
            
        if data.get("tax_percent") == 18.0:
            print(f"Tax Calculation: SUCCESS ({data['tax_percent']}%)")
        else:
            print(f"Tax Calculation: FAILED (Got {data.get('tax_percent')})")

        if data.get("tax_rule_code"):
             print(f"HSN Generation: SUCCESS ({data['tax_rule_code']})")
        else:
             print(f"HSN Generation: FAILED")
             
        print("\nVerification: DONE")
        
    except Exception as e:
        print(f"\nVerification: FAILED")
        print(f"Error: {e}")
        if 'response' in locals():
            print(f"Body: {response.text}")
        sys.exit(1)

if __name__ == "__main__":
    test_ai_dynamic_generation()
