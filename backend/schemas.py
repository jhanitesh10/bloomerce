from pydantic import BaseModel, model_validator, field_validator
from typing import Optional, Dict, Any, Union, List
from datetime import datetime

# --- Reference Data Schemas ---
class ReferenceDataBase(BaseModel):
    reference_data_type: str
    label: Optional[str] = None
    key: Optional[str] = None
    parent_reference_id: Optional[int] = None
    description: Optional[str] = None
    display_order: Optional[int] = 0
    is_active: Optional[bool] = True
    metadata_json: Optional[Union[Dict[str, Any], List[Any]]] = None

class ReferenceDataCreate(ReferenceDataBase):
    pass

class ReferenceData(ReferenceDataBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- SKU Master Schemas ---
class PlatformIdentifier(BaseModel):
    id: str
    channel_name: Optional[str] = None
    platform_name: Optional[str] = None # Legacy support
    type: str

    @model_validator(mode='before')
    @classmethod
    def sync_names(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get('channel_name') and data.get('platform_name'):
                data['channel_name'] = data['platform_name']
            if not data.get('channel_name'):
                data['channel_name'] = ""
        return data

class SkuMasterBase(BaseModel):
    brand_reference_id: Optional[int] = None
    category_reference_id: Optional[int] = None
    sub_category_reference_id: Optional[int] = None
    live_platform_reference_id: Optional[Union[Dict[str, Any], List[Any]]] = None
    status_reference_id: Optional[int] = None

    product_name: Optional[str] = None
    description: Optional[str] = None
    key_feature: Optional[str] = None
    caution: Optional[str] = None
    product_care: Optional[str] = None
    how_to_use: Optional[str] = None
    seo_keywords: Optional[str] = None
    key_ingredients: Optional[str] = None
    ingredients: Optional[str] = None
    catalog_url: Optional[str] = None
    primary_image_url: Optional[str] = None
    sku_code: Optional[str] = None
    barcode: Optional[str] = None

    mrp: Optional[float] = None
    purchase_cost: Optional[float] = None
    color: Optional[str] = None

    raw_product_size: Optional[str] = None
    package_size: Optional[str] = None
    package_weight: Optional[float] = None
    raw_product_weight: Optional[float] = None
    net_quantity: Optional[float] = None
    net_quantity_unit_reference_id: Optional[int] = None
    size_reference_id: Optional[int] = None

    metadata_json: Optional[Union[Dict[str, Any], List[Any]]] = None
    remark: Optional[str] = None
    bundle_type: Optional[Union[int, str]] = None
    product_component_group_code: Optional[Union[Dict[str, Any], List[Any], str]] = None
    product_type: Optional[str] = None
    pack_type: Optional[Union[int, str]] = None
    product_component_group_code: Optional[Union[Dict[str, Any], List[Any], str]] = None
    tax_rule_code: Optional[str] = None
    tax_percent: Optional[float] = None
    
    platform_identifiers: Optional[List[PlatformIdentifier]] = None

    @field_validator('platform_identifiers', mode='before')
    @classmethod
    def filter_empty_identifiers(cls, v):
        if not v or not isinstance(v, list):
            return v
        # Skip if both ID and Channel Name are empty
        return [p for p in v if (isinstance(p, dict) and (p.get('id') or p.get('channel_name') or p.get('platform_name'))) or (not isinstance(p, dict) and (p.id or p.channel_name or p.platform_name))]

class SkuMasterCreate(SkuMasterBase):
    pass

class SkuMaster(SkuMasterBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PlatformPatch(BaseModel):
    action: str # "add" or "remove"
    reference_id: int

class DriveFolderCreate(BaseModel):
    brand_name: str
    category_name: str
    sub_category_name: Optional[str] = None
    sku_code: str

class ImageExportRequest(BaseModel):
    sku_ids: List[int]

class SkuImportRow(SkuMasterBase):
    brand_label: Optional[str] = None
    category_label: Optional[str] = None
    sub_category_label: Optional[str] = None
    status_label: Optional[str] = None
    bundle_type_label: Optional[str] = None
    pack_type_label: Optional[str] = None
    net_quantity_unit_label: Optional[str] = None
    size_label: Optional[str] = None
    color_label: Optional[str] = None

class BulkImportRequest(BaseModel):
    skus: List[SkuImportRow]

# --- Sales Order Schemas ---
class SalesOrderBase(BaseModel):
    tenant_id: Optional[str] = None
    platform_reference_id: Optional[int] = None
    channel_reference_id: Optional[int] = None
    sku_master_id: Optional[int] = None
    order_type: Optional[str] = 'ORDER'
    external_order_id: Optional[str] = None
    external_sku: Optional[str] = None
    order_date: Optional[datetime] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = 'INR'
    status: Optional[str] = 'PENDING'
    
    metadata_json: Optional[Union[Dict[str, Any], List[Any]]] = None
    order_journey: Optional[Union[Dict[str, Any], List[Any]]] = None
    remark: Optional[str] = None

    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

class SalesOrderCreate(SalesOrderBase):
    pass

class SalesOrder(SalesOrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    deleted_by_id: Optional[int] = None

    class Config:
        from_attributes = True

class SalesImportRow(SalesOrderBase):
    platform_label: Optional[str] = None
    channel_label: Optional[str] = None
    sku_code: Optional[str] = None
    barcode: Optional[str] = None

class BulkSalesImportRequest(BaseModel):
    orders: List[SalesImportRow]
