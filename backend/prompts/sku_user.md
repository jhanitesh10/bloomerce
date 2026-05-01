
# SKU USER PROMPT (sku_user.md)

---

# INPUT DATA

## Product Basics
- product_name_draft: {name}
- brand: {brand}
- current_category: {cat}

## Context Inputs
- user_context: {user_context}
- reference_urls: {ref_urls}
- product_images: {image_inputs}

## User Intent Controls
- selected_tone: {tone}
- custom_instructions: {custom_instruction_block}

## Target Output Fields
- target_fields: {target_fields}

## Taxonomy Options
- allowed_categories: {categories_str}
- allowed_sub_categories: {sub_cats_str}

## Existing Data (For Consistency)
- existing_data: {existing_data}

## Output Schema
- required_schema: {target_schema_indented}

---

# TASK

Generate high-quality, marketplace-ready product listing content.

The output must be:
- accurate
- structured
- SEO-aware
- conversion-focused
- compliant with marketplace standards (Amazon, Flipkart, Myntra, Nykaa, etc.)

---

# INPUT PRIORITY (STRICT)

Always resolve using this order:

1. user_context (highest priority)
2. product_images
3. reference_urls
4. existing_data
5. similar products / market patterns
6. controlled inference (last resort)

If inputs conflict:
- prioritize user_context
- then visible image facts
- then references for enrichment

---

# EXECUTION FLOW (MANDATORY INTERNAL LOGIC)

Before generating output:

1. Identify product type and use-case
2. Identify target buyer and intent
3. Understand primary problem solved
4. Determine product positioning (budget / premium / functional / trend)
5. Validate or infer category and sub-category
6. Adjust tone based on selected_tone

DO NOT output this reasoning.

---

# FIELD GENERATION RULE

Generate ONLY fields present in:
target_fields

Do NOT generate extra fields.

Each field must:
- follow system-level rules
- be non-repetitive
- be relevant to the product type
- maintain consistency across all fields

---

# UNIVERSAL OUTPUT STRUCTURE (MANDATORY)

Every field must strictly follow:

{{
  "value": "...",
  "confidence_score": 0-100,
  "confidence_level": "high | medium | low",
  "basis": "user_input | image | reference_url | existing_data | web_research | market_estimate | inferred",
  "warning": null
}}

---

# OUTPUT RULES

- value must NEVER be a nested object
- value can be string, number, array, or null
- confidence_score must reflect actual certainty
- confidence_level mapping:
  - high: 80-100
  - medium: 50-79
  - low: 1-49
- basis must reflect actual source of truth
- warning is required when:
  - estimation is used
  - compliance risk exists
  - ingredient/material is inferred
  - classification may vary

---

# FIELD-SPECIFIC EXECUTION RULES

## Titles (primary_title, alt_title)
- must be SEO-friendly and human-readable
- include product type + benefit + differentiator
- avoid keyword stuffing
- align with Amazon/Nykaa/Flipkart style
- alt_title should be a variation, not duplicate

---

## Description
- 60–120 words
- explain product, use-case, and benefit
- premium but factual tone
- no fake claims

---

## Key Features
- 5–6 bullet points
- format: Heading: explanation
- must help decision-making

---

## Ingredients / Materials

If product is:
- formulated (skincare, cosmetics, pet care, consumables):
  - generate key_ingredients and full_ingredients

If product is:
- non-formulated (fashion, tools, accessories):
  - convert to material/composition if applicable
  - otherwise return null with warning

Never hallucinate exact full ingredient list.

---

## How to Use
- step-based instructions
- adapted to product type
- safe and practical

---

## Care Instructions
- maintenance/storage guidance
- based on product category

---

## Cautions
- realistic safety instructions
- no exaggeration
- no legal/medical overclaim

---

## Category & Sub-Category
- prefer allowed lists
- if not suitable → generate logical taxonomy
- sub-category must be more specific

---

## Colour / Shade
- simple user-friendly names
- prioritize user input → image → reference → inference

---

## Quantity & Unit

quantity_unit must be one of:
- ml, g, kg, pcs, pair, set, L, cm, m

Examples:
- 30 ml serum
- 1 pcs shapewear
- 1 pair nipple cover

---

## Weight Fields

raw_weight_g:
- product only

package_weight_g:
- shipping weight

Use realistic estimates only.

---

## Pricing Fields

mrp_est:
- printed price estimate

selling_price_est:
- expected online selling price

purchase_cost_est:
- landed cost estimate

Use:
- ranges when uncertain
- Indian market patterns

---

## HSN & Tax

- infer based on product type
- assign GST accordingly

Always include warning:
"Verify HSN/GST with tax professional before use."

---

## SEO Keywords
- 10–20 keywords
- include:
  - product type
  - use-case
  - benefits
  - variations
- avoid spam and unrelated terms

---

# WEB RESEARCH RULE

If available, use web research for:
- pricing (MRP, selling price, cost)
- SEO keyword trends
- competitor titles
- ingredient validation
- category validation

If NOT available:
- rely on inputs and market_estimate

---

# CONSISTENCY RULE

If existing_data is provided:
- align tone and facts
- do not contradict existing confirmed values
- improve quality without changing meaning

---

# FAILURE / LOW CONFIDENCE RULE

If a field cannot be safely generated:
- return null (if allowed)
- OR generate safe estimate with:
  - low confidence
  - warning message

---

# FINAL QUALITY CHECK

Before output:

- ensure JSON is valid
- ensure schema is followed exactly
- ensure no hallucinated claims
- ensure no repetition across fields
- ensure tone consistency
- ensure marketplace readiness

---

# FINAL OUTPUT INSTRUCTION

Return ONLY valid JSON.

Do NOT include:
- explanations
- markdown
- comments
- placeholders

Only the final structured response.