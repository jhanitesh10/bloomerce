import os
import json
import asyncio
import logging
import re
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field
import litellm

# Setup logging
logger = logging.getLogger("ai_service")
logger.setLevel(logging.INFO)

import base64
import mimetypes

# --- Structured Output Models ---

from pydantic import BaseModel, Field, model_validator

class SmartField(BaseModel):
    value: Any
    confidence_score: Optional[int] = 100 # 0-100
    confidence_level: Optional[str] = "high" # low, medium, high
    basis: Optional[str] = "extracted" # extracted, inferred, market_estimate, user_input, web_research
    warning: Optional[str] = None

class SkuContentResponse(BaseModel):
    @model_validator(mode='before')
    @classmethod
    def wrap_raw_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
            
        # Field mapping bridge for backward compatibility or prompt variations
        mapping = {
            "product_name": "primary_title",
            "alternate_product_name": "alt_title",
            "colour": "colour_shade",
            "color": "colour_shade",
            "key_feature": "key_features",
            "ingredients": "full_ingredients",
            "product_care": "care_instructions",
            "caution": "cautions",
            "tax_rule_code": "hsn_code",
            "mrp": "mrp_est",
            "selling_price": "selling_price_est",
            "purchase_cost": "purchase_cost_est",
            "net_quantity_unit": "quantity_unit",
            "raw_product_weight_g": "raw_weight_g",
            "sku_id": "sku_code",
            "barcode": "barcode"
        }
        
        # Apply mapping
        for old_key, new_key in mapping.items():
            if old_key in data and new_key not in data:
                data[new_key] = data.pop(old_key)

        for key, val in data.items():
            if val is not None:
                # If it's a string that looks like a JSON object/list, try to parse it
                if isinstance(val, str) and val.strip().startswith(('{', '[')):
                    try:
                        fixed_val = val.replace("'", '"')
                        val = json.loads(fixed_val)
                    except:
                        pass

                if not isinstance(val, dict):
                    # Auto-wrap raw value into SmartField structure
                    data[key] = {
                        "value": val,
                        "confidence_score": 60, # Lowered default to indicate fallback
                        "confidence_level": "medium",
                        "basis": "inferred"
                    }
                else:
                    data[key] = val
        return data

    primary_title: Optional[SmartField] = Field(None, description="Primary optimized product name")
    alt_title: Optional[SmartField] = Field(None, description="Secondary brand-aligned product name")
    colour_shade: Optional[SmartField] = Field(None, description="Colour or Shade")
    category: Optional[SmartField] = Field(None, description="Best-fit category")
    sub_category: Optional[SmartField] = Field(None, description="Best-fit sub-category")
    description: Optional[SmartField] = Field(None, description="Marketing description")
    key_features: Optional[SmartField] = Field(None, description="Top 5-6 features")
    key_ingredients: Optional[SmartField] = Field(None, description="Primary highlighting ingredients")
    full_ingredients: Optional[SmartField] = Field(None, description="Full INCI ingredient list")
    how_to_use: Optional[SmartField] = Field(None, description="Usage instructions")
    care_instructions: Optional[SmartField] = Field(None, description="Storage or care warnings")
    cautions: Optional[SmartField] = Field(None, description="Safety warnings")
    hsn_code: Optional[SmartField] = Field(None, description="Suggested HSN code")
    tax_percent: Optional[SmartField] = Field(None, description="Suggested Tax %")
    mrp_est: Optional[SmartField] = Field(None, description="Suggested MRP / Listing Price")
    selling_price_est: Optional[SmartField] = Field(None, description="Suggested Selling Price")
    seo_keywords: Optional[SmartField] = Field(None, description="SEO keywords")
    purchase_cost_est: Optional[SmartField] = Field(None, description="Estimated purchase cost")
    net_quantity: Optional[SmartField] = Field(None, description="Net quantity value")
    quantity_unit: Optional[SmartField] = Field(None, description="Unit for net quantity")
    raw_weight_g: Optional[SmartField] = Field(None, description="Raw product weight")
    package_weight_g: Optional[SmartField] = Field(None, description="Package weight")
    brand: Optional[SmartField] = Field(None, description="Identified brand")
    sku_code: Optional[SmartField] = Field(None, description="Generated SKU code")
    barcode: Optional[SmartField] = Field(None, description="Generated Barcode")

# --- Provider Interface ---

