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

class SkuContentResponse(BaseModel):
    product_name: Optional[str] = Field(None, description="Primary optimized product name (e.g. for Nykaa)")
    brand: Optional[str] = Field(None, description="Identified or suggested brand name")
    alternate_product_name: Optional[str] = Field(None, description="Secondary/Alternative brand-aligned product name")
    category: Optional[str] = Field(None, description="Best-fit category from the provided list")
    sub_category: Optional[str] = Field(None, description="Best-fit sub-category from the provided list")
    description: Optional[str] = Field(None, description="Concise, engaging marketing description")
    key_feature: Optional[str] = Field(None, description="Top 5-6 features in 'Heading: Description' format")
    key_ingredients: Optional[str] = Field(None, description="Primary highlighting ingredients")
    ingredients: Optional[str] = Field(None, description="Full INCI ingredient list")
    how_to_use: Optional[str] = Field(None, description="Clear usage instructions")
    product_care: Optional[str] = Field(None, description="Storage or care warnings")
    caution: Optional[str] = Field(None, description="Safety warnings and cautions")
    tax_rule_code: Optional[str] = Field(None, description="Suggested 4-digit HSN code (e.g. 3304)")
    tax_percent: Optional[float] = Field(None, description="Suggested Tax % (e.g. 18.0)")
    seo_keywords: Optional[str] = Field(None, description="Comma-separated SEO keywords")
    color: Optional[str] = Field(None, description="Color or Shade of the product identified from image or text")

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
        valid_sub_categories: Optional[List[str]] = None
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

    async def generate_sku_content(self, product_name, brand, category, image_url=None, image_urls=None, reference_urls=None, existing_data=None, target_fields=None, custom_instruction=None, valid_categories=None, valid_sub_categories=None):
        # Intelligent URL Extraction from the instruction message
        auto_urls = self._extract_urls(custom_instruction) if custom_instruction else []
        active_ref_urls = list(set((reference_urls or []) + auto_urls))

        prompt = self._build_prompt(product_name, brand, category, active_ref_urls, existing_data, target_fields, custom_instruction, valid_categories, valid_sub_categories)

        # Enhanced Knowledge Base for Indian E-commerce
        hsn_knowledge = """
        TAXONOMY & HSN GUIDE (India):
        - Skincare preparations (pre-makeup, sunscreen, face wash): HSN 3304, GST 18%
        - Hair care (shampoo, oil, conditioner): HSN 3305, GST 18%
        - Oral hygiene: HSN 3306, GST 12% or 18%
        - Personal toilet preparations (bath, deodorant): HSN 3307, GST 18%
        - Beauty/Makeup: HSN 3304, GST 18%
        """

        few_shot_example = """
        EXAMPLE INPUT:
        Product: [Product Name], Brand: [Brand Name]
        Target Fields: product_name, description, tax_rule_code, tax_percent

        EXAMPLE OUTPUT (JSON):
        {
          "product_name": "[Brand Name] [Product Name] [Hero Benefit]",
          "description": "[A high-conversion, benefit-first description synthesizing all provided inputs...]",
          "tax_rule_code": "3304",
          "tax_percent": 18.0
        }
        """

        messages = [
            {
                "role": "system",
                "content": (
                    "ROLE:\n"
                    "You are a Senior E-commerce Catalog Specialist for premium Indian marketplaces like Nykaa and Myntra. "
                    "Your goal is to transform basic product facts and reference data into high-conversion, searchable, and luxury listings.\n\n"

                    "STRICT INSTRUCTIONS:\n"
                    "- TONE: High-end, persuasive, results-oriented, yet factually accurate.\n"
                    "- ACTUAL CONTENT ONLY: Do not echo placeholders or instructions back as data. Write real product copy.\n"
                    "- INFERENCE: If Product Name, Brand, or Category are 'Not provided', analyze the attached Images and Reference URLs to identify the product and brand. Use your internal knowledge of global and Indian brands to be accurate.\n"
                    "- ACCURACY: Synthesize information from the provided Reference URLs and Images.\n"
                    "- FORMAT: Return ONLY a valid JSON object. No markdown, no pre-amble.\n\n"

                    f"{hsn_knowledge}\n\n"
                    f"QUALITY REFERENCE:\n{few_shot_example}"
                )
            },
            {"role": "user", "content": prompt}
        ]

        # For certain local models, merging system and user roles can prevent circular reference errors in some proxy layers
        if self.custom_provider == "openai" and "gpt" not in self.model.lower():
            merged_content = f"SYSTEM INSTRUCTIONS:\n{messages[0]['content']}\n\nUSER REQUEST:\n{messages[1]['content']}"
            messages = [{"role": "user", "content": merged_content}]

        active_urls = []
        if image_url:
            local_processed = self._handle_local_image(image_url)
            # Only add if it's not a dead localhost link
            if not ("localhost" in local_processed or "127.0.0.1" in local_processed):
                active_urls.append(local_processed)

        if image_urls:
            for u in image_urls:
                local_processed = self._handle_local_image(u)
                if not ("localhost" in local_processed or "127.0.0.1" in local_processed):
                    active_urls.append(local_processed)

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
                return SkuContentResponse(**data)

            except Exception as e:
                error_msg = str(e)
                # Rotate model on BadRequest (400) or NotFound (404) or RateLimit
                if ("400" in error_msg or "404" in error_msg or "rate limit" in error_msg.lower() or "Engine is not loaded" in error_msg) and attempt < max_retries - 1:
                    logger.info(f"AI Provider error ({error_msg[:100]}), rotating model and retrying in {retry_delay}s... (Attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(retry_delay)
                    continue

                logger.error(f"LiteLLM Final Generation Error: {error_msg}")
                raise e

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

        # Clean up tax_rule_code
        if 'tax_rule_code' in data and data['tax_rule_code']:
            data['tax_rule_code'] = str(data['tax_rule_code']).replace(" ", "").strip()

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

    def _build_prompt(self, name, brand, cat, ref_url, existing, fields, instruction, valid_categories=None, valid_sub_categories=None):
        fields = fields or [
            "product_name", "brand", "alternate_product_name", "category", "sub_category",
            "description", "key_feature", "key_ingredients", "ingredients",
            "how_to_use", "product_care", "caution", "tax_rule_code",
            "tax_percent", "seo_keywords", "color"
        ]

        # Define the full schema template
        # Neutral Schema Template (no instructions inside values to prevent AI echoing)
        schema_template = {
            "product_name": "",
            "brand": "",
            "alternate_product_name": "",
            "category": "",
            "sub_category": "",
            "description": "",
            "key_feature": "",
            "key_ingredients": "",
            "ingredients": "",
            "how_to_use": "",
            "product_care": "",
            "caution": "",
            "tax_rule_code": "",
            "tax_percent": 0.0,
            "seo_keywords": "",
            "color": ""
        }

        # Field-specific writing guidelines (outside JSON to keep schema clean)
        field_guidelines = {
            "product_name": "Premium title. Format: [Brand] [Product Name] [Key Benefit/Hero Ingredient] [Size]. Max 80 chars.",
            "description": "Benefit-First framework. Problem -> Solution (Benefit) -> Sensory Details -> Soft CTA.",
            "key_feature": "Bullet points in 'Heading: Detailed description' format. Focus on results.",
            "key_ingredients": "Primary active ingredients only.",
            "how_to_use": "Clear, step-by-step numbered steps.",
            "tax_rule_code": "Suggested 4-digit HSN code (e.g. 3304).",
            "seo_keywords": "High-intent search keywords (comma separated).",
            "color": "The Color / Shade of the product. Infer from image if not in text."
        }

        # Filter schema based on requested fields
        target_schema = {k: schema_template[k] for k in fields if k in schema_template}

        categories_str = ", ".join(valid_categories) if valid_categories else cat
        sub_cats_str = ", ".join(valid_sub_categories) if valid_sub_categories else "Relevant sub-category"

        guidelines_str = "\n".join([f"- {k.replace('_', ' ').upper()}: {field_guidelines[k]}" for k in fields if k in field_guidelines])

        prompt = f"""
        INPUT DATA:
        Product Name (Draft): {name if name else "Not provided (Infer from images/links)"}
        Brand: {brand if brand else "Not provided (Infer from images/links)"}
        Current Category Selection: {cat if cat else "Not provided (Infer from images/links)"}
        Reference URLs: {", ".join(ref_url) if isinstance(ref_url, list) and ref_url else (ref_url or "None provided")}

        AVAILABLE TAXONOMY:
        Categories: {categories_str}
        Sub-Categories: {sub_cats_str}

        EXISTING DATA (Maintain consistency):
        {json.dumps(existing, indent=2) if existing else "None"}

        WRITING GUIDELINES FOR REQUESTED FIELDS:
        {guidelines_str}

        TASK:
        Generate actual, high-quality content for: {", ".join(fields)}.
        Analyze the Input Data and available Reference URLs to synthesize accurate facts.

        TAXONOMY ENFORCEMENT:
        - For 'category', you MUST select the best fit from: {categories_str}
        - For 'sub_category', you MUST select the best fit from: {sub_cats_str}
        - If the field is not in the requested fields, ignore it.

        Return ONLY valid JSON following this structure:
        {json.dumps(target_schema, indent=2)}

        CRITICAL: Use meaningful words, not placeholders or instructions.
        """

        if instruction:
            prompt += f"\nCLIENT SPECIFIC INSTRUCTION/MESSAGE: {instruction}\n"

        prompt += f"""
        REQUIRED JSON SCHEMA (Return ONLY these keys):
        {json.dumps(target_schema, indent=4)}

        MARKETPLACE GUIDELINES:
        - Descriptions must follow the 'Benefit-First' framework.
        - Ensure JSON is perfectly formatted. Do not include extra text.
        """
        return prompt

# --- Factory ---

def get_ai_provider() -> Optional[BaseAIProvider]:
    provider_type = os.getenv("AI_PROVIDER", "mock").lower()
    model = os.getenv("AI_MODEL", "gemini/gemini-1.5-flash")
    api_key = os.getenv("AI_API_KEY")
    api_base = os.getenv("AI_API_BASE") # Useful for local LLMs like Jan

    if provider_type == "mock":
        return MockProvider()

    # Check for specific keys if AI_API_KEY is not set generically
    if not api_key:
        if "gemini" in model.lower():
            api_key = os.getenv("GEMINI_API_KEY")
        elif "gpt" in model.lower():
            api_key = os.getenv("OPENAI_API_KEY")

    return LiteLLMProvider(model=model, api_key=api_key, api_base=api_base)

class MockProvider(BaseAIProvider):
    async def generate_sku_content(self, product_name, brand, category, image_url=None, image_urls=None, reference_urls=None, existing_data=None, target_fields=None, custom_instruction=None, valid_categories=None, valid_sub_categories=None):
        return SkuContentResponse(
            product_name=f"{product_name} (AI Enhanced)",
            category=valid_categories[0] if valid_categories else category,
            sub_category=valid_sub_categories[0] if valid_sub_categories else "General",
            alternate_product_name=f"{product_name} Premium Edition",
            key_feature="Premium Quality\nDurable Design\nEco-friendly",
            key_ingredients="Vitamin E, Natural Extracts",
            ingredients="Aqua, Glycerin, AI Core",
            how_to_use="Wet skin, massage gently in circular motions, rinse thoroughly with lukewarm water.",
            product_care="Store in a cool, dry place. Avoid direct sunlight.",
            caution="Suitable for all skin types.",
            tax_rule_code="3304",
            tax_percent=18.0,
            seo_keywords="cleanser, face wash, hydrating cleanser, glow, radiant skin, gentle cleanser"
        )

    async def generate_generic_content(self, prompt, system_prompt=None, response_model=None):
        if response_model:
            return {"text": "Generic AI response"}
        return "Generic AI response"
