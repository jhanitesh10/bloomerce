import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import models
import schemas
from database import SessionLocal
from sqlalchemy import func
import re
import uuid

db = SessionLocal()

def safe_label(val):
    if val is None: return ""
    return str(val).strip()

data = schemas.BulkImportRequest(skus=[
    schemas.SkuImportRow(
        product_name="MAKEUP BY SITI Beauty Blender New Age Makeup Sponge Curved - Baby Pink",
        sku_code="8904367300846",
        mrp=350,
        purchase_cost=17,
        platform_identifiers=[
            {
                "id": "8904367300846",
                "channel_name": "amazon",
                "type": "asin"
            }
        ],
        barcode="8904367300846",
        category_label="Makeup Tools & Accessories",
        status_label="Active",
        bundle_type_label="Single"
    )
])

print("DEBUG: Starting local test")

try:
    # 1. Collect all unique labels to resolve
    unique_refs = {
        "BRAND": set(), "CATEGORY": set(), "SUB_CATEGORY": set(),
        "STATUS": set(), "BUNDLE_TYPE": set(), "PACK_TYPE": set(),
        "NET_QUANTITY_UNIT": set(), "SIZE": set(), "COLOR": set()
    }

    for s in data.skus:
        if s.brand_label: unique_refs["BRAND"].add(safe_label(s.brand_label))
        if s.category_label: unique_refs["CATEGORY"].add(safe_label(s.category_label))
        if s.sub_category_label: unique_refs["SUB_CATEGORY"].add(safe_label(s.sub_category_label))
        if s.status_label: unique_refs["STATUS"].add(safe_label(s.status_label))
        if s.bundle_type_label: unique_refs["BUNDLE_TYPE"].add(safe_label(s.bundle_type_label))
        if s.pack_type_label: unique_refs["PACK_TYPE"].add(safe_label(s.pack_type_label))
        if s.net_quantity_unit_label: unique_refs["NET_QUANTITY_UNIT"].add(safe_label(s.net_quantity_unit_label))
        if s.size_label: unique_refs["SIZE"].add(safe_label(s.size_label))
        if s.color_label: unique_refs["COLOR"].add(safe_label(s.color_label))

    print("DEBUG: Unique refs collected")
    # 2. Batch resolve existing references
    ref_map = {} # (type, label_lower) -> {"id": id, "label": label}
    for ref_type, labels in unique_refs.items():
        if not labels: continue
        print(f"DEBUG: Querying {ref_type}")
        existing = db.query(models.ReferenceData).filter(
            models.ReferenceData.reference_data_type == ref_type,
            func.lower(models.ReferenceData.label).in_([l.lower() for l in labels]),
            models.ReferenceData.deleted_at == None
        ).all()
        for r in existing:
            ref_map[(ref_type, r.label.lower())] = {"id": r.id, "label": r.label}

    print(f"DEBUG: References resolved: {len(ref_map)}")
    # 3. Create missing references (Auto-create logic)
    for ref_type, labels in unique_refs.items():
        for l in labels:
            if not l: continue
            clean_l = l.strip()
            if (ref_type, clean_l.lower()) not in ref_map:
                print(f"DEBUG: Creating missing ref: {ref_type}:{clean_l}")
                slug = re.sub(r'[^a-z0-9]+', '_', clean_l.lower()).strip('_')
                unique_suffix = uuid.uuid4().hex[:6]
                new_key = f"{ref_type.lower()}_{slug}_{unique_suffix}"

                try:
                    with db.begin_nested():
                        new_ref = models.ReferenceData(
                            reference_data_type=ref_type,
                            label=clean_l,
                            key=new_key,
                            is_active=True
                        )
                        db.add(new_ref)
                        db.flush()
                        ref_map[(ref_type, clean_l.lower())] = {"id": new_ref.id, "label": new_ref.label}
                except Exception as e:
                    print(f"DEBUG: Ref create failed: {e}")
                    existing_after_fail = db.query(models.ReferenceData).filter(
                        models.ReferenceData.reference_data_type == ref_type,
                        func.lower(models.ReferenceData.label) == clean_l.lower(),
                        models.ReferenceData.deleted_at == None
                    ).first()
                    if existing_after_fail:
                        ref_map[(ref_type, clean_l.lower())] = {"id": existing_after_fail.id, "label": existing_after_fail.label}

    print("DEBUG: Reference auto-creation complete")
    # 4. Batch resolve existing SKUs by sku_code
    incoming_sku_codes = [s.sku_code for s in data.skus if s.sku_code]
    print(f"DEBUG: Querying SKUs: {incoming_sku_codes}")
    existing_skus = db.query(models.SkuMaster).filter(
        models.SkuMaster.sku_code.in_(incoming_sku_codes),
        models.SkuMaster.deletedAt == None
    ).all()

    sku_id_map = {s.sku_code: s for s in existing_skus}
    print(f"DEBUG: Existing SKUs resolved: {len(sku_id_map)}")

    # 5. Process Import
    success_count = 0
    failed_count = 0
    errors = []

    for s_data in data.skus:
        print(f"DEBUG: Processing SKU: {s_data.sku_code}")
        try:
            with db.begin_nested():
                payload = s_data.model_dump(exclude_unset=True)

                def get_ref(rtype, rlabel):
                    if not rlabel: return {"id": None, "label": None}
                    return ref_map.get((rtype, safe_label(rlabel).lower()), {"id": None, "label": None})

                if s_data.brand_label: payload["brand_reference_id"] = get_ref("BRAND", s_data.brand_label)["id"]
                if s_data.category_label: payload["category_reference_id"] = get_ref("CATEGORY", s_data.category_label)["id"]
                if s_data.sub_category_label: payload["sub_category_reference_id"] = get_ref("SUB_CATEGORY", s_data.sub_category_label)["id"]
                if s_data.status_label: payload["status_reference_id"] = get_ref("STATUS", s_data.status_label)["id"]
                if s_data.bundle_type_label: payload["bundle_type"] = get_ref("BUNDLE_TYPE", s_data.bundle_type_label)["label"]
                if s_data.pack_type_label: payload["pack_type"] = get_ref("PACK_TYPE", s_data.pack_type_label)["label"]
                if s_data.net_quantity_unit_label: payload["net_quantity_unit_reference_id"] = get_ref("NET_QUANTITY_UNIT", s_data.net_quantity_unit_label)["id"]
                if s_data.size_label: payload["size_reference_id"] = get_ref("SIZE", s_data.size_label)["id"]
                if s_data.color_label: payload["color"] = get_ref("COLOR", s_data.color_label)["label"]

                for k in ["brand_label", "category_label", "sub_category_label", "status_label", "bundle_type_label", "pack_type_label", "net_quantity_unit_label", "size_label", "color_label"]:
                    if k in payload: del payload[k]

                for k, v in payload.items():
                    if v == "": payload[k] = None

                existing_sku = sku_id_map.get(s_data.sku_code)
                if existing_sku:
                    print("DEBUG: Updating existing SKU")
                    for k, v in payload.items():
                        if k == "platform_identifiers" and v is not None:
                            existing_ids = existing_sku.platform_identifiers or []
                            if not isinstance(existing_ids, list): existing_ids = []
                            
                            merged_map = {
                                (p.get('channel_name', '').lower(), p.get('type', '').lower()): p 
                                for p in existing_ids if isinstance(p, dict)
                            }
                            for nid in v:
                                if isinstance(nid, dict) and nid.get('id') and nid.get('channel_name'):
                                    key = (nid.get('channel_name', '').lower(), nid.get('type', '').lower())
                                    merged_map[key] = nid
                            setattr(existing_sku, k, list(merged_map.values()))
                        else:
                            setattr(existing_sku, k, v)
                else:
                    print("DEBUG: Creating new SKU")
                    new_sku = models.SkuMaster(**payload)
                    db.add(new_sku)
                    sku_id_map[s_data.sku_code] = new_sku

                db.flush()
            success_count += 1
        except Exception as e:
            print(f"DEBUG: SKU processing failed: {e}")
            failed_count += 1
            errors.append({"sku_code": s_data.sku_code, "error": str(e)})

    print(f"DEBUG: Process complete, committing...")
    db.commit()
    print(f"DEBUG: Commit complete. Success: {success_count}, Failed: {failed_count}")

except Exception as e:
    print(f"DEBUG: Critical Error: {e}")
    db.rollback()
finally:
    db.close()
