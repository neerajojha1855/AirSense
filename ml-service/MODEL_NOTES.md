# AirSense: ML Model Limitations & Production Roadmap

This document outlines the compromises made for the hackathon MVP and details how the ML pipeline would evolve in a full production deployment.

## 1. Spatial Resolution & Interpolation
- **Hackathon State:** The problem statement calls for "1km grid resolution". Because we only have a limited number of official CAAQMS stations in Delhi, we applied deterministic spatial variance hashing based on `zoneId` to demonstrate multi-zone UI functionality without crashing the server on sparse data.
- **Production State:** We would implement true Inverse Distance Weighting (IDW) or Kriging interpolation across a much wider array of low-cost IoT sensors to achieve genuine 1km hyperlocal resolution.

## 2. Forecasting Model (SARIMA)
- **Hackathon State:** We utilized a SARIMA model architecture tuned on a static historical dataset (`cpcb_samples.csv`). The model successfully beats a naive persistence baseline (Tomorrow = Today), verifying our statistical approach.
- **Production State:** The model would be upgraded to an XGBoost or LSTM architecture utilizing rolling live-data windows. We would also incorporate weather covariates (wind speed, temperature inversion layers) and calendar events (Diwali, crop burning season) as primary features.

## 3. Source Attribution Confidence
- **Hackathon State:** Source attribution (Traffic vs Industrial vs Construction) is calculated using a rule-based weighted scoring model incorporating land-use tags (`zones_metadata.csv`), time-of-day proxies, and current pollutant ratios (e.g., high NO2 = Traffic).
- **Production State:** We would ingest real-time traffic API congestion data and satellite-derived active fire data (VIIRS) to train a deep learning classifier against physical ground-truth emission inventories.
