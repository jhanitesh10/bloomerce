from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime

class ReferenceData(Base):
    __tablename__ = "reference_data"

    id = Column(Integer, primary_key=True, index=True)
    reference_data_type = Column(String(100), index=True)
    label = Column(String(255))
    key = Column(String(255), unique=True, index=True)
    parent_reference_id = Column(Integer, ForeignKey('reference_data.id'), nullable=True)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    metadata_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

class SkuMaster(Base):
    __tablename__ = "sku_master"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identifiers
    brand_reference_id = Column(Integer, ForeignKey('reference_data.id'), nullable=True)
    category_reference_id = Column(Integer, ForeignKey('reference_data.id'), nullable=True)
    sub_category_reference_id = Column(Integer, ForeignKey('reference_data.id'), nullable=True)
    
    # Implementing as JSON to support arrays if multiple platforms are attached per sku natively.
    live_platform_reference_id = Column(JSON, nullable=True) 
    status_reference_id = Column(Integer, ForeignKey('reference_data.id'), nullable=True)

    # Content
    product_name = Column(String(255), index=True)
    description = Column(Text, nullable=True)
    key_feature = Column(Text, nullable=True)
    caution = Column(Text, nullable=True)
    product_care = Column(Text, nullable=True)
    how_to_use = Column(Text, nullable=True)
    seo_keywords = Column(Text, nullable=True)
    key_ingredients = Column(Text, nullable=True)
    ingredients = Column(Text, nullable=True)
    catalog_url = Column(String(500), nullable=True)
    primary_image_url = Column(String(500), nullable=True)
    sku_code = Column(String(100), unique=True, index=True)
    barcode = Column(String(100), unique=True, index=True)

    # Product Extra
    mrp = Column(Float, nullable=True)
    purchase_cost = Column(Float, nullable=True)
    color = Column(String(100), nullable=True)

    # Size & Weight
    raw_product_size = Column(String(100), nullable=True)
    package_size = Column(String(100), nullable=True)
    package_weight = Column(Float, nullable=True)
    raw_product_weight = Column(Float, nullable=True)
    finished_product_weight = Column(Float, nullable=True)
    net_content_value = Column(Float, nullable=True)
    net_content_unit = Column(String(50), nullable=True)

    # Meta
    metadata_json = Column(JSON, nullable=True)
    remark = Column(Text, nullable=True)
    bundle_type = Column(String(100), nullable=True)
    product_component_group_code = Column(String(100), nullable=True)
    product_type = Column(String(100), nullable=True)
    pack_type = Column(String(100), nullable=True)
    tax_rule_code = Column(String(100), nullable=True)
    tax_percent = Column(Float, nullable=True)

    # Audit
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    created_by_id = Column(Integer, nullable=True)
    udpatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    updated_by_id = Column(Integer, nullable=True)
    deletedAt = Column(DateTime, nullable=True)
    deleted_by_id = Column(Integer, nullable=True)
