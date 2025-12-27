from pydantic import BaseModel
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import os

clf = joblib.load("flood_risk_classifier.pkl")
reg = joblib.load("flood_severity_regressor.pkl")

app = FastAPI()

# allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ok for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is alive 🚀"}

@app.get("/health")
def health_check():
    return {"status": "OK"}

@app.get("/safe-route")
def get_safe_route(start: str, destination: str, mode: str = "live"):
    """
    mode:
    - live → current conditions
    - preparedness → monsoon preparedness (higher risk weight)
    """

    if mode == "preparedness":
        risk_weight = 1.5
    else:
        risk_weight = 1.0

    return {
        "start": start,
        "destination": destination,
        "mode": mode,
        "routes": [
            {
                "route_name": "Route A",
                "risk_level": "HIGH",
                "reason": "Passes through flood-prone area",
                "color": "red",
                "risk_weight_used": risk_weight
            },
            {
                "route_name": "Route B",
                "risk_level": "LOW",
                "reason": "Avoids historically flooded zones",
                "color": "green",
                "risk_weight_used": risk_weight
            }
        ]
    }

class Route(BaseModel):
    coordinates: List[List[float]]  # [[lat, lng], ...]

class RouteRequest(BaseModel):
    routes: List[Route]
    mode: str  # "live" or "monsoon"

import requests

def get_live_weather(lat, lon):
    try:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": os.getenv("OPENWEATHER_API_KEY"),
            "units": "metric"
        }

        res = requests.get(url, params=params, timeout=5)
        data = res.json()

        # If API error, fallback
        if "main" not in data:
            return 0.0, 0.0

        rain = 0.0
        if "rain" in data:
            rain = data["rain"].get("1h", 0.0)

        humidity = data["main"].get("humidity", 0.0)

        return rain, humidity

    except Exception as e:
        print("Weather API failed:", e)
        return 0.0, 0.0



def predict_route_risk(route_coords, month):
    risk_preds = []
    severity_preds = []
    route_len = len(route_coords)

    # sample every 5th point to reduce computation
    for lat, lng in route_coords[::10]:
        X = [[
            lat,
            lng,
            month,
            0,      # Main Cause Enc (unknown at inference)
            1000,   # Area Affected (default)
            0       # State Enc (unknown)
        ]]

        rain, humidity = get_live_weather(lat, lng)

        rain_factor = 1 + min(rain / 10, 1)
        proba = clf.predict_proba(X)[0]
        print("Classifier proba:", proba)

        # if only one class was trained
        if len(proba) == 1:
            risk = proba[0] * rain_factor
        else:
            risk = proba[1] * rain_factor

        print("Flood probability:", risk)

        severity = reg.predict(X)[0]

        risk_preds.append(risk)
        severity_preds.append(severity)

    max_risk = max(risk_preds)
    avg_risk = sum(risk_preds) / len(risk_preds)

    # exposure = how many points are risky
    exposure = sum(1 for r in risk_preds if r > 0.6) / len(risk_preds)

    # route penalty
    length_factor = 1.3 if route_len > 120 else 1.0

    final_risk = (0.6 * max_risk + 0.4 * avg_risk) * (1 + exposure) * length_factor


    if final_risk > 1.1:
        risk_level = 2      # HIGH
    elif final_risk > 0.7:
        risk_level = 1      # MEDIUM
    else:
        risk_level = 0      # LOW

    avg_severity = sum(severity_preds) / len(severity_preds)

    # 🔥 amplify with real factors
    avg_rain = sum(
        get_live_weather(lat, lng)[0]
        for lat, lng in route_coords[::10]
    ) / len(route_coords[::10])

    route_complexity = len(route_coords) / 100

    final_severity = avg_severity * (1 + avg_rain / 20) * route_complexity

    print("Route len:", route_len)
    print("Max risk:", max_risk)
    print("Avg risk:", avg_risk)
    print("Exposure:", exposure)
    print("Final risk:", final_risk)
    print("Severity:", avg_severity)

    return {
        "risk_level": risk_level,
        "severity": round(final_severity, 2)
    }



@app.post("/score-routes")
def score_routes(data: RouteRequest):
    results = []

    month = 7 if data.mode == "monsoon" else 4

    # 1️⃣ First: collect raw predictions
    for idx, route in enumerate(data.routes):
        pred = predict_route_risk(route.coordinates, month)

        results.append({
            "route_index": idx,
            "severity": pred["severity"],   # keep numeric
        })

    # 2️⃣ Find worst severity (baseline)
    max_severity = max(r["severity"] for r in results)

    # 3️⃣ Assign RELATIVE risk levels
    for r in results:
        ratio = r["severity"] / max_severity

        if ratio >= 0.9:
            r["risk_level"] = 2   # HIGH
        elif ratio >= 0.6:
            r["risk_level"] = 1   # MEDIUM
        else:
            r["risk_level"] = 0   # LOW

    # 4️⃣ Recommend safest route
    safest = min(results, key=lambda r: r["risk_level"])

    return {
        "mode": data.mode,
        "routes": results,
        "recommended_route": safest["route_index"]
    }
