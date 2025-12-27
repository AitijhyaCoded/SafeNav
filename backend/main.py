from pydantic import BaseModel
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import joblib
import os
from dotenv import load_dotenv
from pathlib import Path
import requests
import datetime
import aiofiles
import uuid
import google.generativeai as genai

# Load env from parent .env.local
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

# Configure Gemini
genai.configure(api_key="AIzaSyC6MVwkYVWlbt6laSZy53DXCtdUiaou5SU")

clf = joblib.load("flood_risk_classifier.pkl")
reg = joblib.load("flood_severity_regressor.pkl")

app = FastAPI()

# Mount uploads directory to serve images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ok for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for reports (replace with DB for production)
reports_db = []

class Report(BaseModel):
    id: str
    lat: float
    lng: float
    issue_type: str
    description: str
    image_url: Optional[str] = None
    timestamp: str

@app.post("/report-issue")
async def report_issue(
    lat: float = Form(...),
    lng: float = Form(...),
    issue_type: str = Form(...),
    description: str = Form(...),
    image: UploadFile = File(None)
):
    image_url = None
    if image:
        filename = f"{uuid.uuid4()}_{image.filename}"
        filepath = os.path.join("uploads", filename)
        async with aiofiles.open(filepath, 'wb') as out_file:
            content = await image.read()
            await out_file.write(content)
        image_url = f"http://localhost:8000/uploads/{filename}"
    
    report = {
        "id": str(uuid.uuid4()),
        "lat": lat,
        "lng": lng,
        "issue_type": issue_type,
        "description": description,
        "image_url": image_url,
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    reports_db.append(report)
    return {"message": "Report submitted successfully", "report": report}

@app.get("/reports")
def get_reports():
    return reports_db

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



def get_reports_on_route(route_coords, reports):
    on_route_reports = []
    # Use sampled points for efficiency (every 10th point)
    sampled_route = route_coords[::10]
    
    for report in reports:
        report_lat = report['lat']
        report_lng = report['lng']
        
        for r_lat, r_lng in sampled_route:
            # Approx distance check (0.001 deg ~ 111m)
            if abs(report_lat - r_lat) < 0.001 and abs(report_lng - r_lng) < 0.001:
                on_route_reports.append(report)
                break # Found a match for this report, move to next report
                
    return on_route_reports

def generate_gemini_summary(route_stats, hazards):
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        hazards_text = "None"
        if hazards:
            hazards_text = "\n".join([f"- {h['issue_type']}: {h['description']}" for h in hazards])
            
        prompt = f"""
        As a navigation assistant, analyze this route's safety based on the provided metrics and user reports.
        Provide 2-3 concise, helpful bullet points for the driver.
        
        Route Metrics:
        - Overall Risk Level: {route_stats['risk_level']} (0=Safe, 1=Caution, 2=High Risk)
        - Flood Severity Score: {route_stats['severity']} (Higher means more severe flooding)
        - Live Rain Intensity: {route_stats['rain']} mm/h
        
        User Reported Hazards (verified on route):
        {hazards_text}
        
        Guidelines:
        1. If hazards exist, prioritize warning the user about them.
        2. If NO hazards exist, explain the safety status based on rain and risk scores (e.g., "Route is clear with low flood risk", "Caution advised due to heavy rain").
        3. Keep it short and direct.
        4. The severity of both the best routes is stored in a list. Gemini compares the severity and generates summary based on the comparison of those routes. The better one should include some good recommendation about choosing the route. The better recommended route should not include anything bad about it (like severe flooding or anything).
        
        Output ONLY the bullet points as a list of strings. Do not include "Here is the summary" or markdown formatting like **.
        """
        
        response = model.generate_content(prompt)
        text = response.text
        
        # Clean up response to get a list of strings
        lines = [line.strip().lstrip('- ').strip() for line in text.split('\n') if line.strip()]
        return lines
    except Exception as e:
        print(f"Gemini Error: {e}")
        return ["AI Summary unavailable", "Check standard risk metrics"]

def predict_route_risk(route_coords, month):
    risk_preds = []
    severity_preds = []
    route_len = len(route_coords)

    # sample every 5th point to reduce computation
    sampled_coords = route_coords[::10]
    
    # Calculate average rain for the route
    total_rain = 0
    
    for lat, lng in sampled_coords:
        X = [[
            lat,
            lng,
            month,
            0,      # Main Cause Enc (unknown at inference)
            1000,   # Area Affected (default)
            0       # State Enc (unknown)
        ]]

        rain, humidity = get_live_weather(lat, lng)
        total_rain += rain

        rain_factor = 1 + min(rain / 10, 1)
        proba = clf.predict_proba(X)[0]
        # print("Classifier proba:", proba)

        # if only one class was trained
        if len(proba) == 1:
            risk = proba[0] * rain_factor
        else:
            risk = proba[1] * rain_factor

        # print("Flood probability:", risk)

        severity = reg.predict(X)[0]

        risk_preds.append(risk)
        severity_preds.append(severity)

    max_risk = max(risk_preds) if risk_preds else 0
    avg_risk = sum(risk_preds) / len(risk_preds) if risk_preds else 0

    # exposure = how many points are risky
    exposure = sum(1 for r in risk_preds if r > 0.6) / (len(risk_preds) if risk_preds else 1)

    # route penalty
    length_factor = 1.3 if route_len > 120 else 1.0

    final_risk = (0.6 * max_risk + 0.4 * avg_risk) * (1 + exposure) * length_factor


    if final_risk > 1.1:
        risk_level = 2      # HIGH
    elif final_risk > 0.7:
        risk_level = 1      # MEDIUM
    else:
        risk_level = 0      # LOW

    avg_severity = sum(severity_preds) / len(severity_preds) if severity_preds else 0

    avg_rain = total_rain / len(sampled_coords) if sampled_coords else 0

    route_complexity = len(route_coords) / 100

    final_severity = avg_severity * (1 + avg_rain / 20) * route_complexity

    # --- GEMINI INTEGRATION ---
    # 1. Find hazards on this route
    on_route_hazards = get_reports_on_route(route_coords, reports_db)
    
    # 2. Prepare stats for Gemini
    route_stats = {
        "risk_level": risk_level,
        "severity": round(final_severity, 2),
        "rain": round(avg_rain, 1),
        "length": route_len
    }
    
    # 3. Generate summary
    insights = generate_gemini_summary(route_stats, on_route_hazards)

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

# // ...existing code...

#############################


# def generate_gemini_summary(route_stats, hazards, is_recommended=False, comparison_text=""):
#     try:
#         model = genai.GenerativeModel('gemini-1.5-flash')
        
#         hazards_text = "None"
#         if hazards:
#             hazards_text = "\n".join([f"- {h['issue_type']}: {h['description']}" for h in hazards])
            
#         context_instruction = ""
#         if is_recommended:
#             context_instruction = """
#             THIS IS THE RECOMMENDED ROUTE. 
#             - Emphasize that this is the SAFEST choice among available options.
#             - Even if the risk score is high, frame it as "the best available path" or "least risky option".
#             - Do NOT discourage the user from taking this route unless it is absolutely impassable.
#             - Focus on why it's better than alternatives (e.g., "Avoids the most severe waterlogging found on other routes").
#             """
#         else:
#             context_instruction = """
#             THIS IS NOT THE RECOMMENDED ROUTE.
#             - Highlight why this route is riskier (e.g., "Higher flood severity", "More reported hazards").
#             - Suggest avoiding this route in favor of the recommended one.
#             """

#         prompt = f"""
#         As a navigation assistant, analyze this route's safety for a driver.
        
#         {context_instruction}
        
#         Comparison Context: {comparison_text}
        
#         Route Metrics:
#         - Risk Level: {route_stats['risk_level']} (0=Low, 1=Medium, 2=High)
#         - Flood Severity Score: {route_stats['severity']} (Lower is better)
#         - Live Rain Intensity: {route_stats['rain']} mm/h
        
#         User Reported Hazards (verified on route):
#         {hazards_text}
        
#         Guidelines:
#         1. Be concise. Provide 2-3 bullet points.
#         2. Use a helpful, reassuring tone for the recommended route.
#         3. Be direct about risks for non-recommended routes.
        
#         Output ONLY the bullet points as a list of strings. Do not include "Here is the summary" or markdown formatting like **.
#         """
        
#         response = model.generate_content(prompt)
#         text = response.text
        
#         # Clean up response to get a list of strings
#         lines = [line.strip().lstrip('- ').strip() for line in text.split('\n') if line.strip()]
#         return lines
#     except Exception as e:
#         print(f"Gemini Error: {e}")
#         return ["AI Summary unavailable", "Check standard risk metrics"]

# def predict_route_risk(route_coords, month):
#     risk_preds = []
#     severity_preds = []
#     route_len = len(route_coords)

#     # sample every 5th point to reduce computation
#     sampled_coords = route_coords[::10]
    
#     # Calculate average rain for the route
#     total_rain = 0
    
#     for lat, lng in sampled_coords:
#         X = [[
#             lat,
#             lng,
#             month,
#             0,      # Main Cause Enc (unknown at inference)
#             1000,   # Area Affected (default)
#             0       # State Enc (unknown)
#         ]]

#         rain, humidity = get_live_weather(lat, lng)
#         total_rain += rain

#         rain_factor = 1 + min(rain / 10, 1)
#         proba = clf.predict_proba(X)[0]
#         # print("Classifier proba:", proba)

#         # if only one class was trained
#         if len(proba) == 1:
#             risk = proba[0] * rain_factor
#         else:
#             risk = proba[1] * rain_factor

#         # print("Flood probability:", risk)

#         severity = reg.predict(X)[0]

#         risk_preds.append(risk)
#         severity_preds.append(severity)

#     max_risk = max(risk_preds) if risk_preds else 0
#     avg_risk = sum(risk_preds) / len(risk_preds) if risk_preds else 0

#     # exposure = how many points are risky
#     exposure = sum(1 for r in risk_preds if r > 0.6) / (len(risk_preds) if risk_preds else 1)

#     # route penalty
#     length_factor = 1.3 if route_len > 120 else 1.0

#     final_risk = (0.6 * max_risk + 0.4 * avg_risk) * (1 + exposure) * length_factor


#     if final_risk > 1.1:
#         risk_level = 2      # HIGH
#     elif final_risk > 0.7:
#         risk_level = 1      # MEDIUM
#     else:
#         risk_level = 0      # LOW

#     avg_severity = sum(severity_preds) / len(severity_preds) if severity_preds else 0

#     avg_rain = total_rain / len(sampled_coords) if sampled_coords else 0

#     route_complexity = len(route_coords) / 100

#     final_severity = avg_severity * (1 + avg_rain / 20) * route_complexity

#     # --- GEMINI PREP ---
#     # 1. Find hazards on this route
#     on_route_hazards = get_reports_on_route(route_coords, reports_db)
    
#     # 2. Prepare stats for Gemini (but don't call it yet)
#     route_stats = {
#         "risk_level": risk_level,
#         "severity": round(final_severity, 2),
#         "rain": round(avg_rain, 1),
#         "length": route_len
#     }
    
#     # Return data needed for scoring and summary
#     return {
#         "risk_level": risk_level,
#         "severity": round(final_severity, 2),
#         "stats": route_stats,
#         "hazards": on_route_hazards
#     }



# @app.post("/score-routes")
# def score_routes(data: RouteRequest):
#     temp_results = []
#     month = 7 if data.mode == "monsoon" else 4

#     # 1️⃣ First: collect raw predictions for ALL routes
#     for idx, route in enumerate(data.routes):
#         pred = predict_route_risk(route.coordinates, month)
#         temp_results.append({
#             "route_index": idx,
#             "severity": pred["severity"],
#             "stats": pred["stats"],
#             "hazards": pred["hazards"]
#         })

#     # 2️⃣ Find worst severity (baseline)
#     if not temp_results:
#         return {"mode": data.mode, "routes": [], "recommended_route": -1}

#     max_severity = max(r["severity"] for r in temp_results)
    
#     # Avoid division by zero
#     if max_severity == 0: max_severity = 1

#     # 3️⃣ Assign RELATIVE risk levels
#     for r in temp_results:
#         ratio = r["severity"] / max_severity

#         if ratio >= 0.9:
#             r["risk_level"] = 2   # HIGH
#         elif ratio >= 0.6:
#             r["risk_level"] = 1   # MEDIUM
#         else:
#             r["risk_level"] = 0   # LOW
            
#         # Update stats with the relative risk level so Gemini knows
#         r["stats"]["risk_level"] = r["risk_level"]

#     # 4️⃣ Recommend safest route (lowest severity)
#     safest_route = min(temp_results, key=lambda r: r["severity"])
#     safest_index = safest_route["route_index"]

#     # 5️⃣ Generate AI Insights (Now that we know which is best)
#     final_results = []
#     for r in temp_results:
#         is_recommended = (r["route_index"] == safest_index)
        
#         # Create comparison text
#         comparison_text = ""
#         if is_recommended:
#             others = [tr for tr in temp_results if tr["route_index"] != r["route_index"]]
#             if others:
#                 worst_other = max(others, key=lambda x: x["severity"])
#                 diff = worst_other["severity"] - r["severity"]
#                 if diff > 0:
#                     comparison_text = f"This route has a significantly lower flood severity score ({r['severity']}) compared to the alternative ({worst_other['severity']})."

#         insights = generate_gemini_summary(r["stats"], r["hazards"], is_recommended, comparison_text)
        
#         final_results.append({
#             "route_index": r["route_index"],
#             "severity": r["severity"],
#             "risk_level": r["risk_level"],
#             "insights": insights
#         })

#     return {
#         "mode": data.mode,
#         "routes": final_results,
#         "recommended_route": safest_index
#     }
# def generate_gemini_summary(route_stats, hazards, is_recommended=False, comparison_text=""):
#     try:
#         model = genai.GenerativeModel('gemini-1.5-flash')
        
#         hazards_text = "None"
#         if hazards:
#             hazards_text = "\n".join([f"- {h['issue_type']}: {h['description']}" for h in hazards])
            
#         context_instruction = ""
#         if is_recommended:
#             context_instruction = """
#             THIS IS THE RECOMMENDED ROUTE. 
#             - Emphasize that this is the SAFEST choice among available options.
#             - Even if the risk score is high, frame it as "the best available path" or "least risky option".
#             - Do NOT discourage the user from taking this route unless it is absolutely impassable.
#             - Focus on why it's better than alternatives (e.g., "Avoids the most severe waterlogging found on other routes").
#             """
#         else:
#             context_instruction = """
#             THIS IS NOT THE RECOMMENDED ROUTE.
#             - Highlight why this route is riskier (e.g., "Higher flood severity", "More reported hazards").
#             - Suggest avoiding this route in favor of the recommended one.
#             """

#         prompt = f"""
#         As a navigation assistant, analyze this route's safety for a driver.
        
#         {context_instruction}
        
#         Comparison Context: {comparison_text}
        
#         Route Metrics:
#         - Risk Level: {route_stats['risk_level']} (0=Low, 1=Medium, 2=High)
#         - Flood Severity Score: {route_stats['severity']} (Lower is better)
#         - Live Rain Intensity: {route_stats['rain']} mm/h
        
#         User Reported Hazards (verified on route):
#         {hazards_text}
        
#         Guidelines:
#         1. Be concise. Provide 2-3 bullet points.
#         2. Use a helpful, reassuring tone for the recommended route.
#         3. Be direct about risks for non-recommended routes.
        
#         Output ONLY the bullet points as a list of strings. Do not include "Here is the summary" or markdown formatting like **.
#         """
        
#         response = model.generate_content(prompt)
#         text = response.text
        
#         # Clean up response to get a list of strings
#         lines = [line.strip().lstrip('- ').strip() for line in text.split('\n') if line.strip()]
#         return lines
#     except Exception as e:
#         print(f"Gemini Error: {e}")
#         return ["AI Summary unavailable", "Check standard risk metrics"]

# def predict_route_risk(route_coords, month):
#     risk_preds = []
#     severity_preds = []
#     route_len = len(route_coords)

#     # sample every 5th point to reduce computation
#     sampled_coords = route_coords[::10]
    
#     # Calculate average rain for the route
#     total_rain = 0
    
#     for lat, lng in sampled_coords:
#         X = [[
#             lat,
#             lng,
#             month,
#             0,      # Main Cause Enc (unknown at inference)
#             1000,   # Area Affected (default)
#             0       # State Enc (unknown)
#         ]]

#         rain, humidity = get_live_weather(lat, lng)
#         total_rain += rain

#         rain_factor = 1 + min(rain / 10, 1)
#         proba = clf.predict_proba(X)[0]
#         # print("Classifier proba:", proba)

#         # if only one class was trained
#         if len(proba) == 1:
#             risk = proba[0] * rain_factor
#         else:
#             risk = proba[1] * rain_factor

#         # print("Flood probability:", risk)

#         severity = reg.predict(X)[0]

#         risk_preds.append(risk)
#         severity_preds.append(severity)

#     max_risk = max(risk_preds) if risk_preds else 0
#     avg_risk = sum(risk_preds) / len(risk_preds) if risk_preds else 0

#     # exposure = how many points are risky
#     exposure = sum(1 for r in risk_preds if r > 0.6) / (len(risk_preds) if risk_preds else 1)

#     # route penalty
#     length_factor = 1.3 if route_len > 120 else 1.0

#     final_risk = (0.6 * max_risk + 0.4 * avg_risk) * (1 + exposure) * length_factor


#     if final_risk > 1.1:
#         risk_level = 2      # HIGH
#     elif final_risk > 0.7:
#         risk_level = 1      # MEDIUM
#     else:
#         risk_level = 0      # LOW

#     avg_severity = sum(severity_preds) / len(severity_preds) if severity_preds else 0

#     avg_rain = total_rain / len(sampled_coords) if sampled_coords else 0

#     route_complexity = len(route_coords) / 100

#     final_severity = avg_severity * (1 + avg_rain / 20) * route_complexity

#     # --- GEMINI PREP ---
#     # 1. Find hazards on this route
#     on_route_hazards = get_reports_on_route(route_coords, reports_db)
    
#     # 2. Prepare stats for Gemini (but don't call it yet)
#     route_stats = {
#         "risk_level": risk_level,
#         "severity": round(final_severity, 2),
#         "rain": round(avg_rain, 1),
#         "length": route_len
#     }
    
#     # Return data needed for scoring and summary
#     return {
#         "risk_level": risk_level,
#         "severity": round(final_severity, 2),
#         "stats": route_stats,
#         "hazards": on_route_hazards
#     }



# @app.post("/score-routes")
# def score_routes(data: RouteRequest):
#     temp_results = []
#     month = 7 if data.mode == "monsoon" else 4

#     # 1️⃣ First: collect raw predictions for ALL routes
#     for idx, route in enumerate(data.routes):
#         pred = predict_route_risk(route.coordinates, month)
#         temp_results.append({
#             "route_index": idx,
#             "severity": pred["severity"],
#             "stats": pred["stats"],
#             "hazards": pred["hazards"]
#         })

#     # 2️⃣ Find worst severity (baseline)
#     if not temp_results:
#         return {"mode": data.mode, "routes": [], "recommended_route": -1}

#     max_severity = max(r["severity"] for r in temp_results)
    
#     # Avoid division by zero
#     if max_severity == 0: max_severity = 1

#     # 3️⃣ Assign RELATIVE risk levels
#     for r in temp_results:
#         ratio = r["severity"] / max_severity

#         if ratio >= 0.9:
#             r["risk_level"] = 2   # HIGH
#         elif ratio >= 0.6:
#             r["risk_level"] = 1   # MEDIUM
#         else:
#             r["risk_level"] = 0   # LOW
            
#         # Update stats with the relative risk level so Gemini knows
#         r["stats"]["risk_level"] = r["risk_level"]

#     # 4️⃣ Recommend safest route (lowest severity)
#     safest_route = min(temp_results, key=lambda r: r["severity"])
#     safest_index = safest_route["route_index"]

#     # 5️⃣ Generate AI Insights (Now that we know which is best)
#     final_results = []
#     for r in temp_results:
#         is_recommended = (r["route_index"] == safest_index)
        
#         # Create comparison text
#         comparison_text = ""
#         if is_recommended:
#             others = [tr for tr in temp_results if tr["route_index"] != r["route_index"]]
#             if others:
#                 worst_other = max(others, key=lambda x: x["severity"])
#                 diff = worst_other["severity"] - r["severity"]
#                 if diff > 0:
#                     comparison_text = f"This route has a significantly lower flood severity score ({r['severity']}) compared to the alternative ({worst_other['severity']})."

#         insights = generate_gemini_summary(r["stats"], r["hazards"], is_recommended, comparison_text)
        
#         final_results.append({
#             "route_index": r["route_index"],
#             "severity": r["severity"],
#             "risk_level": r["risk_level"],
#             "insights": insights
#         })

#     return {
#         "mode": data.mode,
# "routes": final_results,
# "recommended_route": safest_index
# }