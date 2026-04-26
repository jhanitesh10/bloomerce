import requests
import json

url = "http://localhost:8000/api/skus/bulk-import"
data = {
    "skus": [
        {
            "product_name": "MAKEUP BY SITI Beauty Blender New Age Makeup Sponge Curved - Baby Pink",
            "sku_code": "8904367300846",
            "mrp": 350,
            "purchase_cost": 17,
            "platform_identifiers": [
                {
                    "id": "8904367300846",
                    "channel_name": "amazon",
                    "type": "asin"
                }
            ],
            "barcode": "8904367300846",
            "category_label": "Makeup Tools & Accessories",
            "status_label": "Active",
            "bundle_type_label": "Single"
        }
    ]
}

try:
    response = requests.post(url, json=data, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
