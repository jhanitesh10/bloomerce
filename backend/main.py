import os
import uuid
import json
import logging
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func, String, cast
from sqlalchemy.orm import Session
import zipfile
import io
from sqlalchemy.orm.attributes import flag_modified
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import re

import models
import schemas
from database import engine, get_db, SessionLocal
import ai_service
from drive_service import DriveService

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

from sqlalchemy.exc import IntegrityError
# Table creation is handled in the lifespan to avoid crashing on module load in serverless environments
# models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created on startup
    try:
        models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Startup error: {e}")
    yield

app = FastAPI(title="Bloomerce Relational API", lifespan=lifespan)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is reached"}


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=400, content={"detail": f"Database Integrity Error: {str(exc.orig)}"})

# Handle uploads directory gracefully (Vercel has a read-only filesystem except for /tmp)
UPLOAD_DIR = "uploads"
if os.getenv("VERCEL"):
    UPLOAD_DIR = "/tmp/uploads"

try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
    logger.info(f"Mounted static files at /uploads from {UPLOAD_DIR}")
except Exception as e:
    logger.error(f"Error setting up uploads directory: {e}")

# CORS Configuration
# We explicitly list the frontend origin to support allow_credentials=True,
# which is often required for secure browser contexts and cross-origin persistence.
env_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [o.strip().rstrip('/') for o in env_origins.split(",") if o.strip()] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://bloomerce.vercel.app",
    "https://bloomerce-backend-jha-niteshs-projects.vercel.app",
]
logger.info(f"Allowed CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from fastapi import Request

@app.post("/api/upload")
async def upload_image(request: Request, file: UploadFile = File(...)):
    try:
        # Ensure directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
            
        # Generate dynamic base URL from request
        base_url = str(request.base_url).rstrip('/')
        return {"url": f"{base_url}/uploads/{filename}"}
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ==========================================
# REFERENCE DATA CONTROLLERS
# ==========================================

@app.get("/api/references", response_model=List[schemas.ReferenceData])
def get_references(ref_type: str = None, db: Session = Depends(get_db)):
    query = db.query(models.ReferenceData).filter(models.ReferenceData.deleted_at == None)
    if ref_type:
        query = query.filter(models.ReferenceData.reference_data_type == ref_type)
    return query.all()

@app.post("/api/references", response_model=schemas.ReferenceData)
def create_reference(data: schemas.ReferenceDataCreate, db: Session = Depends(get_db)):
    # 1. Normalize label and type
    label = data.label.strip() if data.label else ""
    ref_type = data.reference_data_type.strip().upper()

    # 2. Case-insensitive duplicate check
    from sqlalchemy import func
    existing = db.query(models.ReferenceData).filter(
        func.lower(models.ReferenceData.label) == label.lower(),
        models.ReferenceData.reference_data_type == ref_type,
        models.ReferenceData.deleted_at == None
    ).first()

    if existing:
        return existing

    # 3. Key Generation & Model Construction
    payload = data.model_dump()
    if not payload.get("key"):
        # Generate a safe, unique key from the label
        slug = re.sub(r'[^a-z0-9]+', '_', label.lower()).strip('_')
        unique_suffix = uuid.uuid4().hex[:6]
        payload["key"] = f"{ref_type.lower()}_{slug}_{unique_suffix}"

    db_item = models.ReferenceData(**payload)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/references/{id}", response_model=schemas.ReferenceData)
def update_reference(id: int, data: schemas.ReferenceDataCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.ReferenceData).filter(models.ReferenceData.id == id, models.ReferenceData.deleted_at == None).first()
    if not db_item: raise HTTPException(404, "Not Found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/references/{id}")
def delete_reference(id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.ReferenceData).filter(models.ReferenceData.id == id).first()
    if not db_item: raise HTTPException(404, "Not Found")
    db_item.deleted_at = datetime.datetime.utcnow()
    db.commit()
    return {"message": "Deleted securely"}


# ==========================================
# SKU MASTER CONTROLLERS
# ==========================================

@app.get("/api/skus", response_model=List[schemas.SkuMaster])
def get_skus(db: Session = Depends(get_db)):
    return db.query(models.SkuMaster).filter(models.SkuMaster.deleted_at == None).all()

@app.get("/api/skus-search")
def search_skus(q: str = "", db: Session = Depends(get_db)):
    """Search for SKUs by code or name for linking purposes."""
    return db.query(models.SkuMaster).filter(
        (models.SkuMaster.sku_code.ilike(f"%{q}%")) |
        (models.SkuMaster.product_name.ilike(f"%{q}%"))
    ).filter(models.SkuMaster.deleted_at == None).limit(20).all()

@app.get("/api/skus/{id}", response_model=schemas.SkuMaster)
def get_sku(id: int, db: Session = Depends(get_db)):
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id, models.SkuMaster.deleted_at == None).first()
    if not sku: raise HTTPException(404, "Not Found")
    return sku

