from pydantic import BaseModel
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import os
from dotenv import load_dotenv
from pathlib import Path
import requests
import datetime

# Load env from parent .env.local
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

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

@app.get("/area-risk")
def get_area_risk(location: str):
    lat, lon = geocode_location(location)
    
    if lat is None:
        return {
            "riskLevel": "Unknown",
            "liveRain": 0,
            "riskScore": 0,
            "humidity": 0,
            "warnings": ["Location not found"],
            "heatmapPoints": []
        }

    current_month = datetime.datetime.now().month
    
    # Prepare features for model: [lat, lng, month, 0, 1000, 0]
    X = [[lat, lon, current_month, 0, 1000, 0]]
    
    rain, humidity = get_live_weather(lat, lon)
    
    try:
        proba = clf.predict_proba(X)[0]
        
        # Handle probability
        if len(proba) == 1:
            base_risk = proba[0]
        else:
            # Assuming class 1 is high risk
            base_risk = proba[1]
            
        rain_factor = 1 + min(rain / 10, 1)
        risk_score_val = base_risk * rain_factor * 10
        risk_score_val = min(max(risk_score_val, 0), 10)
        
        if risk_score_val > 8:
            risk_level = "High"
        elif risk_score_val > 4:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
        warnings = []
        if rain > 0:
            warnings.append(f"Active rainfall: {rain} mm/h")
        if risk_level == "High":
            warnings.append("High waterlogging risk detected")
        if humidity > 80:
            warnings.append("High humidity levels")
        if not warnings:
            warnings.append("No immediate alerts")

        heatmap_points = [
            {"lat": lat, "lng": lon, "intensity": risk_score_val / 10},
            {"lat": lat + 0.001, "lng": lon + 0.001, "intensity": (risk_score_val / 10) * 0.8},
            {"lat": lat - 0.001, "lng": lon - 0.001, "intensity": (risk_score_val / 10) * 0.9},
        ]

        return {
            "riskLevel": risk_level,
            "liveRain": round(rain, 1),
            "riskScore": round(risk_score_val, 1),
            "humidity": humidity,
            "warnings": warnings,
            "heatmapPoints": heatmap_points
        }

    except Exception as e:
        print("Prediction failed:", e)
        return {
            "riskLevel": "Error",
            "liveRain": 0,
            "riskScore": 0,
            "humidity": 0,
            "warnings": ["Analysis failed"],
            "heatmapPoints": []
        }

class Route(BaseModel):
    coordinates: List[List[float]]  # [[lat, lng], ...]

class RouteRequest(BaseModel):
    routes: List[Route]
    mode: str  # "live" or "monsoon"

def geocode_location(location_name):
    try:
        api_key = os.getenv("OPENWEATHER_API_KEY")
        if not api_key:
            print("API Key missing")
            return None, None
            
        url = f"http://api.openweathermap.org/geo/1.0/direct?q={location_name}&limit=1&appid={api_key}"
        res = requests.get(url, timeout=5)
        data = res.json()
        if data:
            return data[0]['lat'], data[0]['lon']
        return None, None
    except Exception as e:
        print("Geocoding failed:", e)
        return None, None

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

    insights = []

    if avg_rain > 5:
        insights.append("Heavy rainfall detected along the route")

    if exposure > 0.4:
        insights.append("Large portion of the route passes through flood-prone areas")

    if route_len > 120:
        insights.append("Longer route increases exposure to waterlogging")

    if month >= 7:
        insights.append("Monsoon season amplifies flood risk")

    print("Insights:", insights)

    return {
        "risk_level": risk_level,
        "severity": round(final_severity, 2),
        "insights": insights
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
            "severity": pred["severity"],
            "insights": pred["insights"]
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
