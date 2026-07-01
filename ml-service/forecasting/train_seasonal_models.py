import pandas as pd
import numpy as np
import statsmodels.api as sm
import warnings
import pickle
import os
from statsmodels.tsa.statespace.sarimax import SARIMAX
from pathlib import Path

warnings.filterwarnings('ignore')

DATA_PATH = Path(__file__).parent.parent / "data"
MODLES_PATH = Path(__file__).parent.parent / "models"
CPCB_CSV =  DATA_PATH / "cpcb_samples.csv"

def compute_persistence_rmse(actual: list[float], n_steps_ahead: int=1) -> float:
    if len(actual) < n_steps_ahead + 1:
        return float("nan")
    
    y_true = actual[n_steps_ahead:]
    y_pred = actual[:len(actual) - n_steps_ahead]

    return float(np.sqrt(np.mean((np.array(y_true) - np.array(y_pred))**2)))

def get_season(month: int) -> str:
    if month in[3, 4, 5]:
        return "spring"
    elif month in [6, 7, 8]:
        return "summer"
    elif month in [9, 10, 11]:
        return "autumn"
    else:
        return "winter"

def main():
    os.makedirs(MODLES_PATH, exist_ok=True)

    print(f"Loading data from {CPCB_CSV}...")
    df = pd.read_csv(CPCB_CSV, skiprows=6)
    df.columns = ["time", "pm10", "pm25", "no2", "so2", "co", "dust", "uv_index"]
    df.dropna(subset=["pm25"], inplace=True)
    df["time"] = pd.to_datetime(df["time"])
    df.set_index("time", inplace=True)
    df.sort_index(inplace=True)
    df["aqi"] = df["pm25"] * 3.5

    df_6h = df["aqi"].resample("6h").mean().ffill()

    seasonal_data = {
        "spring": [],
        "summer": [],
        "autumn": [],
        "winter": [],
    }

    for timestamp, aqi_val in df_6h.items():
        season = get_season(timestamp.month)
        seasonal_data[season].append(aqi_val)
    
    for season, data in seasonal_data.items():
        if len(data) < 50:
            print(f"Not enough data for {season}, skipping...")
            continue

        print(f"Training SARIMA model for {season} (Data points: {len(data)})...")
        train_data = np.array(data)

        model = SARIMAX(train_data, order=(1, 1, 1), seasonal_order=(1, 0, 1, 4))
        model_fit = model.fit(disp=False)

        actual_test = train_data[-28:]
        predictions = model_fit.predict(start=len(train_data)-28, end=len(train_data)-1)
        model_rmse = round(np.sqrt(np.mean((actual_test - predictions)**2)), 1)
        persistence_rmse = round(compute_persistence_rmse(actual_test.tolist()), 1)

        pkl_path = MODLES_PATH / f"sarima_{season}.pkl"

        artifact_data = {
            "model_fit": model_fit,
            "model_rmse": model_rmse,
            "persistence_rmse": persistence_rmse
        }

        with open(pkl_path, "wb") as f:
            pickle.dump(artifact_data, f)
        
        print(f"Successfully saved {season} model to {pkl_path}")
        print(f"Model RMSE: {model_rmse}\nPersistnece RMSE: {persistence_rmse}")

if __name__ == "__main__":
    main()