@app.post("/api/skus", response_model=schemas.SkuMaster)
def create_sku(data: schemas.SkuMasterCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    
    # Resolve Ad-hoc references
    payload["brand_reference_id"] = _resolve_ad_hoc_ref(db, payload.get("brand_reference_id"), "BRAND")
    payload["category_reference_id"] = _resolve_ad_hoc_ref(db, payload.get("category_reference_id"), "CATEGORY")
    payload["sub_category_reference_id"] = _resolve_ad_hoc_ref(db, payload.get("sub_category_reference_id"), "SUB_CATEGORY", payload.get("category_reference_id"))
    payload["status_reference_id"] = _resolve_ad_hoc_ref(db, payload.get("status_reference_id"), "STATUS")
    payload["net_quantity_unit_reference_id"] = _resolve_ad_hoc_ref(db, payload.get("net_quantity_unit_reference_id"), "UNIT")
    payload["size_reference_id"] = _resolve_ad_hoc_ref(db, payload.get("size_reference_id"), "SIZE")

    db_item = models.SkuMaster(**payload)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/skus/{id}", response_model=schemas.SkuMaster)
def update_sku(id: int, data: schemas.SkuMasterCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.SkuMaster).filter(models.SkuMaster.id == id, models.SkuMaster.deleted_at == None).first()
    if not db_item: raise HTTPException(404, "Not Found")
    
    payload = data.model_dump(exclude_unset=True)
    
    # Resolve Ad-hoc references
    if "brand_reference_id" in payload:
        payload["brand_reference_id"] = _resolve_ad_hoc_ref(db, payload["brand_reference_id"], "BRAND")
    if "category_reference_id" in payload:
        payload["category_reference_id"] = _resolve_ad_hoc_ref(db, payload["category_reference_id"], "CATEGORY")
    if "sub_category_reference_id" in payload:
        # Note: We use the already resolved category_id from payload or from db_item
        cat_id = payload.get("category_reference_id") or db_item.category_reference_id
        payload["sub_category_reference_id"] = _resolve_ad_hoc_ref(db, payload["sub_category_reference_id"], "SUB_CATEGORY", cat_id)
    if "status_reference_id" in payload:
        payload["status_reference_id"] = _resolve_ad_hoc_ref(db, payload["status_reference_id"], "STATUS")
    if "net_quantity_unit_reference_id" in payload:
        payload["net_quantity_unit_reference_id"] = _resolve_ad_hoc_ref(db, payload["net_quantity_unit_reference_id"], "UNIT")
    if "size_reference_id" in payload:
        payload["size_reference_id"] = _resolve_ad_hoc_ref(db, payload["size_reference_id"], "SIZE")

    for k, v in payload.items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/skus/{id}")
def delete_sku(id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not db_item: raise HTTPException(404, "Not Found")
    db_item.deleted_at = datetime.datetime.utcnow()
    db.commit()
    return {"message": "Deleted securely"}


def _get_ref_label(db: Session, ref_id: Optional[int]) -> str:
    if not ref_id: return "unknown"
    ref = db.query(models.ReferenceData).filter(models.ReferenceData.id == ref_id).first()
    if not ref: return "unknown"
    # Create a slug from the label
    return re.sub(r'[^a-zA-Z0-9]+', '_', ref.label.lower()).strip('_')

def _resolve_ad_hoc_ref(db: Session, val: Any, ref_type: str, parent_id: Optional[int] = None) -> Optional[int]:
    """Resolves a value (ID or Label) to a reference ID. Creates if new label."""
    if val is None or val == "":
        return None
        
    try:
        # Check if it's already an integer (ID)
        return int(val)
    except (ValueError, TypeError):
        # It's a string label - find or create
        label = str(val).strip()
        from sqlalchemy import func
        existing = db.query(models.ReferenceData).filter(
            func.lower(models.ReferenceData.label) == label.lower(),
            models.ReferenceData.reference_data_type == ref_type.upper(),
            models.ReferenceData.deleted_at == None
        )
        if parent_id:
            existing = existing.filter(models.ReferenceData.parent_reference_id == parent_id)
            
        found = existing.first()
        if found:
            return found.id
            
        # Create new ad-hoc reference using our existing controller logic
        new_ref = create_reference(schemas.ReferenceDataCreate(
            reference_data_type=ref_type.upper(),
            label=label,
            parent_reference_id=parent_id
        ), db)
        return new_ref.id

def parse_codes(c):
    """Normalizes both old (dict) and new (list) group code formats to a list of {type, id}."""
    if not c: return []
    if isinstance(c, list): return c
    if isinstance(c, dict):
        return [{"type": k, "id": v} for k, v in c.items() if v]
    if isinstance(c, str):
        # Check for JSON first
        try:
            parsed = json.loads(c)
            if isinstance(parsed, list): return parsed
            if isinstance(parsed, dict):
                return [{"type": k, "id": v} for k, v in parsed.items() if v]
        except:
            pass

        # Handle pipe-separated legacy format (e.g. ID_PKG|ID_RAW)
        if '|' in c:
            parts = c.split('|')
            results = []
            for p in parts:
                p = p.strip()
                t = 'unknown'
                p_up = p.upper()
                if '_RAW' in p_up: t = 'raw'
                elif '_PKG' in p_up: t = 'package'
                elif '_LBL' in p_up: t = 'label'
                elif '_STK' in p_up: t = 'sticker'
                elif '_MC' in p_up: t = 'monocarton'
                results.append({'type': t, 'id': p})
            return results
    return []

def get_code(codes, t):
    """Helper to find a specific component ID within the array structure."""
    for entry in codes:
        if entry.get("type") == t:
            return entry.get("id")
    return None

def set_code(codes, t, pool_id):
    """Adds or updates a component ID within the array structure."""
    new_codes = [c for c in codes if c.get("type") != t]
    new_codes.append({"type": t, "id": pool_id})
    return new_codes

def _perform_component_link(db: Session, source_sku: models.SkuMaster, target_sku: models.SkuMaster, component_type: str):
    """Internal helper to link a specific component type between two SKUs."""

    t_codes = parse_codes(target_sku.product_component_group_code)
    s_codes = parse_codes(source_sku.product_component_group_code)

    existing_code = get_code(t_codes, component_type) or get_code(s_codes, component_type)

    if not existing_code:
        u_id = uuid.uuid4().hex[:8]
        brand = _get_ref_label(db, target_sku.brand_reference_id)
        subcat = _get_ref_label(db, target_sku.sub_category_reference_id)
        size = _get_ref_label(db, target_sku.size_reference_id)
        color = re.sub(r'[^a-zA-Z0-9]+', '_', (target_sku.color or "none").lower()).strip('_')
        pkg_size = re.sub(r'[^a-zA-Z0-9]+', '_', (target_sku.package_size or "none").lower()).strip('_')

        if component_type == 'raw':
            # Generic: No brand
            existing_code = f"{subcat}_{color}_{size}_raw_{u_id}"
        elif component_type == 'package':
            # Generic: No brand
            existing_code = f"{subcat}_{pkg_size}_package_{u_id}"
        elif component_type == 'label':
            # Brand-Specific (Brand moved after subcat)
            existing_code = f"{subcat}_{brand}_label_{u_id}"
        elif component_type == 'sticker':
            # Generic
            existing_code = f"{subcat}_sticker_{u_id}"
        else: # monocarton or others
            # Brand-Specific for monocarton
            if component_type == 'monocarton':
                existing_code = f"{subcat}_{brand}_{component_type}_{u_id}"
            else:
                existing_code = f"{subcat}_{component_type}_{u_id}"

    new_s_codes = set_code(s_codes, component_type, existing_code)
    new_t_codes = set_code(t_codes, component_type, existing_code)

    source_sku.product_component_group_code = new_s_codes
    target_sku.product_component_group_code = new_t_codes

    flag_modified(source_sku, "product_component_group_code")
    flag_modified(target_sku, "product_component_group_code")

    return existing_code

@app.post("/api/skus/{id}/link-component")
def link_component(id: int, component_type: str, target_sku_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Links this SKU to another SKU's component pool, or creates a new one."""
    source_sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not source_sku: raise HTTPException(404, "Source SKU not found")

    target_sku = source_sku
    if target_sku_id:
        target_sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == target_sku_id).first()
        if not target_sku: raise HTTPException(404, "Target SKU not found")

    code = _perform_component_link(db, source_sku, target_sku, component_type)
    db.commit()
    return {"status": "success", "code": code}


@app.get("/api/skus/{id}/pool-info")
def get_pool_info(id: int, db: Session = Depends(get_db)):
    """Returns a flat list of all SKUs sharing ANY component pool with this one."""
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not sku: raise HTTPException(404, "SKU not found")

    codes = parse_codes(sku.product_component_group_code)
    pool_ids = [entry.get("id") for entry in codes if entry.get("id")]

    if not pool_ids:
        return []

    # Build a combined query using OR for all pool IDs
    from sqlalchemy import or_
    filters = [cast(models.SkuMaster.product_component_group_code, String).like(f'%"{p_id}"%') for p_id in pool_ids]

    peers = db.query(
        models.SkuMaster.id,
        models.SkuMaster.product_name,
        models.SkuMaster.sku_code,
        models.SkuMaster.product_component_group_code,
        models.SkuMaster.catalog_url
    ).filter(
        models.SkuMaster.id != id,
        models.SkuMaster.deleted_at == None,
        or_(*filters)
    ).all()

    return [
        {
            "id": p.id,
            "product_name": p.product_name,
            "sku_code": p.sku_code,
            "product_component_group_code": parse_codes(p.product_component_group_code),
            "catalog_url": getattr(p, 'catalog_url', None)
        }
        for p in peers
    ]

@app.delete("/api/skus/{id}/link-component/{type}")
def unlink_component(id: int, type: str, db: Session = Depends(get_db)):
    """Removes a component from its pool, making it a unique asset again."""
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not sku: raise HTTPException(404, "SKU not found")

    codes = parse_codes(sku.product_component_group_code)
    new_codes = [c for c in codes if c.get("type") != type]

    sku.product_component_group_code = new_codes
    flag_modified(sku, "product_component_group_code")
    db.commit()
    return {"status": "success"}

# --- AI Generation Enpoints ---

class AIContentRequest(BaseModel):
    product_name: str
    brand: str
    category: str
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = []
    reference_url: Optional[str] = None  # Legacy support
    reference_urls: Optional[List[str]] = []
    message: Optional[str] = None
    existing_data: Optional[Dict[str, Any]] = None
    target_fields: Optional[List[str]] = None
    custom_instruction: Optional[str] = None
    chips: Optional[List[str]] = []

@app.post("/api/ai/generate-content", response_model=ai_service.SkuContentResponse)
async def generate_ai_content(req: AIContentRequest, db: Session = Depends(get_db)):
    """
    Generates AI-enhanced content for a SKU.
    Supports multi-modal (images), reference URLs, and field-specific generation.
    """
    provider = ai_service.get_ai_provider()
    if not provider:
        logger.error("AI Provider requested but not configured in environment")
        raise HTTPException(500, "AI Provider not configured")

    # Fetch taxonomy for dynamic injection
    try:
        categories = db.query(models.ReferenceData).filter(models.ReferenceData.reference_data_type == "CATEGORY", models.ReferenceData.deleted_at == None).all()
        valid_categories = [r.label for r in categories]
        
        # Try to filter sub-categories by parent if category is selected in existing_data
        cat_id = (req.existing_data or {}).get("category_reference_id")
        
        # Ensure cat_id is an integer if it's a string from JSON
        if cat_id and isinstance(cat_id, str) and cat_id.isdigit():
            cat_id = int(cat_id)
            
        if cat_id and isinstance(cat_id, (int, float)):
            logger.info(f"Fetching sub-categories for Category ID: {cat_id}")
            valid_sub_categories = [r.label for r in db.query(models.ReferenceData).filter(
                models.ReferenceData.reference_data_type == "SUB_CATEGORY", 
                models.ReferenceData.parent_reference_id == int(cat_id),
                models.ReferenceData.deleted_at == None
            ).all()]
            
            # If no sub-categories found for this specific category, fall back to a reasonable sample
            if not valid_sub_categories:
                 logger.warning(f"No sub-categories found for Category ID {cat_id}, falling back to sample.")
                 valid_sub_categories = [r.label for r in db.query(models.ReferenceData).filter(models.ReferenceData.reference_data_type == "SUB_CATEGORY", models.ReferenceData.deleted_at == None).limit(50).all()]
        else:
            logger.info("No valid Category ID provided, fetching sample sub-categories.")
            valid_sub_categories = [r.label for r in db.query(models.ReferenceData).filter(models.ReferenceData.reference_data_type == "SUB_CATEGORY", models.ReferenceData.deleted_at == None).limit(50).all()]
    except Exception as te:
        logger.error(f"Taxonomy fetching error: {te}")
        valid_categories = []
        valid_sub_categories = []

    # Combine legacy single reference_url with the new list for the service
    reference_urls = req.reference_urls or []
    if req.reference_url and req.reference_url not in reference_urls:
        reference_urls.append(req.reference_url)

    try:
        logger.info(f"AI Content Request received for product: {req.product_name} (Brand: {req.brand})")
        logger.info(f"Target fields: {req.target_fields or 'ALL'}")

        # Merge 'message' into custom_instruction if both are provided, prioritizing 'message' if it exists
        instruction = req.message or req.custom_instruction

        content = await provider.generate_sku_content(
            product_name=req.product_name,
            brand=req.brand,
            category=req.category,
            image_url=req.image_url,
            image_urls=req.image_urls,
            reference_urls=reference_urls,
            existing_data=req.existing_data,
            target_fields=req.target_fields,
            custom_instruction=instruction,
            valid_categories=valid_categories,
            valid_sub_categories=valid_sub_categories,
            chips=req.chips
        )

        logger.info("AI Content generated successfully")
        return content
    except Exception as e:
        logger.exception(f"AI Generation Failed for '{req.product_name}'")
        # Return the actual error message for debugging
        detail = str(e)
        raise HTTPException(status_code=500, detail=detail)

@app.get("/api/skus/{id}/pool-discovery")
def get_pool_discovery(id: int, comp_type: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Automatically finds existing pools that match this SKU's attributes."""
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not sku: raise HTTPException(404, "SKU not found")


    current_codes = parse_codes(sku.product_component_group_code)

    discovery = {}
    scan_types = [comp_type] if comp_type else ['raw', 'package', 'label', 'monocarton', 'sticker']

    for t in scan_types:
        # Define match logic for each component
        config = {
            'raw': {'match': {'size_reference_id': sku.size_reference_id, 'color': sku.color, 'sub_category_reference_id': sku.sub_category_reference_id}},
            'package': {'match': {'package_size': sku.package_size, 'sub_category_reference_id': sku.sub_category_reference_id}},
            'label': {'match': {'sub_category_reference_id': sku.sub_category_reference_id, 'brand_reference_id': sku.brand_reference_id}},
            'monocarton': {'match': {'sub_category_reference_id': sku.sub_category_reference_id}},
            'sticker': {'match': {'sub_category_reference_id': sku.sub_category_reference_id}}
        }.get(t)

        if not config: continue

        query = db.query(models.SkuMaster).filter(models.SkuMaster.id != id, models.SkuMaster.deleted_at == None)
        # Apply attribute matching filters
        for attr, val in config['match'].items():
            if val is not None and val != "":
                query = query.filter(getattr(models.SkuMaster, attr) == val)

        matches = query.limit(20).all()

        results = []
        seen_pools = set()

        current_pool_id = get_code(current_codes, t)

        # Priority 1: Find existing pools
        for m in matches:
            m_codes = parse_codes(m.product_component_group_code)
            p_id = get_code(m_codes, t)

            if p_id and p_id not in seen_pools:
                is_connected = (p_id == current_pool_id) if current_pool_id else False

                # Find other products that share this EXACT pool_id for this EXACT type
                pool_members = []
                sibling_candidates = db.query(models.SkuMaster.id, models.SkuMaster.sku_code, models.SkuMaster.product_component_group_code).filter(
                    models.SkuMaster.id != id,
                    models.SkuMaster.deleted_at == None,
                    cast(models.SkuMaster.product_component_group_code, String).like(f'%"{p_id}"%')
                ).limit(10).all()

                for cand in sibling_candidates:
                    if cand.id == m.id: continue
                    if parse_codes(cand.product_component_group_code).get(t) == p_id:
                        pool_members.append({"id": cand.id, "sku_code": cand.sku_code})
                        if len(pool_members) >= 4: break

                results.append({
                    "id": m.id,
                    "product_name": m.product_name,
                    "sku_code": m.sku_code,
                    "pool_id": p_id,
                    "is_existing_pool": True,
                    "is_already_connected": is_connected,
                    "pool_members": pool_members
                })
                seen_pools.add(p_id)
                if len(results) >= 5: break

        # Priority 2: Suggest individual products as potential pool starters
        if len(results) < 5:
            for m in matches:
                if any(r['id'] == m.id for r in results): continue
                m_codes = parse_codes(m.product_component_group_code)
                if get_code(m_codes, t): continue # Already in a pool (likely handled in Priority 1)

                results.append({
                    "id": m.id,
                    "product_name": m.product_name,
                    "sku_code": m.sku_code,
                    "pool_id": "NEW_POOL", # Placeholder for UI
                    "is_existing_pool": False
                })
                if len(results) >= 5: break

        discovery[comp_type] = results

    return discovery

@app.post("/api/skus/bulk-import")
def bulk_import_skus(data: schemas.BulkImportRequest, db: Session = Depends(get_db)):
    from sqlalchemy import func
    import logging

    # Set up dedicated import logger
    logger = logging.getLogger("bulk_import")
    if not logger.handlers:
        sh = logging.StreamHandler()
        sh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(sh)
        logger.setLevel(logging.INFO)

    logger.info(f"Bulk Import: Starting for {len(data.skus)} rows")

    def safe_label(val):
        if val is None: return ""
        return str(val).strip()

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

        # 2. Batch resolve existing references
        ref_map = {} # (type, label_lower) -> {"id": id, "label": label}
        for ref_type, labels in unique_refs.items():
            if not labels: continue
            existing = db.query(models.ReferenceData).filter(
                models.ReferenceData.reference_data_type == ref_type,
                func.lower(models.ReferenceData.label).in_([l.lower() for l in labels]),
                models.ReferenceData.deleted_at == None
            ).all()
            for r in existing:
                ref_map[(ref_type, r.label.lower())] = {"id": r.id, "label": r.label}

        # 3. Create missing references (Auto-create logic)
        for ref_type, labels in unique_refs.items():
            for l in labels:
                if not l: continue
                clean_l = l.strip()
                if (ref_type, clean_l.lower()) not in ref_map:
                    slug = re.sub(r'[^a-z0-9]+', '_', clean_l.lower()).strip('_')
                    unique_suffix = uuid.uuid4().hex[:6]
                    new_key = f"{ref_type.lower()}_{slug}_{unique_suffix}"

                    try:
                        # Use nested transaction for each reference to avoid killing the main session
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
                        logger.warning(f"Failed to auto-create reference {ref_type}:{clean_l}: {e}")
                        # Already rolled back by begin_nested()
                        existing_after_fail = db.query(models.ReferenceData).filter(
                            models.ReferenceData.reference_data_type == ref_type,
                            func.lower(models.ReferenceData.label) == clean_l.lower(),
                            models.ReferenceData.deleted_at == None
                        ).first()
                        if existing_after_fail:
                            ref_map[(ref_type, clean_l.lower())] = {"id": existing_after_fail.id, "label": existing_after_fail.label}

        # 4. Batch resolve existing SKUs by sku_code
        incoming_sku_codes = [s.sku_code for s in data.skus if s.sku_code]
        existing_skus = db.query(models.SkuMaster).filter(
            models.SkuMaster.sku_code.in_(incoming_sku_codes),
            models.SkuMaster.deleted_at == None
        ).all()

        sku_id_map = {s.sku_code: s for s in existing_skus}

        # 5. Process Import
        success_count = 0
        failed_count = 0
        errors = []

        for s_data in data.skus:
            if not s_data.sku_code:
                failed_count += 1
                errors.append({"sku_code": "UNKNOWN", "error": "Missing SKU Code"})
                continue

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
                        # For new SKUs, ensure product_name is present
                        if not payload.get("product_name"):
                            payload["product_name"] = s_data.sku_code
                        new_sku = models.SkuMaster(**payload)
                        db.add(new_sku)
                        sku_id_map[s_data.sku_code] = new_sku

                    db.flush()
                success_count += 1
            except Exception as e:
                failed_count += 1
                err_msg = str(e)
                logger.warning(f"SKU {s_data.sku_code} failed: {err_msg}")
                errors.append({"sku_code": s_data.sku_code, "error": err_msg})

        db.commit()
        return {
            "message": f"Processed {len(data.skus)} items",
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors
        }

    except Exception as e:
        print(f"DEBUG: Critical Error: {e}")
        db.rollback()
        logger.error(f"Bulk Import CRITICAL ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Bulk Import Logic Error: {str(e)}")


# --- Sales Order Import ---
@app.post("/api/sales/bulk-import")
def bulk_import_sales(data: schemas.BulkSalesImportRequest, db: Session = Depends(get_db)):
    import logging

    logger = logging.getLogger("sales_import")
    if not logger.handlers:
        sh = logging.StreamHandler()
        sh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(sh)
        logger.setLevel(logging.INFO)

    logger.info(f"Sales Bulk Import: Starting for {len(data.orders)} rows")

    def safe_label(val):
        if val is None: return ""
        return str(val).strip()

    try:
        # 1. Resolve Platforms (Auto-create)
        unique_platforms = set(safe_label(o.platform_label) for o in data.orders if o.platform_label)
        platform_map = {}
        if unique_platforms:
            existing = db.query(models.ReferenceData).filter(
                models.ReferenceData.reference_data_type == "ECOMMERCE_CHANNEL",
                func.lower(models.ReferenceData.label).in_([l.lower() for l in unique_platforms]),
                models.ReferenceData.deleted_at == None
            ).all()
            for r in existing:
                platform_map[r.label.lower()] = r.id

            for l in unique_platforms:
                if l.lower() not in platform_map:
                    slug = re.sub(r'[^a-z0-9]+', '_', l.lower()).strip('_')
                    new_ref = models.ReferenceData(
                        reference_data_type="ECOMMERCE_CHANNEL",
                        label=l,
                        key=f"platform_{slug}_{uuid.uuid4().hex[:6]}",
                        is_active=True
                    )
                    db.add(new_ref)
                    db.flush()
                    platform_map[l.lower()] = new_ref.id

        # 2. Resolve SKUs
        unique_sku_codes = set(safe_label(o.sku_code) for o in data.orders if o.sku_code)
        unique_barcodes = set(safe_label(o.barcode) for o in data.orders if o.barcode)

        sku_map = {} # code -> id
        if unique_sku_codes or unique_barcodes:
            skus = db.query(models.SkuMaster).filter(
                (models.SkuMaster.sku_code.in_(list(unique_sku_codes))) |
                (models.SkuMaster.barcode.in_(list(unique_barcodes))),
                models.SkuMaster.deleted_at == None
            ).all()
            for s in skus:
                if s.sku_code: sku_map[s.sku_code] = s.id
                if s.barcode: sku_map[s.barcode] = s.id

        # 3. Process Import
        success_count = 0
        failed_count = 0
        errors = []

        for o_data in data.orders:
            try:
                with db.begin_nested():
                    payload = o_data.model_dump(exclude_unset=True)

                    # Resolve IDs
                    plt_id = platform_map.get(safe_label(o_data.platform_label).lower())
                    sku_id = sku_map.get(safe_label(o_data.sku_code or o_data.barcode))

                    if not plt_id:
                        raise ValueError(f"Platform '{o_data.platform_label}' resolution failed")
                    if not sku_id:
                        raise ValueError(f"SKU '{o_data.sku_code or o_data.barcode}' resolution failed")

                    payload["ecommerce_channel_reference_id"] = plt_id
                    payload["sku_master_id"] = sku_id

                    # Defaults
                    if payload.get("quantity") is None: payload["quantity"] = 1
                    if not payload.get("order_type"): payload["order_type"] = "ORDER"

                    # Cleanup labels
                    for k in ["platform_label", "sku_code", "barcode"]:
                        if k in payload: del payload[k]

                    # Deduplication (Platform + Ext Order ID + SKU Master ID)
                    ext_order_id = payload.get("external_order_id")

                    existing_order = db.query(models.SalesOrder).filter(
                        models.SalesOrder.ecommerce_channel_reference_id == plt_id,
                        models.SalesOrder.external_order_id == ext_order_id,
                        models.SalesOrder.sku_master_id == sku_id
                    ).first()

                    if existing_order:
                        # Update existing
                        for k, v in payload.items():
                            setattr(existing_order, k, v)
                    else:
                        # Create new
                        new_order = models.SalesOrder(**payload)
                        db.add(new_order)

                    db.flush()
                success_count += 1
            except Exception as e:
                failed_count += 1
                err_msg = str(e)
                logger.warning(f"Order {o_data.external_order_id} failed: {err_msg}")
                errors.append({"external_order_id": o_data.external_order_id or "UNKNOWN", "error": err_msg})

        db.commit()
        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Sales Bulk Import CRITICAL ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Sales Bulk Import Logic Error: {str(e)}")

@app.get("/api/sales", response_model=List[schemas.SalesOrder])
def get_sales_orders(db: Session = Depends(get_db)):
    return db.query(models.SalesOrder).order_by(models.SalesOrder.order_date.desc()).all()


# ==========================================
# JSON ARRAY HANDLER (Dynamic Tagging)
# ==========================================

@app.patch("/api/skus/{id}/platforms", response_model=schemas.SkuMaster)
def patch_sku_platforms(id: int, patch_data: schemas.PlatformPatch, db: Session = Depends(get_db)):
    db_item = db.query(models.SkuMaster).filter(models.SkuMaster.id == id, models.SkuMaster.deleted_at == None).first()
    if not db_item: raise HTTPException(404, "Not Found")

    current_arr = db_item.live_platform_reference_id or []
    if type(current_arr) != list: current_arr = []

    if patch_data.action == "add":
        if patch_data.reference_id not in current_arr:
            current_arr.append(patch_data.reference_id)
    elif patch_data.action == "remove":
        if patch_data.reference_id in current_arr:
            current_arr.remove(patch_data.reference_id)

    db_item.live_platform_reference_id = current_arr
    flag_modified(db_item, "live_platform_reference_id")

    db.commit()
    db.refresh(db_item)
    return db_item


# ==========================================
# GOOGLE DRIVE INTEGRATION
# ==========================================

def _generate_drive_url(brand_id: int, cat_id: int, subcat_id: int, sku_code: str, db: Session):
    def get_label(ref_id):
        if not ref_id: return None
        ref = db.query(models.ReferenceData).filter(models.ReferenceData.id == ref_id).first()
        return ref.label if ref else None

    brand_label = get_label(brand_id)
    cat_label = get_label(cat_id)
    subcat_label = get_label(subcat_id)

    drive = DriveService()
    if not drive.service:
        raise HTTPException(status_code=500, detail=f"Google Drive Error: {drive.last_error or 'Credentials not configured in backend.'}")

    return drive.create_sku_folder_structure(
        brand=brand_label,
        category=cat_label,
        sub_category=subcat_label,
        sku_code=sku_code
    )

@app.post("/api/skus/generate-catalog-url")
def generate_sku_catalog_url_preview(data: schemas.DriveFolderCreate, db: Session = Depends(get_db)):
    # 1. Validation
    if not data.brand_name.strip():
        raise HTTPException(status_code=400, detail="Brand name is required for catalog generation.")
    if not data.category_name.strip():
        raise HTTPException(status_code=400, detail="Category name is required for catalog generation.")
    if not data.sku_code.strip():
        raise HTTPException(status_code=400, detail="SKU Code is required for catalog generation.")

    try:
        drive = DriveService()
        if not drive.service:
            raise HTTPException(status_code=500, detail=f"Google Drive Error: {drive.last_error or 'Credentials not configured in backend.'}")

        url = drive.create_sku_folder_structure(
            brand=data.brand_name.strip(),
            category=data.category_name.strip(),
            sub_category=data.sub_category_name.strip() if data.sub_category_name else "general",
            sku_code=data.sku_code.strip()
        )
        return {"catalog_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Drive Error: {str(e)}")

class DriveImageRequest(BaseModel):
    folder_url: str

@app.post("/api/skus/get-first-drive-image")
def get_first_drive_image(data: DriveImageRequest):
    if not data.folder_url or not data.folder_url.strip():
        raise HTTPException(status_code=400, detail="Folder URL is required")
        
    try:
        drive = DriveService()
        if not drive.service:
            raise HTTPException(status_code=500, detail="Drive service not initialized")
            
        file_id = drive.get_first_image_in_folder(data.folder_url)
        if not file_id:
            return {"file_id": None, "image_url": None}
            
        return {
            "file_id": file_id,
            "image_url": f"https://drive.google.com/thumbnail?id={file_id}&sz=w1000"
        }
    except Exception as e:
        logger.error(f"Error in get_first_drive_image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/skus/{id}/generate-catalog-url", response_model=schemas.SkuMaster)
def generate_sku_catalog_url_saved(id: int, db: Session = Depends(get_db)):
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id, models.SkuMaster.deleted_at == None).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    try:
        folder_url = _generate_drive_url(
            sku.brand_reference_id,
            sku.category_reference_id,
            sku.sub_category_reference_id,
            sku.sku_code,
            db
        )

        sku.catalog_url = folder_url
        db.commit()
        db.refresh(sku)
        return sku
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Drive Error: {str(e)}")
@app.post("/api/skus/{id}/trash-catalog-folder", response_model=schemas.SkuMaster)
def trash_sku_catalog_folder(id: int, db: Session = Depends(get_db)):
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    if sku.catalog_url:
        drive_service = DriveService()
        drive_service.trash_folder(sku.catalog_url)

        sku.catalog_url = None
        db.commit()
        db.refresh(sku)

    return sku
@app.post("/api/skus/export-images")
async def export_sku_images(data: schemas.ImageExportRequest, db: Session = Depends(get_db)):
    drive = DriveService()
    if not drive.service:
        raise HTTPException(status_code=500, detail=f"Google Drive Error: {drive.last_error or 'Drive service not initialized'}")

    def get_label(ref_id):
        if not ref_id: return "Unknown"
        ref = db.query(models.ReferenceData).filter(models.ReferenceData.id == ref_id).first()
        return ref.label if ref else "Unknown"

    print(f"Export Images: Starting for {len(data.sku_ids)} SKUs")

    # Memory buffer for ZIP
    zip_buffer = io.BytesIO()
    total_files_added = 0

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED, False) as zip_file:
        for sku_id in data.sku_ids:
            sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == sku_id).first()
            if not sku:
                print(f"Export: SKU ID {sku_id} not found")
                continue
            if not sku.catalog_url:
                print(f"Export: SKU {sku.sku_code} has no catalog_url")
                continue

            folder_id = drive.get_id_from_url(sku.catalog_url)
            if not folder_id:
                print(f"Export: Invalid folder URL for SKU {sku.sku_code}")
                continue

            # Fetch file list
            files = drive.list_files_in_folder(folder_id)
            if not files:
                print(f"Export: No files found in Drive folder for SKU {sku.sku_code}")
                continue

            # Context for template resolution
            context = {
                "sku_code": sku.sku_code or "no_sku",
                "barcode": sku.barcode or "no_barcode",
                "brand": get_label(sku.brand_reference_id),
                "category": get_label(sku.category_reference_id),
                "sub_category": get_label(sku.sub_category_reference_id),
                "product_name": sku.product_name or "no_name"
            }

            def resolve_template(tmpl, ctx, idx=0):
                res = tmpl
                for k, v in ctx.items():
                    res = res.replace("{{ " + k + " }}", str(v)).replace("{{" + k + "}}", str(v))
                res = res.replace("{{ index }}", str(idx)).replace("{{index}}", str(idx))
                # Sanitize path segments, filter out empty parts
                segments = [drive.sanitize_name(p) for p in res.split("/") if p.strip()]
                return "/".join(segments)

            # Process files
            print(f"Export: Processing {len(files)} files for SKU {sku.sku_code}")
            for idx, f in enumerate(files, 1):
                content = drive.get_file_content(f['id'])
                if not content:
                    continue

                # Determine target path
                if data.flatten_hierarchy:
                    folder_path = drive.sanitize_name(sku.sku_code or str(sku_id))
                else:
                    folder_path = resolve_template(data.folder_template, context)

                # Determine filename
                file_ext = f['name'].split('.')[-1] if '.' in f['name'] else 'bin'
                filename = resolve_template(data.file_template, context, idx)
                if not filename.endswith(f".{file_ext}"):
                    filename = f"{filename}.{file_ext}"

                # Ensure path is valid and relative (not absolute)
                full_path = "/".join(p for p in f"{folder_path}/{filename}".split("/") if p)

                zip_file.writestr(full_path, content)
                total_files_added += 1

    print(f"Export: ZIP complete. Total files added: {total_files_added}")

    if total_files_added == 0:
        raise HTTPException(
            status_code=404,
            detail="No images found for the selected products to export. Ensure catalog URLs are correct and folders contain files."
        )

    # Prepare response using a generator for stable streaming of binary data
    def iter_buffer():
        zip_buffer.seek(0)
        while chunk := zip_buffer.read(8192):
            yield chunk

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        iter_buffer(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="Bloomerce_Images_{timestamp}.zip"'}
    )
