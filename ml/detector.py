"""
ml/detector.py
Loads the trained IsolationForest and scores new readings in real time.
Called by app.py on every incoming sensor reading.

NOTE: This version uses co2, voc, co, temp, humidity
      (matches MQ-135 + MQ-7 + DHT22 sensor setup — no pm25/PM2.5 sensor)
"""

import os
import pickle
import numpy as np

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(BASE_DIR, "anomaly_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

FEATURES = ["co2", "voc", "co", "temp", "humidity"]

# Thresholds — tune these after you see your model's score distribution
SCORE_WARN   = -0.10   # anomaly score below this → WARN  (unusual but not critical)
SCORE_DANGER = -0.25   # anomaly score below this → DANGER (definite spike)

# WHO / safety reference thresholds used for plain-English explanations
WHO_LIMITS = {
    "co2": 1000.0,   # ppm    — above this = poor ventilation / elevated pollution
    "voc": 0.30,      # mg/m3  — general VOC safety guideline
    "co":  9.0,       # ppm    — WHO 8-hour CO guideline
}


class AnomalyDetector:
    def __init__(self):
        if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
            print(f"[WARNING] Model files not found at {BASE_DIR}.")
            print("Run train_model.py first. Detector will pass through "
                  "all readings as 'normal' until trained.")
            self.model  = None
            self.scaler = None
        else:
            with open(MODEL_PATH, "rb") as f:
                self.model = pickle.load(f)
            with open(SCALER_PATH, "rb") as f:
                self.scaler = pickle.load(f)
            print("Anomaly detector loaded successfully.")

    def score(self, reading: dict) -> dict:
        """
        reading: dict with keys co2, voc, co, temp, humidity
        Returns: {
            "anomaly":  bool,
            "level":    "normal" | "warn" | "danger",
            "score":    float,      # IsolationForest decision score
            "reason":   str         # human-readable explanation
        }
        """
        # If model isn't trained yet, pass everything through as normal
        if self.model is None or self.scaler is None:
            return {"anomaly": False, "level": "normal", "score": 0.0,
                     "reason": "Model not trained yet — run train_model.py"}

        # Build feature vector in the correct order, fill missing with 0
        try:
            x = np.array([[float(reading.get(f) or 0) for f in FEATURES]])
        except (KeyError, ValueError, TypeError) as e:
            return {"anomaly": False, "level": "normal", "score": 0.0,
                     "reason": f"Invalid reading data: {e}"}

        x_scaled = self.scaler.transform(x)
        score    = float(self.model.decision_function(x_scaled)[0])
        pred     = self.model.predict(x_scaled)[0]   # -1 or 1

        is_anomaly = pred == -1

        if score <= SCORE_DANGER:
            level = "danger"
        elif score <= SCORE_WARN:
            level = "warn"
        else:
            level = "normal"

        reason = self._explain(reading, score) if is_anomaly else "Within normal range"

        return {
            "anomaly": is_anomaly,
            "level":   level,
            "score":   round(score, 4),
            "reason":  reason,
        }

    def _explain(self, reading: dict, score: float) -> str:
        """
        Simple rule-based explanation on top of the ML flag.
        Tells the user WHICH sensor is likely driving the anomaly.
        """
        issues = []
        for pollutant, threshold in WHO_LIMITS.items():
            val = reading.get(pollutant)
            if val is None:
                continue
            val = float(val)
            if val > threshold:
                pct = int(100 * (val - threshold) / threshold)
                issues.append(f"{pollutant.upper()} {val:.2f} ({pct}% above limit)")

        if issues:
            return "High: " + ", ".join(issues)
        return f"Unusual combination of readings (score {score:.3f})"


# ── Singleton so Flask doesn't reload the model on every request ──────────────
_detector_instance = None

def get_detector() -> AnomalyDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = AnomalyDetector()
    return _detector_instance