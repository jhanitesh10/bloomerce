import sys
import os
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import models
from database import SessionLocal

def seed_taxonomy():
    db = SessionLocal()
    try:
        print("Seeding Taxonomy...")
        
        # ── BRANDS ──────────────────────────────────────────────────────────────
        brands_data = [
            ("Bloom", "brand_bloom", 1),
            ("Glow", "brand_glow", 2),
            ("Pure", "brand_pure", 3),
        ]
        for label, key, order in brands_data:
            existing = db.query(models.ReferenceData).filter_by(reference_data_type="BRAND", key=key).first()
            if not existing:
                db.add(models.ReferenceData(reference_data_type="BRAND", label=label, key=key, display_order=order))
                print(f"  Added Brand: {label}")
        
        # ── CATEGORIES ──────────────────────────────────────────────────────────
        categories_data = [
            ("Skincare", "cat_skincare", 1),
            ("Haircare", "cat_haircare", 2),
            ("Bodycare", "cat_bodycare", 3),
            ("Makeup", "cat_makeup", 4),
        ]
        for label, key, order in categories_data:
            existing = db.query(models.ReferenceData).filter_by(reference_data_type="CATEGORY", key=key).first()
            if not existing:
                db.add(models.ReferenceData(reference_data_type="CATEGORY", label=label, key=key, display_order=order))
                print(f"  Added Category: {label}")

        # ── STATUSES ────────────────────────────────────────────────────────────
        statuses_data = [
            ("Active", "status_active", 1),
            ("Discontinued", "status_discontinued", 2),
            ("Draft", "status_draft", 3),
            ("Upcoming Launches", "status_upcoming", 4),
        ]
        for label, key, order in statuses_data:
            existing = db.query(models.ReferenceData).filter_by(reference_data_type="STATUS", key=key).first()
            if not existing:
                db.add(models.ReferenceData(reference_data_type="STATUS", label=label, key=key, display_order=order))
                print(f"  Added Status: {label}")

        # ── ECOMMERCE CHANNELS ───────────────────────────────────────────────────
        channels = [
            ("Amazon", "chan_amazon", 1, "https://www.vectorlogo.zone/logos/amazon/amazon-icon.svg", {"base_url": "https://www.amazon.in/dp/"}),
            ("Flipkart", "chan_flipkart", 2, "https://upload.wikimedia.org/wikipedia/commons/e/e5/Flipkart_logo_%282026%29.svg", {"base_url": "https://www.flipkart.com/product/"}),
            ("Meesho", "chan_meesho", 3, "https://www.google.com/s2/favicons?sz=256&domain=meesho.com", {"base_url": "https://www.meesho.com/s/p/"}),
            ("Myntra", "chan_myntra", 4, "https://www.google.com/s2/favicons?sz=256&domain=myntra.com", {"base_url": "https://www.myntra.com/"}),
            ("Nykaa", "chan_nykaa", 5, "https://www.google.com/s2/favicons?sz=256&domain=nykaa.com", {"base_url": "https://www.nykaa.com/"}),
            ("Tata Cliq", "chan_tata_cliq", 6, "https://www.google.com/s2/favicons?sz=256&domain=tatacliq.com", {"base_url": "https://www.tatacliq.com/p-"}),
            ("Snapdeal", "chan_snapdeal", 7, "https://www.google.com/s2/favicons?sz=256&domain=snapdeal.com", {"base_url": "https://www.snapdeal.com/product/"}),
            ("Zepto", "chan_zepto", 8, "https://www.google.com/s2/favicons?sz=256&domain=zeptonow.com", {"base_url": "https://www.zeptonow.com/product/"}),
            ("Blinkit", "chan_blinkit", 9, "https://www.google.com/s2/favicons?sz=256&domain=blinkit.com", {"base_url": "https://blinkit.com/p/"}),
            ("Purplle", "chan_purple", 10, "https://www.google.com/s2/favicons?sz=256&domain=purplle.com", {"base_url": "https://www.purplle.com/product/"}),
            ("AJIO", "chan_ajio", 11, "https://www.google.com/s2/favicons?sz=256&domain=ajio.com", {"base_url": "https://www.ajio.com/p/"})
        ]
        for label, key, order, icon, meta in channels:
            existing = db.query(models.ReferenceData).filter_by(reference_data_type="ECOMMERCE_CHANNEL", key=key).first()
            if not existing:
                db.add(models.ReferenceData(reference_data_type="ECOMMERCE_CHANNEL", label=label, key=key, display_order=order, icon=icon, metadata_json=meta))
                print(f"  Added Channel: {label}")
            else:
                existing.label = label
                existing.display_order = order
                existing.icon = icon
                existing.metadata_json = meta
                print(f"  Updated Channel: {label}")

        # ── BUNDLE TYPES ──────────────────────────────────────────────────────────
        bundle_types_data = [
            ("Single", "bt_single", 1),
            ("Combo", "bt_combo", 2),
            ("Pack of 2", "bt_pack2", 3),
            ("Pack of 3", "bt_pack3", 4),
        ]
        for label, key, order in bundle_types_data:
            existing = db.query(models.ReferenceData).filter_by(reference_data_type="BUNDLE_TYPE", key=key).first()
            if not existing:
                db.add(models.ReferenceData(reference_data_type="BUNDLE_TYPE", label=label, key=key, display_order=order))
                print(f"  Added Bundle Type: {label}")

        # ── PACK TYPES ────────────────────────────────────────────────────────────
        pack_types_data = [
            ("Mono Carton", "pt_mono_carton", 1),
            ("Glass Bottle", "pt_glass_bottle", 2),
            ("Plastic Jar", "pt_plastic_jar", 3),
            ("Tube", "pt_tube", 4),
            ("Box", "pt_box", 5),
        ]
        for label, key, order in pack_types_data:
            existing = db.query(models.ReferenceData).filter_by(reference_data_type="PACK_TYPE", key=key).first()
            if not existing:
                db.add(models.ReferenceData(reference_data_type="PACK_TYPE", label=label, key=key, display_order=order))
                print(f"  Added Pack Type: {label}")

        db.commit()
        print("Taxonomy seeding complete.")
    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_taxonomy()
