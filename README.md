# Bloomerce

Bloomerce is a premium e-commerce cataloging platform designed to streamline SKU management and sales analytics using AI-driven content generation and high-performance asset management.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, AG-Grid (Enterprise), Tailwind CSS.
- **Backend**: FastAPI (Python), SQLAlchemy, SQLite/MySQL.
- **Data Processing**: Pandas / OpenPyXL for high-performance Excel and CSV handling.
- **Integrations**: Google Drive API, Google Gemini AI / OpenAI.

---

## 🏗️ Technical Architecture
- **API Documentation**: Once the backend is running, explore the full API suite at `http://localhost:8000/docs`.
- **Database Migrations**: Uses a modular migration system (v1, v2, v3) for schema evolution.
- **Security**: CORS-protected endpoints with flexible origin configuration via environment variables.

---

## ❓ Troubleshooting
- **Missing Images**: Ensure `GOOGLE_DRIVE_CREDENTIALS` is set correctly. The service account must have "Viewer" access to the root folder.
- **AI Not Responding**: Check if `AI_PROVIDER` is set to a valid provider and the corresponding API key is provided.
- **Port Conflicts**: If port 8000 or 5173 is in use, the servers will fail to start. Use `lsof -i :8000` to find and kill conflicting processes.

---

## 🏃 Getting Started

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Environment Configuration (`backend/.env`):
```env
DATABASE_URL=sqlite:///./bloomerce_local.db
GOOGLE_DRIVE_CREDENTIALS={"type": "service_account", ...}
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_folder_id
AI_PROVIDER=gemini # or mock/openai
GEMINI_API_KEY=your_key
```

#### Run Backend
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## 🚀 Key Features

### 🤖 Bloom AI Console
- **AI-Powered Cataloging**: Automatically generate product descriptions, SEO keywords, and key ingredients using Gemini/OpenAI.
- **Dynamic Taxonomy**: AI intelligently maps products to the internal brand taxonomy (Categories & Sub-categories).
- **Inline Assistant**: Refine individual fields directly with AI suggestions.

### 📦 SKU Master Form
- **Comprehensive Attribute Management**: Handle everything from barcodes and MRPs to packaging dimensions and tax rules.
- **Component Pooling**: Link shared assets (raw materials, labels, packaging) across different SKUs to ensure data consistency.

### 🧩 Section Master
- **Reference Data Control**: Centralized management for Brands, Categories, Sub-categories, and Platforms.
- **Taxonomy Mapping**: Establish hierarchical relationships between categories and sub-categories.

### 📥 Bulk Import/Export
- **Data Mobility**: Seamlessly import and export large datasets of SKUs and Sales Orders via Excel/CSV.
- **Validation Engine**: Automated error logging and validation for incoming data to maintain database integrity.

### 📈 Sales Intelligence
- **Platform-Wide Tracking**: Ingest and analyze sales orders from Amazon, Myntra, Nykaa, Flipkart, and more.
- **Order Analytics**: Monitor order statuses, payment methods, and platform-specific fees.

### 🔮 Coming Soon
- **Sales Forecasting**: Predictive analytics to anticipate demand based on historical sales data.
- **Inventory Optimization**: Automated alerts and recommendations for stock replenishment.

### 🖼️ High-Performance Image Export
- **Parallel Processing**: Fetch and ZIP images from Google Drive using a multi-threaded parallel architecture.
- **Flexible Hierarchy**: Choose between custom folder structures or flattened hierarchies.