class BaseAIProvider(ABC):
    @abstractmethod
    async def generate_sku_content(
        self,
        product_name: str,
        brand: str,
        category: str,
        image_url: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        reference_urls: Optional[List[str]] = None,
        existing_data: Optional[Dict[str, Any]] = None,
        target_fields: Optional[List[str]] = None,
        custom_instruction: Optional[str] = None,
        valid_categories: Optional[List[str]] = None,
        valid_sub_categories: Optional[List[str]] = None,
        chips: Optional[List[str]] = None
    ) -> SkuContentResponse:
        pass

    @abstractmethod
    async def generate_generic_content(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        response_model: Optional[Any] = None
    ) -> Union[str, Dict[str, Any]]:
        pass

# --- LiteLLM Implementation ---

class LiteLLMProvider(BaseAIProvider):
    def __init__(self, model: str, api_key: Optional[str] = None, api_base: Optional[str] = None):
        self.model = model
        self.api_base = api_base
        self.api_key = api_key

        # Configure litellm if needed
        os.environ["LITELLM_LOG"] = "DEBUG"
        if api_key:
            if "gemini" in model.lower():
                os.environ["GEMINI_API_KEY"] = api_key
            elif "gpt" in model.lower() or model.startswith("openai/"):
                os.environ["OPENAI_API_KEY"] = api_key

        # Detect if we should force OpenAI protocol for local/custom endpoints
        self.custom_provider = None
        if api_base and ("127.0.0.1" in api_base or "localhost" in api_base):
            self.custom_provider = "openai"

        # Rotation setup for 'auto-free'
        self.free_models = [
            "google/gemini-2.0-flash-lite-001",
            "meta-llama/llama-3.1-8b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "google/gemini-1.5-flash"
        ]
        self.current_free_idx = 0

        # litellm will use the api_base if provided for local/custom endpoints
        self.common_config = {
            "model": self.model,
            "api_base": self.api_base,
            "api_key": self.api_key,
            "custom_llm_provider": self.custom_provider
        }

    def _get_model_for_attempt(self, attempt: int) -> str:
        if "auto-free" in self.model:
            # Rotate models on each retry attempt
            idx = (self.current_free_idx + attempt) % len(self.free_models)
            selected = self.free_models[idx]

            # If api_base is OpenRouter, we might not need the 'openrouter/' prefix
            # if we are already hitting the openrouter endpoint.
            # But litellm often expects the provider prefix to know how to map.
            if self.model.startswith("openrouter/") and not selected.startswith("openrouter/"):
                return f"openrouter/{selected}"
            return selected
        return self.model

    def _extract_urls(self, text: str) -> List[str]:
        return re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)

    def _handle_local_image(self, url: str) -> str:
        """Converts localhost upload URLs to base64 data URLs for AI processing."""
        if not url: return url
        if "localhost" in url or "127.0.0.1" in url:
            try:
                # Extract filename: http://localhost:8000/uploads/uuid.png -> uuid.png
                filename = url.split('/')[-1]
                # Try to find it in the uploads directory relative to this file's parent (backend/)
                base_dir = os.path.dirname(os.path.abspath(__file__))
                path = os.path.join(base_dir, "uploads", filename)

                if os.path.exists(path):
                    mime_type, _ = mimetypes.guess_type(path)
                    with open(path, "rb") as f:
                        encoded = base64.b64encode(f.read()).decode('utf-8')
                        return f"data:{mime_type or 'image/png'};base64,{encoded}"
                logger.warning(f"Local file not found for URL: {url} at {path}")
            except Exception as e:
                logger.error(f"Failed to convert local image {url}: {e}")
        return url

    def _load_styles(self) -> Dict[str, str]:
        """Loads style mappings from styles.json."""
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            path = os.path.join(base_dir, "prompts", "styles.json")
            if os.path.exists(path):
                with open(path, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading styles: {e}")
        return {}

    def _load_prompt_template(self, filename: str) -> str:
        """Loads a prompt template from the prompts directory."""
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            path = os.path.join(base_dir, "prompts", filename)
            if os.path.exists(path):
                with open(path, "r") as f:
                    return f.read()
            logger.warning(f"Prompt template not found at {path}")
        except Exception as e:
            logger.error(f"Error loading prompt template {filename}: {e}")
        return ""

    async def generate_sku_content(self, product_name, brand, category, image_url=None, image_urls=None, reference_urls=None, existing_data=None, target_fields=None, custom_instruction=None, valid_categories=None, valid_sub_categories=None, chips=None):
        # Intelligent URL Extraction from the instruction message
        auto_urls = self._extract_urls(custom_instruction) if custom_instruction else []
        active_ref_urls = list(set((reference_urls or []) + auto_urls))

        # 1. Process Images first (to get accurate count for prompt)
        active_urls = []
        if image_url:
            local_processed = self._handle_local_image(image_url)
            if not ("localhost" in local_processed or "127.0.0.1" in local_processed):
                active_urls.append(local_processed)

        if image_urls:
            for u in image_urls:
                local_processed = self._handle_local_image(u)
                if not ("localhost" in local_processed or "127.0.0.1" in local_processed):
                    active_urls.append(local_processed)

        # 2. Load consolidated prompts
        system_content = self._load_prompt_template("sku_system.md")
        user_template = self._load_prompt_template("sku_user.md")

        # 3. Determine Tone from chips
        styles = self._load_styles()
        tone = "Professional & Balanced"
        if chips:
            for chip in chips:
                clean_chip = re.sub(r'[^\w\s-]', '', chip).strip()
                if clean_chip in styles:
                    tone = clean_chip
                    break

        # 4. Format image context for the text prompt
        image_count = len(active_urls)
        image_inputs = f"{image_count} product image(s) attached to this request" if image_count > 0 else "No images provided"

        # 5. Build user prompt
        try:
            prompt = self._build_prompt(user_template, product_name, brand, category, active_ref_urls, existing_data, target_fields, custom_instruction, valid_categories, valid_sub_categories, chips, tone, image_inputs)
            if prompt.startswith("Error formatting prompt:"):
                raise Exception(prompt)
            logger.info(f"Constructed Prompt (length: {len(prompt)})")
        except Exception as pe:
            logger.error(f"Prompt building failed: {pe}")
            raise Exception(f"AI failed during prompt construction: {pe}")

        messages = [
            {
                "role": "system",
                "content": system_content or "You are an AI assistant helping with product cataloging."
            },
            {"role": "user", "content": prompt}
        ]

        # For certain local models, merging system and user roles can prevent circular reference errors in some proxy layers
        if self.custom_provider == "openai" and "gpt" not in self.model.lower():
            merged_content = f"SYSTEM INSTRUCTIONS:\n{messages[0]['content']}\n\nUSER REQUEST:\n{messages[1]['content']}"
            messages = [{"role": "user", "content": merged_content}]

        if active_urls:
            # LiteLLM handles multi-modal messages for compatible models
            content_list = [{"type": "text", "text": messages[-1]["content"]}]
            for url in active_urls:
                content_list.append({"type": "image_url", "image_url": {"url": url}})
            messages[-1]["content"] = content_list

        max_retries = 5
        retry_delay = 10

        for attempt in range(max_retries):
            current_model = self._get_model_for_attempt(attempt)
            try:
                # Optimized LiteLLM Call
                completion_kwargs = {
                    "model": current_model,
                    "api_base": self.api_base,
                    "api_key": self.api_key or "not-needed",
                    "messages": messages,
                    "timeout": 120
                }

                if self.custom_provider:
                    completion_kwargs["custom_llm_provider"] = self.custom_provider

                # Only add JSON format if it's a known compatible provider
                if self.custom_provider == "openai" or ("gpt" in self.model.lower()):
                     completion_kwargs["response_format"] = {"type": "json_object"}

                # Log the messages for debugging
                logger.info(f"AI Request Model: {current_model}")
                logger.info(f"AI Request Messages: {json.dumps(messages, indent=2)}")

                try:
                    response = await litellm.acompletion(**completion_kwargs)
                except Exception as e:
                    logger.warning(f"LiteLLM attempt {attempt+1} failed: {e}")
                    if attempt == max_retries - 1:
                        raise e

                    # Fallback: Minimal parameters
                    logger.info("Retrying with minimal parameters...")
                    response = await litellm.acompletion(
                        model=current_model,
                        api_base=self.api_base,
                        api_key=self.api_key or "not-needed",
                        messages=messages,
                        custom_llm_provider=self.custom_provider
                    )

                content = response.choices[0].message.content
                logger.info(f"AI Raw Content Received (Attempt {attempt+1}):\n{content}")
                data = self._extract_json(content)
                
                try:
                    return SkuContentResponse(**data)
                except Exception as ve:
                    logger.error(f"Validation Error for AI output: {ve}")
                    logger.debug(f"Raw data that failed validation: {json.dumps(data, indent=2)}")
                    if attempt == max_retries - 1:
                        # On final attempt, if it's just validation failing, try to return a partially valid object
                        # instead of crashing completely, or re-raise with detail
                        raise Exception(f"AI failed to return schema-compliant data: {ve}")
                    continue # Retry if validation fails and we have attempts left

            except Exception as e:
                error_msg = str(e)
                # Rotate model on BadRequest (400) or NotFound (404) or RateLimit
                if ("400" in error_msg or "404" in error_msg or "rate limit" in error_msg.lower() or "Engine is not loaded" in error_msg) and attempt < max_retries - 1:
                    logger.info(f"AI Provider error ({error_msg[:100]}), rotating model and retrying in {retry_delay}s... (Attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(retry_delay)
                    continue
                
                if "AI failed" in error_msg:
                    raise e # Pass through our custom error messages

                logger.error(f"LiteLLM Final Generation Error: {error_msg}")
                raise Exception(f"Internal AI Error: {error_msg}")

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extracts JSON from text, handling markdown code blocks and normalizing list fields."""
        logger.info(f"Extracting JSON from AI response (length: {len(text)})")

        # Clean up common markdown/text noise before parsing
        text = text.strip()

        try:
            # Try parsing directly first
            data = json.loads(text)
        except json.JSONDecodeError:
            logger.debug("Direct JSON parse failed, searching for JSON blocks")
            # Hunt for json block
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
            if not match:
                match = re.search(r'(\{.*\})', text, re.DOTALL)

            if match:
                json_str = match.group(1).strip()
                try:
                    data = json.loads(json_str)
                except json.JSONDecodeError as e:
                    # Final attempt: try to fix common small JSON errors if it's a block
                    logger.warning(f"Failed to parse cleaned JSON block: {e}. Attempting recovery...")
                    try:
                        # Remove trailing commas before closing braces/brackets
                        json_str = re.sub(r',\s*([\}\]])', r'\1', json_str)
                        data = json.loads(json_str)
                    except Exception as recovery_e:
                        logger.error(f"JSON Recovery failed: {recovery_e}")
                        raise Exception("AI failed to return valid JSON content even after recovery attempt")
            else:
                logger.error(f"Could not extract JSON from response: {text[:200]}...")
                raise Exception("AI response did not contain a valid JSON object")

        # Normalize fields: if a field expected to be a string is a list, join it
        string_fields = ['product_name', 'brand', 'color', 'key_feature', 'key_ingredients', 'ingredients', 'how_to_use', 'product_care', 'caution', 'seo_keywords']
        for field in string_fields:
            if field in data and isinstance(data[field], list):
                logger.info(f"Normalizing list field '{field}' to string")
                data[field] = "\n".join([str(i) for i in data[field]]) if field != 'seo_keywords' else ", ".join([str(i) for i in data[field]])

        # Clean up tax_percent
        if 'tax_percent' in data and data['tax_percent']:
            try:
                # Remove '%' and other non-numeric chars except '.'
                clean_val = re.sub(r'[^\d.]', '', str(data['tax_percent']))
                data['tax_percent'] = float(clean_val) if clean_val else 0.0
            except:
                data['tax_percent'] = 0.0

        # Clean up tax_rule_code / hsn_code
        for k in ['tax_rule_code', 'hsn_code']:
            if k in data and data[k]:
                target = data[k]
                is_metadata = isinstance(target, dict) and 'value' in target
                val = target['value'] if is_metadata else target
                if val:
                    clean_val = str(val).replace(" ", "").strip()
                    if is_metadata: data[k]['value'] = clean_val
                    else: data[k] = clean_val

        # Clean up numeric fields (purchase_cost, weights, etc)
        # Note: We now support string ranges (e.g. "100 - 200") for these fields to maintain consistency with the prompt.
        numeric_fields = ['purchase_cost_est', 'net_quantity', 'raw_weight_g', 'package_weight_g', 'mrp_est', 'selling_price_est']
        for field in numeric_fields:
            if field in data and data[field] is not None:
                target = data[field]
                is_metadata = isinstance(target, dict) and 'value' in target
                val = target['value'] if is_metadata else target
                
                if val is not None:
                    val_str = str(val).strip()
                    # If it's a range (contains '-' or 'to'), keep it as a string
                    if '-' in val_str or ' to ' in val_str.lower():
                         if is_metadata: data[field]['value'] = val_str
                         else: data[field] = val_str
                    else:
                        # Otherwise try to make it a clean float
                        try:
                            clean_val = re.sub(r'[^\d.]', '', val_str)
                            final_val = float(clean_val) if clean_val else 0.0
                            if is_metadata: data[field]['value'] = final_val
                            else: data[field] = final_val
                        except:
                            pass

        return data

    async def generate_generic_content(self, prompt, system_prompt=None, response_model=None):
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            kwargs = {
                "model": self.model,
                "api_base": self.api_base,
                "api_key": self.api_key,
                "custom_llm_provider": self.custom_provider,
                "messages": messages
            }
            if response_model:
                kwargs["response_format"] = {"type": "json_object"}

            response = await litellm.acompletion(**kwargs)
            content = response.choices[0].message.content

            if response_model:
                data = json.loads(content)
                return data
            return content
        except Exception as e:
            logger.error(f"LiteLLM Generic Generation Error: {e}")
            raise

    def _build_prompt(self, template, name, brand, cat, ref_url, existing, fields, instruction, valid_categories=None, valid_sub_categories=None, chips=None, tone="Professional", image_inputs="No images"):
        fields = fields or [
            "primary_title", "alt_title", "colour_shade", "category", "sub_category",
            "description", "key_features", "key_ingredients", "full_ingredients",
            "how_to_use", "care_instructions", "cautions", "purchase_cost_est",
            "net_quantity", "quantity_unit", "raw_weight_g", "package_weight_g",
            "hsn_code", "tax_percent", "mrp_est", "selling_price_est", "seo_keywords",
            "sku_code", "brand", "barcode"
        ]

        # Neutral Schema Template (Matches new Taxonomy)
        schema_template = {
            "primary_title": "", "alt_title": "", "colour_shade": "",
            "category": "", "sub_category": "", "description": "",
            "key_features": "", "key_ingredients": "", "full_ingredients": "",
            "how_to_use": "", "care_instructions": "", "cautions": "",
            "purchase_cost_est": 0.0, "net_quantity": 0.0, "quantity_unit": "",
            "raw_weight_g": 0.0, "package_weight_g": 0.0,
            "hsn_code": "", "tax_percent": 0.0, "mrp_est": 0.0, "selling_price_est": 0.0,
            "seo_keywords": "", "sku_code": "", "brand": "", "barcode": ""
        }

        target_schema = {k: schema_template[k] for k in fields if k in schema_template}

        # Build chips context using style mappings
        styles = self._load_styles()
        chips_context = ""
        if chips:
            style_instructions = []
            for chip in chips:
                # Remove emojis but keep hyphens and spaces
                clean_chip = re.sub(r'[^\w\s-]', '', chip).strip()
                if clean_chip in styles:
                    style_instructions.append(f"- {clean_chip.upper()}: {styles[clean_chip]}")
                else:
                    style_instructions.append(f"- {chip}")

            if style_instructions:
                chips_context = "\nSTYLE & CONTEXT MODIFIERS (Apply these strictly):\n" + "\n".join(style_instructions)

        # Fallback if template loading fails
        if not template:
            # Absolute fallback if file is missing
            template = "Product: {name}, Brand: {brand}. Fields: {target_fields}. Return JSON: {target_schema}"

        try:
            return template.format(
                name=name or "Not provided",
                brand=brand or "Not provided",
                cat=cat or "Not provided",
                ref_urls=", ".join(ref_url) if ref_url else "None",
                image_inputs=image_inputs,
                tone=tone,
                categories_str=", ".join(valid_categories) if valid_categories else cat,
                sub_cats_str=", ".join(valid_sub_categories) if valid_sub_categories else "Relevant sub-category",
                existing_data=json.dumps(existing, indent=2) if existing else "None",
                target_fields=", ".join(fields),
                target_schema_indented=json.dumps(target_schema, indent=4),
                user_context=instruction or "None",
                custom_instruction_block=f"CLIENT SPECIFIC INSTRUCTION/MESSAGE: {instruction}\n{chips_context}" if (instruction or chips_context) else "None"
            )
        except Exception as e:
            logger.error(f"Prompt template formatting error: {e}")
            return f"Error formatting prompt: {str(e)}"

# --- Factory ---

def get_ai_provider() -> Optional[BaseAIProvider]:
    provider_type = os.getenv("AI_PROVIDER", "litellm").lower()
    model = os.getenv("AI_MODEL", "gemini/gemini-1.5-flash")
    api_key = os.getenv("AI_API_KEY")
    api_base = os.getenv("AI_API_BASE") # Useful for local LLMs like Jan

    # Check for specific keys if AI_API_KEY is not set generically
    if not api_key:
        if "gemini" in model.lower():
            api_key = os.getenv("GEMINI_API_KEY")
        elif "gpt" in model.lower():
            api_key = os.getenv("OPENAI_API_KEY")

    return LiteLLMProvider(model=model, api_key=api_key, api_base=api_base)
