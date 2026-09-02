"""
load_india_data.py

Loads the Kaggle "Air Quality Data in India" dataset (station_hour.csv)
and converts it into your project's SQLite database format.

Dataset source: kaggle.com/datasets/rohanrao/air-quality-data-in-india

Usage:
    1. Place station_hour.csv in the same folder as this script
    2. Run: python load_india_data.py
    3. Then: python train_model.py
    4. Then: python app.py
"""

import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime
import os

DB_PATH  = "air_quality.db"
CSV_PATH = os.path.join("archive", "station_hour.csv")


def load_csv():
    if not os.path.exists(CSV_PATH):
        archive_contents = os.listdir("archive") if os.path.exists("archive") else "archive folder not found"
        raise FileNotFoundError(
            f"\n'{CSV_PATH}' not found.\n"
            f"Contents of 'archive' folder: {archive_contents}\n"
            f"Contents of current folder: {os.listdir('.')}"
        )

    print(f"Loading {CSV_PATH} ...")
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} rows")
    print(f"Columns: {list(df.columns)}")
    return df


def clean_and_map(df):
    """
    Kaggle station_hour.csv columns include:
    StationId, Datetime, PM2.5, PM10, NO, NO2, NOx, NH3, CO, SO2, O3, Benzene, Toluene, Xylene, AQI, AQI_Bucket

    We map these to our project format:
        co2      ← estimated from NOx + CO  (proxy, since this dataset has no direct CO2 sensor)
        voc      ← Benzene + Toluene (VOC family compounds)
        co       ← CO column directly
        temp     ← not in dataset, we'll simulate realistic values
        humidity ← not in dataset, we'll simulate realistic values
        node_id  ← StationId (so each real station becomes one of your "nodes")
    """
    print("\nCleaning and mapping columns...")

    # Keep only rows with the columns we need
    required = ["StationId", "Datetime", "CO", "NOx", "Benzene", "Toluene"]
    available = [c for c in required if c in df.columns]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"Warning: missing columns {missing}, will estimate where possible")

    df = df.copy()

    # Drop rows where ALL pollutant values are missing
    pollutant_cols = [c for c in ["CO", "NOx", "Benzene", "Toluene", "PM2.5"] if c in df.columns]
    df.dropna(subset=pollutant_cols, how="all", inplace=True)

    # Fill remaining NaNs with column median (keeps data usable, avoids dropping too many rows)
    for col in pollutant_cols:
        df[col] = df[col].fillna(df[col].median())

    # ── Build our 5 features ───────────────────────────────────────────────────
    out = pd.DataFrame()
    out["node_id"]   = df["StationId"].astype(str)
    out["timestamp"] = pd.to_datetime(df["Datetime"], errors="coerce")

    # CO directly available (mg/m3 in this dataset, already close to our range)
    out["co"] = df["CO"].clip(0, 50) if "CO" in df.columns else np.random.uniform(1, 10, len(df))

    # CO2 estimate: NOx is a good proxy for combustion-related CO2 (traffic, industry)
    if "NOx" in df.columns:
        out["co2"] = (450 + df["NOx"].clip(0, 200) * 5).clip(400, 3000)
    else:
        out["co2"] = np.random.uniform(450, 1200, len(df))

    # VOC estimate: Benzene + Toluene are classic VOCs, scale to mg/m3 range
    voc_sum = pd.Series(0, index=df.index, dtype=float)
    if "Benzene" in df.columns:
        voc_sum += df["Benzene"].clip(0, 50)
    if "Toluene" in df.columns:
        voc_sum += df["Toluene"].clip(0, 50)
    out["voc"] = (voc_sum / 100).clip(0.01, 2.0)

    # Temp & humidity not in this dataset — simulate realistic Indian climate values
    # tied to the hour of day for a believable daily pattern
    hours = out["timestamp"].dt.hour.fillna(12)
    out["temp"]     = (27 + 6 * np.sin((hours - 6) / 24 * 2 * np.pi)).round(1)
    out["humidity"] = (70 - 15 * np.sin((hours - 6) / 24 * 2 * np.pi)).round(1)
    out["humidity"] = out["humidity"].clip(30, 95)

    out.dropna(subset=["timestamp"], inplace=True)

    print(f"Cleaned dataset: {len(out)} usable rows")
    print(f"Unique stations found: {out['node_id'].nunique()}")
    return out


def pick_top_stations(df, n=2):
    """
    The dataset has many stations across India. We pick the top N
    with the most complete data to act as your 'nodeA' and 'nodeB'.
    """
    counts = df["node_id"].value_counts()
    top_stations = counts.head(n).index.tolist()
    print(f"\nSelected stations (most data available): {top_stations}")

    filtered = df[df["node_id"].isin(top_stations)].copy()

    # Rename to your project's node naming convention
    rename_map = {station: f"node{chr(65+i)}" for i, station in enumerate(top_stations)}
    filtered["node_id"] = filtered["node_id"].map(rename_map)

    print(f"Renamed to: {list(rename_map.values())}")
    return filtered


def save_to_db(df):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS readings (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT    NOT NULL,
            node_id   TEXT    NOT NULL,
            co2       REAL,
            voc       REAL,
            co        REAL,
            temp      REAL,
            humidity  REAL
        )
    """)

    inserted = 0
    for _, row in df.iterrows():
        conn.execute("""
            INSERT INTO readings (timestamp, node_id, co2, voc, co, temp, humidity)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            row["timestamp"].isoformat(),
            row["node_id"],
            round(float(row["co2"]), 1),
            round(float(row["voc"]), 3),
            round(float(row["co"]), 1),
            round(float(row["temp"]), 1),
            round(float(row["humidity"]), 1),
        ))
        inserted += 1

    conn.commit()
    conn.close()
    print(f"\nSaved {inserted} readings to {DB_PATH}")


if __name__ == "__main__":
    print("=" * 55)
    print("Loading Kaggle 'Air Quality Data in India' dataset")
    print("=" * 55)

    df = load_csv()
    df = clean_and_map(df)
    df = pick_top_stations(df, n=2)   # change n=3 if you want a 3rd node

    print("\nSample of converted data:")
    print(df.head(10).to_string(index=False))

    save_to_db(df)

    print("\n" + "=" * 55)
    print("Done! Next steps:")
    print("  python train_model.py   ← train IsolationForest")
    print("  python app.py           ← start Flask server")
    print("=" * 55)