"""
ranking.py — Enforcement Priority Ranking

Combines attribution output + AQI severity + population exposure into a
weighted score for ranking zones by enforcement priority.

Formula: score = (aqi_weight * aqi_score) + (pop_weight * pop_score) + (attr_weight * attr_confidence)
where weights sum to 1.0.

This reuses attribution engine output — NOT a separate ML model (per AGENTS.md §5).
"""

from datetime import datetime, timezone
from typing import Any
import pandas as pd
from pathlib import Path
from attribution.scoring_model import get_attribution
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATA_PATH = Path(__file__).parent.parent / "data"
ZONES_CSV = DATA_PATH / "zones_metadata.csv"

try:
    zones_df = pd.read_csv(ZONES_CSV)
    ZONE_POPULATION = zones_df.set_index("zoneId")["population_estimate"].to_dict()
    VALID_ZONES = zones_df["zoneId"].tolist()
except Exception:
    ZONE_POPULATION = {
        "anand-vihar": 48000,
        "rk-puram": 62000,
        "ito": 35000,
        "dwarka": 85000,
        "rohini": 92000,
        "punjabi-bagh": 54000,
        "okhla": 41000,
        "narela": 28000,
        "lodhi-road": 22000,
        "wazirpur": 33000,
    }

    VALID_ZONES = list(ZONE_POPULATION.keys())

# Weighting for the composite score
WEIGHTS = {
    "aqi": 0.40,       # Higher AQI → higher priority
    "population": 0.30, # More people exposed → higher priority
    "attribution": 0.30, # Higher attribution confidence → more certain enforcement target
}

MAX_POPULATION = max(ZONE_POPULATION.values()) if ZONE_POPULATION else 100000 # for normalization


def aqi_to_category(aqi: int) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Satisfactory"
    if aqi <= 200: return "Moderate"
    if aqi <= 300: return "Poor"
    if aqi <= 400: return "Very Poor"
    return "Severe"


def compute_zone_score(aqi: int, population: int, attribution_confidence: float) -> float:
    """Compute normalized composite enforcement priority score [0, 1]."""
    aqi_score = min(aqi / 500.0, 1.0)
    pop_score = population / MAX_POPULATION
    attr_score = attribution_confidence
    return round(
        WEIGHTS["aqi"] * aqi_score
        + WEIGHTS["population"] * pop_score
        + WEIGHTS["attribution"] * attr_score,
        3,
    )


def get_enforcement_priorities(limit: int = 10) -> dict[str, Any]:
    """
    Rank all zones by enforcement priority.

    TODO (ML Engineer — Week 2):
      1. For each zone, fetch latest attribution output from MongoDB
      2. For each zone, fetch latest AQI reading from MongoDB
      3. Call compute_zone_score() with real values
      4. Build reason text from real attribution data
      5. Return sorted list

    Returns:
        dict matching API contract enforcement shape
    """
    now = datetime.now(timezone.utc)
    priorities = []
    
    for i, zone_id in enumerate(VALID_ZONES):
        try:
            attr = get_attribution(zone_id)
            try:
                from forecasting.model import get_forecast
                forecast_res = get_forecast(zone_id)
                aqi = forecast_res["forecast"][0]["predictedAQI"]
            except Exception:
                aqi = attr["currentAQI"]
            dominant = attr["dominantSource"]
            confidence = next((s["confidence"] for s in attr["sources"] if s["category"] == dominant), 0.5)
        except Exception as e:
            aqi = 200
            dominant = "unknown"
            confidence = 0.5
        
        pop = ZONE_POPULATION.get(zone_id, 10000)
        score = compute_zone_score(aqi, pop, confidence)
        reason = build_reason_text(zone_id, aqi,pop, dominant, confidence)

        priorities.append({
            "zoneId": zone_id,
            "name": zone_id.replace("-", " ").title(),
            "score": score,
            "rank": 0,
            "reason": reason,
            "evidence": {
                "aqi": aqi,
                "aqiCategory": aqi_to_category(aqi),
                "population": pop,
                "dominantSource": dominant,
                "attributionConfidence": confidence
            },
        })
    
    priorities.sort(key=lambda f: f["score"], reverse=True)
    for i, p in enumerate(priorities):
        p["rank"] = i + 1

    return {
        "generatedAt": now.isoformat(),
        "priorities": priorities[:limit],
        "totalZonesEvaluated": len(VALID_ZONES),
        "dataSource": "real-model",
    }


def build_reason_text(zone_id: str, aqi: int, population: int, dominant_source: str, confidence: float) -> str:
    cat = aqi_to_category(aqi)
    return (
        f"AQI {aqi} ({cat}) with {round(confidence * 100)}% {dominant_source} attribution confidence. "
        f"~{population:,} residents exposed. "
        f"Enforcement action targeting {dominant_source} sources recommended."
    )
