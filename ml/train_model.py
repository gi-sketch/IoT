"""
train_model.py
Run this after collecting/loading sensor data into air_quality.db.
Trains an IsolationForest on the readings and saves the model into ml/ folder
so it sits next to detector.py.

Usage:
    python train_model.py
"""

import os
import sqlite3
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

DB_PATH = "air_quality.db"

# Save model files inside ml/ folder so detector.py (which lives there) finds them
ML_DIR      = "ml"
MODEL_PATH  = os.path.join(ML_DIR, "anomaly_model.pkl")
SCALER_PATH = os.path.join(ML_DIR, "scaler.pkl")

FEATURES = ["co2", "voc", "co", "temp", "humidity"]

# IsolationForest contamination = expected fraction of anomalies in training data.
CONTAMINATION = 0.05


def load_data():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(
        f"SELECT {', '.join(FEATURES)} FROM readings", conn
    )
    conn.close()
    return df


def train():
    os.makedirs(ML_DIR, exist_ok=True)

    print("Loading data...")
    df = load_data()

    df.dropna(subset=FEATURES, inplace=True)
    print(f"Training on {len(df)} readings.")

    if len(df) < 100:
        print("WARNING: Less than 100 readings. Collect/load more data for a reliable model.")

    if len(df) == 0:
        print("ERROR: No data found in air_quality.db.")
        print("Run load_india_data.py (or simulate.py) first to populate the database.")
        return

    X = df[FEATURES].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=100,
        contamination=CONTAMINATION,
        random_state=42
    )
    model.fit(X_scaled)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)

    print(f"Model saved to {MODEL_PATH}")
    print(f"Scaler saved to {SCALER_PATH}")

    scores = model.decision_function(X_scaled)
    preds  = model.predict(X_scaled)
    n_anomalies = (preds == -1).sum()
    print(f"Anomalies detected in training set: {n_anomalies} / {len(df)} ({100*n_anomalies/len(df):.1f}%)")
    print("Training complete.")


if __name__ == "__main__":
    train()