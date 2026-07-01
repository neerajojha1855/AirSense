# AirSense — AI-Powered Urban Air Quality Intelligence

> Built for **ET AI Hackathon 2026** — Problem Statement #5 (Smart Cities / Environmental Intelligence)

AirSense fuses CAAQMS monitoring data, weather, land-use, and population layers into a single intelligence platform that **predicts** AQI hyperlocally, **attributes** pollution to its source, **ranks** enforcement priorities, and **advises** citizens — moving city administration from reactive monitoring to proactive intervention.

Demo city: **Delhi**. Architecture is city-agnostic by design.

---

## Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Setup Instructions](#setup-instructions)
6. [Environment Variables](#environment-variables)
7. [API Endpoints](#api-endpoints)
8. [Feature Breakdown](#feature-breakdown)
9. [Team](#team)
10. [Roadmap (Post-Hackathon)](#roadmap-post-hackathon)

---

## What This Project Does

| Feature | One-line description |
|---|---|
| 🌫️ Source Attribution | "This AQI spike near Anand Vihar is 60% traffic, 30% industrial, 10% construction — here's why" |
| 📈 Hyperlocal Forecasting | "AQI at this ward will hit 'Severe' in 36 hours — here's the trend" |
| 🚨 Enforcement Prioritization | "These 5 zones need inspector deployment today, ranked by exposure + confidence" |
| 🗺️ Multi-City Comparison | "Delhi vs Mumbai vs Kolkata — who's improving, who's not" |
| 💬 Citizen Advisory | "Aaj bahar mat nikliye, AQI 320 hai aapke area mein" — in Hindi/English |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Data Sources                                    │
│  CPCB CAAQMS | OpenWeatherMap | OSM | Population │
└───────────────────────┬───────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│  ML Microservice (Python + FastAPI)              │
│  • forecasting/  → SARIMA / XGBoost model         │
│  • attribution/  → weighted source-scoring model  │
│  • enforcement/  → ranking logic                  │
└───────────────────────┬───────────────────────────┘
                         │  REST (JSON)
                         ▼
┌─────────────────────────────────────────────────┐
│  Backend (Node.js + Express)                     │
│  • Data orchestration + Redis caching             │
│  • MongoDB (geospatial indexes)                   │
│  • LLM integration (citizen advisory generation)  │
└───────────────────────┬───────────────────────────┘
                         │  REST (JSON)
                         ▼
┌─────────────────────────────────────────────────┐
│  Frontend (React)                                │
│  • Map view (Leaflet) — heatmap + attribution     │
│  • Forecast charts (per ward)                     │
│  • Enforcement priority list                      │
│  • Multi-city comparison view                     │
│  • Citizen advisory chat widget                    │
└─────────────────────────────────────────────────┘
```

Full rationale and requirements are in [`PRD.md`](./PRD.md).

---

## Tech Stack

- **ML Service:** Python, FastAPI, pandas, scikit-learn, statsmodels/Prophet, XGBoost, geopandas
- **Backend:** Node.js, Express, MongoDB (geospatial indexing), Redis (caching)
- **Frontend:** React, Leaflet/Mapbox, Recharts/Chart.js
- **LLM:** Used for citizen advisory text generation + translation (Hindi/English)
- **Deployment (demo):** Docker Compose for local/demo environment

---

## Folder Structure

```
airsense/
├── ml-service/                 # Python FastAPI microservice
│   ├── forecasting/
│   │   ├── model.py            # SARIMA/XGBoost forecasting logic
│   │   └── train.py
│   ├── attribution/
│   │   └── scoring_model.py    # Source attribution weighted scoring
│   ├── enforcement/
│   │   └── ranking.py
│   ├── data/                   # cached/sample datasets
│   ├── main.py                 # FastAPI app entrypoint
│   └── requirements.txt
│
├── backend/                    # Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   │   ├── forecast.routes.js
│   │   │   ├── attribution.routes.js
│   │   │   ├── enforcement.routes.js
│   │   │   ├── advisory.routes.js
│   │   │   └── cities.routes.js
│   │   ├── models/             # MongoDB schemas (Station, Forecast, Zone, etc.)
│   │   ├── services/           # ML-service client, LLM client, cache layer
│   │   └── app.js
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.jsx
│   │   │   ├── ForecastChart.jsx
│   │   │   ├── EnforcementList.jsx
│   │   │   ├── CityCompare.jsx
│   │   │   └── AdvisoryChat.jsx
│   │   ├── pages/
│   │   └── App.jsx
│   └── package.json
│
├── PRD.md
├── README.md
└── docker-compose.yml
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### 1. ML Microservice
```bash
cd ml-service
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload --port 8001
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in values
npm run dev            # starts on port 5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev             # starts on port 3000
```

### 4. (Optional) Run everything via Docker Compose
```bash
docker compose up --build
```

---

## Environment Variables

**backend/.env**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/airsense
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://localhost:8001
OPENWEATHER_API_KEY=your_key_here
LLM_API_KEY=your_key_here
```

**ml-service/.env**
```
CPCB_DATA_PATH=./data/cpcb_sample.csv
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forecast/:wardId` | 24-72hr AQI forecast for a ward |
| GET | `/api/attribution/:zoneId` | Source attribution breakdown for a zone |
| GET | `/api/enforcement/priorities` | Ranked enforcement action list |
| GET | `/api/cities/compare?cities=delhi,mumbai` | Multi-city historical comparison |
| POST | `/api/advisory/chat` | Citizen advisory chatbot (body: `{ location, query, language }`) |

Full request/response schemas to be documented in `backend/src/routes/*` as they're built (keep this section updated — don't let docs drift from code).

---

## Feature Breakdown

### 1. Source Attribution Engine
Weighted scoring model combining AQI spike data + land-use + traffic + wind direction. Outputs per-zone confidence scores per source category. **Not a black box** — every score is traceable to its inputs, shown in UI as a breakdown.

### 2. Hyperlocal AQI Forecasting
Baseline: SARIMA/Prophet on historical CAAQMS data. Stretch: XGBoost with weather + calendar features. Spatial interpolation (IDW) used to approximate grid-level estimates between stations. **Always benchmarked against a persistence baseline** — this comparison is shown explicitly in the dashboard and deck.

### 3. Enforcement Intelligence
Rule-based ranking: severity × population exposure × attribution confidence. Reuses attribution engine output — no separate ML model needed.

### 4. Multi-City Comparison
City-agnostic backend design (city passed as parameter). Delhi shown with live pipeline; 1-2 additional cities shown via historical CPCB data only (not live forecasting) for hackathon scope.

### 5. Citizen Advisory
LLM-generated, location-aware advisory text in Hindi + English (web chat widget). Uses static POI data (hospitals/schools) to flag vulnerable-population zones for higher-urgency messaging.

---

## Team

| Name | Role |
|---|---|
| Mridul Malvi | ML Engineer — Forecasting + Attribution models |
| Piyush Kumar | Backend Engineer — Data pipeline, APIs, DB |
| Neeraj Ojha  | Frontend Engineer — Dashboard, UI, demo assets |

---

## Roadmap (Post-Hackathon)

- True atmospheric dispersion modelling (replace IDW interpolation)
- WhatsApp/IVR integration for citizen advisory (beyond web chat)
- Live multi-city forecasting (not just historical comparison)
- Integration with real enforcement source registries (replace sample dataset)
- Additional regional languages (Tamil, Kannada, Bengali, etc.)
- Production-grade auth + role-based access for municipal/PCB users

---

## Notes for Judges / Reviewers

Some data in this prototype is clearly marked as **sample/mock** where real-time access wasn't available within the hackathon timeline (e.g., construction permit registry, emission source database). All AQI, weather, and land-use data shown is from real public sources (CPCB, OpenWeatherMap, OSM). This is disclosed transparently rather than presented as fully live to avoid overstating capability.
