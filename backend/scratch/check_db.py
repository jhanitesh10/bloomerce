from database import engine
from sqlalchemy import inspect
import models

inspector = inspect(engine)
columns = [c['name'] for c in inspector.get_columns('sku_master')]
print(f"Columns in sku_master: {columns}")

# Check for our new columns
new_cols = ['net_quantity', 'net_quantity_unit_reference_id', 'size_reference_id']
missing = [c for c in new_cols if c not in columns]
if missing:
    print(f"MISSING COLUMNS: {missing}")
else:
    print("All columns present!")
