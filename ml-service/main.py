"""
main.py — AirSense ML Microservice entrypoint (FastAPI)
Serves: /forecast/:wardId, /attribution/:zoneId, /enforcement/priorities

During early development all endpoints return mock data from mock_outputs.json.
ML person: replace mock returns with real model calls as models are built.
"""

import json
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Import route modules
from forecasting.model import get_forecast
from attribution.scoring_model import get_attribution
from enforcement.ranking import get_enforcement_priorities

# ── Load mock data (fallback for early dev) ─────────────────────────────────
MOCK_DATA_PATH = Path(__file__).parent / "data" / "mock_outputs.json"
mock_data: dict = {}
try:
    with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
        mock_data = json.load(f)
    print(f"[OK] Mock data loaded from {MOCK_DATA_PATH}")
except FileNotFoundError:
    print(f"[WARN] Mock data not found at {MOCK_DATA_PATH}")

USE_MOCK = os.getenv("USE_MOCK_DATA", "true").lower() == "true"

# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="AirSense ML Microservice",
    description="Forecasting, Source Attribution, and Enforcement Ranking for AirSense",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_ZONES = [
    "anand-vihar", "rk-puram", "ito", "dwarka", "rohini",
    "punjabi-bagh", "okhla", "narela", "lodhi-road", "wazirpur",
    "mandir-marg"
]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "airsense-ml",
        "use_mock": USE_MOCK,
    }


# ── Forecast Endpoint ────────────────────────────────────────────────────────
@app.get("/forecast/{ward_id}")
def forecast(ward_id: str):
    if ward_id not in VALID_ZONES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid wardId '{ward_id}'. Valid zones: {VALID_ZONES}",
        )

    if USE_MOCK:
        zone_mock = mock_data.get("forecast", {}).get(ward_id)
        if not zone_mock:
            # Fall back to any available zone's mock data
            zone_mock = next(iter(mock_data.get("forecast", {}).values()), None)
        if zone_mock:
            return {**zone_mock, "wardId": ward_id, "dataSource": "mock"}
        raise HTTPException(status_code=503, detail="No mock data available")

    # Real model call (ML person fills this in Week 2)
    return get_forecast(ward_id)


# ── Attribution Endpoint ─────────────────────────────────────────────────────
@app.get("/attribution/{zone_id}")
def attribution(zone_id: str):
    if zone_id not in VALID_ZONES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid zoneId '{zone_id}'. Valid zones: {VALID_ZONES}",
        )

    if USE_MOCK:
        zone_mock = mock_data.get("attribution", {}).get(zone_id)
        if not zone_mock:
            zone_mock = next(iter(mock_data.get("attribution", {}).values()), None)
        if zone_mock:
            return {**zone_mock, "zoneId": zone_id, "dataSource": "mock"}
        raise HTTPException(status_code=503, detail="No mock data available")

    return get_attribution(zone_id)


# ── Enforcement Endpoint ─────────────────────────────────────────────────────
@app.get("/enforcement/priorities")
def enforcement_priorities(limit: Optional[int] = 10):
    if USE_MOCK:
        enforcement_mock = mock_data.get("enforcement", {})
        if enforcement_mock:
            result = dict(enforcement_mock)
            result["priorities"] = result.get("priorities", [])[:limit]
            result["dataSource"] = "mock"
            return result
        raise HTTPException(status_code=503, detail="No mock data available")

    return get_enforcement_priorities(limit=limit)
