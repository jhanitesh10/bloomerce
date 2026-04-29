# INPUT DATA

## Product Basics
- product_name_draft: {name}
- brand: {brand}
- current_category: {cat}

## Context Inputs
- reference_urls: {ref_urls}
- product_images: {image_inputs}

## User Intent (Dynamic Controls)
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

Generate high-quality, marketplace-ready content for the requested fields.

You must:
- strictly follow the system role, rules, and inference logic
- use all available inputs intelligently (image, URLs, brand, category)
- ensure outputs are accurate, relevant, and conversion-focused
- maintain consistency with existing_data (if provided)

---

# EXECUTION FLOW (MANDATORY)

Follow this internal sequence before generating output:

1. Resolve product identity (type, category, use-case)
2. Identify target user and primary pain point
3. Determine positioning (budget / premium / trend-based)
4. Apply selected tone behavior
5. Generate content per field logic

Do NOT output this reasoning.

---

# REFERENCE USAGE RULES

- Use reference URLs only for validation and enrichment
- Do NOT copy content
- Do NOT assume all references are correct
- Cross-check signals across multiple inputs
- If conflict exists → prefer safer, generic accuracy

---

# CATEGORY ENFORCEMENT

- "category" MUST be selected from: {categories_str}
- "sub_category" MUST be selected from: {sub_cats_str}
- Choose the closest valid match based on product understanding

---

# FIELD EXECUTION RULES

Generate ONLY the fields requested in target_fields.

For each field:
- follow the specific guideline (if provided)
- adapt writing style accordingly
- ensure no duplication across fields

---

# OUTPUT REQUIREMENTS (STRICT)

- Return ONLY valid JSON
- Follow the required_schema EXACTLY
- Do NOT add extra keys
- Do NOT include explanations or text outside JSON

If a field cannot be confidently generated:
- return null (only if schema allows)

---

# QUALITY CHECK (FINAL STEP BEFORE OUTPUT)

Ensure:
- no hallucinated claims
- no keyword stuffing
- no repetitive phrasing
- tone consistency across all fields
- marketplace readiness

---
# OPERATIONAL AUTOFILL TASK

If requested fields include purchase_cost, net_quantity, net_quantity_unit, colour, raw_product_weight_g, or package_weight_g:

- Fill from user input first
- Then use image/reference URLs
- Then use safe market-based estimation only when reasonable
- Never treat estimates as exact facts
- Return null when confidence is too low
- Use grams for weights
- Use ml/g/pcs/pair/set for quantity units

---

# INGREDIENT FALLBACK BEHAVIOR

If ingredient data is not available:

- attempt extraction from image and references
- if still missing, generate a safe estimated ingredient list
- clearly mark as "estimated"
- include a warning for user verification
- assign low confidence

Do NOT leave field empty if reasonable estimation is possible.

---

# FINAL INSTRUCTION

Generate meaningful, real product content.

DO NOT output:
- placeholders
- instructions
- meta text

ONLY return the final JSON response.