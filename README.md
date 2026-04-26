<div align="center">

# 🌿 EcoOptimizer

### Real-Time Environmental Sustainability Optimization Engine

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**EcoOptimizer** is an AI-assisted, real-time sustainability planning dashboard that uses a greedy priority-weighted algorithm to find the most cost-efficient environmental actions across multiple domains — helping decision-makers reduce risk scores, allocate budgets wisely, and achieve measurable sustainability goals.

[🚀 Live Demo](#) · [📖 API Docs](http://localhost:8010/docs) · [🐛 Report Bug](issues)

</div>

---

## 📸 Screenshots

| Dashboard | Plan & Optimize |
|---|---|
| ![Dashboard](https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/docs/dashboard.png) | ![Plan](https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/docs/plan.png) |

---

## ✨ Features

### 🎯 Core Optimization Engine
- **Greedy Priority-Weighted Algorithm** — finds the highest-impact action at every step, respecting budget and iteration constraints
- **NCV (Normalized Constraint Violation)** — unified 0–100 risk score across all environmental variables
- **Diminishing Returns Modelling** — realistic re-application penalties for repeated actions
- **Multi-domain optimization** — simultaneously optimize Water, Agriculture, Energy, Waste & Smart Cities

### 🧠 AI Explanation Layer
- **Natural-language action explanations** via OpenRouter (GPT-4o, Claude, etc.)
- **AI-generated report summaries** with key insights and next-step suggestions
- **Graceful fallback** — rule-based explanations when no AI key is configured

### 🌦️ Weather Integration
- **Live weather data** via OpenWeatherMap API
- **AI-simulated weather** via OpenRouter when no weather key is available
- **Weather-aware risk modelling** — region modifiers adjust variable weights based on real conditions
- **Multi-city comparison** — compare risk projections across up to 3 cities side-by-side

### 🤖 Human-in-the-Loop (HITL)
- **Preview mode** — simulate an optimization plan before committing
- **Action approval queue** — individually approve or reject each suggested action
- **Disallowed action filtering** — skip specific actions per policy

### 📊 Advanced Analytics
- **Sensitivity analysis** — which variables are most critical to NCV changes
- **Stability scoring** — how close each domain is to a fully safe state
- **Decision confidence metrics** — data reliability + model stability scores
- **Trend projection** — projected NCV drift over 30/90 days without action
- **Domain impact breakdown** — per-domain improvement attribution

### 🔌 Plugin Architecture
- JSON-based domain schemas — add a new sustainability domain by dropping a `.json` file
- Dynamic domain loading at runtime via REST API

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend  (Next.js :3000)               │
│  ┌──────────┐ ┌─────────────┐ ┌────────┐ ┌──────────┐  │
│  │Dashboard │ │OptimizerPane│ │Reports │ │WeatherWid│  │
│  └──────────┘ └─────────────┘ └────────┘ └──────────┘  │
│           Zustand Store ←→ lib/api.ts (axios)           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP  localhost:8010
┌────────────────────────▼────────────────────────────────┐
│                  Backend  (FastAPI :8010)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │/domains  │ │/optimize │ │/weather  │ │/reports  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                     core/state.py (InMemoryStore)        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ engine/optimizer.py  →  engine/ncv.py            │   │
│  │ engine/addons.py     →  engine/sensitivity.py    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ services/weather.py  →  services/ai_explainer.py │   │
│  │ services/ai_providers.py (OpenRouter / HF)       │   │
│  └──────────────────────────────────────────────────┘   │
│  domains/schemas/*.json  (5 pluggable domains)          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Python | ≥ 3.11 |
| Node.js | ≥ 18 |
| npm | ≥ 9 |

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys (see Environment Variables below)

# Start the backend
python -m uvicorn main:app --host 127.0.0.1 --port 8010 --reload
```

The API will be available at **http://127.0.0.1:8010**
Interactive docs at **http://127.0.0.1:8010/docs**

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will open at **http://localhost:3000**

> **Tip:** `npm run dev` automatically starts the backend too if it isn't already running.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENWEATHER_API_KEY` | Optional | [OpenWeatherMap](https://openweathermap.org/api) key for live weather data |
| `OPENAI_API_KEY` | Optional | Your [OpenRouter](https://openrouter.ai) API key (AI explanations) |
| `ANTHROPIC_API_KEY` | Optional | Your [HuggingFace](https://huggingface.co) token (AI fallback) |
| `OPENROUTER_MODEL` | Optional | Model to use via OpenRouter (default: `openrouter/auto`) |
| `HUGGINGFACE_MODEL` | Optional | Model to use via HuggingFace (default: `openai/gpt-oss-120b:fastest`) |

> All keys are optional. The system falls back gracefully — simulated weather and rule-based explanations work out of the box with zero API keys.

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8010` | Backend API base URL |

---

## 🌍 Sustainability Domains

EcoOptimizer ships with **5 built-in domains**, each mapped to UN Sustainable Development Goals:

| Domain | SDGs | Key Variables |
|---|---|---|
| 💧 Water Management | SDG 6 | Water Quality, Availability, Groundwater, Contamination |
| 🌾 Agriculture | SDG 2, 15 | Soil Health, Crop Yield, Irrigation Efficiency, Pesticide Level |
| ⚡ Clean Energy | SDG 7, 9, 13 | Renewable Share, Grid Reliability, Energy Efficiency, Carbon Intensity |
| ♻️ Waste Management | SDG 12, 14 | Recycling Rate, Landfill Usage, Pollution Index, Processing Capacity |
| 🏙️ Smart Cities | SDG 11, 3 | Air Quality, Traffic Congestion, Digital Connectivity, Public Transport |

### Adding a Custom Domain

Drop a new `.json` file into `backend/domains/schemas/` following this structure:

```json
{
  "id": "my_domain",
  "name": "My Domain",
  "sdg": [13],
  "description": "Description of this domain",
  "icon": "🌱",
  "variables": [
    {
      "id": "var_1",
      "name": "Variable Name",
      "unit": "unit",
      "value": 50.0,
      "min_value": 0,
      "max_value": 100,
      "min_safe": 20,
      "max_safe": 80,
      "weight": 0.8,
      "higher_is_better": true,
      "weather_sensitive": false
    }
  ],
  "actions": [
    {
      "id": "action_1",
      "name": "Action Name",
      "description": "What this action does",
      "cost": 5000,
      "effects": [{ "variable_id": "var_1", "delta": 10 }],
      "max_applications": 3,
      "diminishing_factor": 0.7
    }
  ]
}
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service info |
| `GET` | `/health` | Health check |
| `GET` | `/api/domains/` | List all loaded domains |
| `GET` | `/api/domains/state` | Get global NCV state snapshot |
| `POST` | `/api/domains/reset` | Reset all domains to initial state |
| `POST` | `/api/optimize/` | Run optimization |
| `GET` | `/api/weather/?city=London` | Fetch weather for a city |
| `GET` | `/api/reports/` | List all optimization runs |
| `GET` | `/api/reports/latest` | Get the most recent result |
| `GET` | `/api/reports/{id}` | Get a specific report by ID |
| `GET` | `/api/integrations/ai/status` | Check AI provider connectivity |
| `GET` | `/api/integrations/weather/status` | Check weather provider status |

Full interactive docs: **http://localhost:8010/docs**

---

## 🔬 How the Algorithm Works

```
1. Compute initial NCV score for all selected domains
2. For each candidate action:
   a. Check max_applications constraint
   b. Check remaining budget constraint
   c. Apply diminishing returns: effect = base_delta × (diminishing_factor ^ times_applied)
   d. Simulate action on a copy of current state
   e. Compute new global NCV
   f. Compute efficiency = ΔNCV / cost  (only if ΔNCV > 0)
3. Select action with highest efficiency → apply for real
4. Record action, append NCV to history
5. Stop when:
   • NCV ≤ target_ncv  → COMPLETE
   • No action reduces NCV → COMPLETE
   • Budget exhausted → PARTIAL
   • max_iterations reached → PARTIAL
```

**NCV Formula:**
```
NCV = Σ(violation_i × weight_i) / Σ(weight_i) × 100   ∈ [0, 100]

violation_i:
  • value < min_safe  → (min_safe_norm − norm_val) / min_safe_norm
  • value > max_safe  → (norm_val − max_safe_norm) / (100 − max_safe_norm)
  • within safe zone  → 0.0

weight_i = base_weight × severity_multiplier × region_modifier
  severity_multiplier: 1.5 if violation > 0.5, else 1.0
  region_modifier: derived from live weather conditions
```

---

## 🛠️ Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| FastAPI | 0.111 | REST API framework |
| Uvicorn | 0.29 | ASGI server |
| Pydantic | 2.7 | Data validation & models |
| httpx | 0.27 | Async HTTP client |
| python-dotenv | 1.0 | Environment variable loading |
| anthropic | ≥0.40 | AI client SDK |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| Next.js | 14.2 | React framework (App Router) |
| React | 18 | UI library |
| Zustand | 4.5 | State management |
| Recharts | 2.12 | Data visualization |
| Lucide React | 0.378 | Icon library |
| Axios | 1.7 | HTTP client |
| TailwindCSS | 3.4 | Utility-first CSS |
| TypeScript | 5.0 | Type safety |

---

## 📁 Project Structure

```
AIESEC Hackathon/
├── backend/
│   ├── api/                  # FastAPI route handlers
│   │   ├── domains.py        # Domain CRUD & state endpoints
│   │   ├── optimize.py       # Optimization endpoint
│   │   ├── weather.py        # Weather endpoint
│   │   ├── reports.py        # Report history endpoints
│   │   └── integrations.py   # AI & weather status endpoints
│   ├── core/
│   │   ├── config.py         # Environment config loader
│   │   ├── state.py          # InMemoryStore (single source of truth)
│   │   └── cache.py          # TTL cache for weather
│   ├── domains/
│   │   ├── loader.py         # JSON schema plugin loader
│   │   └── schemas/          # 5 built-in domain definitions
│   ├── engine/
│   │   ├── optimizer.py      # Greedy optimization algorithm
│   │   ├── ncv.py            # NCV formula & calculation
│   │   ├── addons.py         # Result enrichment (analytics)
│   │   ├── sensitivity.py    # Sensitivity analysis
│   │   ├── stability.py      # Stability scoring
│   │   └── normalizer.py     # Value normalization utilities
│   ├── models/
│   │   ├── domain.py         # Pydantic domain models
│   │   └── optimization.py   # Pydantic optimization models
│   ├── services/
│   │   ├── weather.py        # Weather fetching & fallback
│   │   ├── ai_explainer.py   # AI explanation layer
│   │   ├── ai_providers.py   # OpenRouter / HuggingFace clients
│   │   └── feedback.py       # NCV snapshot recorder
│   ├── main.py               # FastAPI app entry point
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── page.tsx           # Main page (Dashboard / Plan / Reports)
    │   ├── layout.tsx         # Root layout + metadata
    │   └── globals.css        # Global styles + Tailwind base
    ├── components/
    │   ├── OptimizerPanel.tsx # Plan settings, domain selection, HITL
    │   ├── OptimizationResult.tsx # Full results view with charts
    │   ├── DomainCard.tsx     # Per-domain risk card
    │   ├── NCVGauge.tsx       # Circular NCV gauge
    │   ├── NCVChart.tsx       # NCV history line chart
    │   ├── WeatherWidget.tsx  # Live weather display
    │   ├── ReportView.tsx     # Historical reports list
    │   ├── ActionLog.tsx      # Step-by-step action log
    │   └── StateComparisonChart.tsx # Before/after bar chart
    ├── store/
    │   └── useStore.ts        # Zustand global store
    ├── lib/
    │   └── api.ts             # Axios API client
    ├── types/
    │   └── index.ts           # TypeScript type definitions
    ├── scripts/
    │   └── ensure-backend.cjs # Auto-starts backend on npm run dev
    ├── package.json
    └── next.config.js
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ for the **AIESEC Hackathon**

*Optimizing sustainability, one NCV point at a time.*

</div>
