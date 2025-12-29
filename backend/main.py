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
import heapq
import math
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load env from parent .env.local
# env_path = Path(__file__).parent.parent / '.env.local'
# load_dotenv(dotenv_path=env_path)
from dotenv import load_dotenv
load_dotenv()


logger.info("🚀 Starting SafeNav Backend...")
logger.info(f"Loading environment from: {load_dotenv()}")

# Configure Gemini
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")
genai.configure(api_key=gemini_api_key)
logger.info("✓ Gemini API configured")

logger.info("Loading ML models...")
clf = joblib.load("flood_risk_classifier.pkl")
logger.info("✓ Flood risk classifier loaded")
reg = joblib.load("flood_severity_regressor.pkl")
logger.info("✓ Flood severity regressor loaded")

app = FastAPI()
logger.info("✓ FastAPI app initialized")

# Mount uploads directory to serve images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:3000","*"],  # ok for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("✓ CORS middleware configured")

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("🎉 SafeNav Backend is READY!")
    logger.info("=" * 60)
    logger.info("📍 Endpoints available:")
    logger.info("   GET  /health - Health check")
    logger.info("   GET  /area-risk - Area risk assessment")
    logger.info("   POST /score-routes - Standard route scoring")
    logger.info("   POST /dijkstra-multi-route - Dijkstra optimal path")
    logger.info("   POST /report-issue - Report flood hazard")
    logger.info("   GET  /reports - Get all reports")
    logger.info("=" * 60)

# In-memory storage for reports (replace with DB for production)
reports_db = []

# Weather cache to avoid repeated API calls
weather_cache = {}
weather_cache_timeout = 300  # 5 minutes

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
    logger.info("📍 Root endpoint accessed")
    return {"message": "Backend is alive 🚀"}

@app.get("/health")
def health_check():
    logger.info("💚 Health check accessed")
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

class DijkstraRequest(BaseModel):
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

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in kilometers"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def predict_point_risk(lat, lng, month):
    """Predict flood risk for a single point"""
    try:
        X = [[lat, lng, month, 0, 1000, 0]]
        
        rain, humidity = get_live_weather(lat, lng)
        rain_factor = 1 + min(rain / 10, 1)
        
        proba = clf.predict_proba(X)[0]
        risk = proba[1] if len(proba) > 1 else proba[0]
        risk = risk * rain_factor
        
        severity = reg.predict(X)[0]
        
        return risk, severity, rain
    except Exception as e:
        print(f"Risk prediction error: {e}")
        return 0.5, 1.0, 0.0

def dijkstra_shortest_safest_path(all_routes, month):
    """
    Dijkstra's algorithm to find shortest + safest path across multiple routes
    
    Edge weight = distance × (1 + risk_factors)
    This balances shortest distance with flood safety
    """
    logger.info("    Building graph from route points...")
    # Build graph from all route points
    graph = {}
    all_points = []
    point_to_idx = {}
    
    # Collect all unique points from all routes
    for route in all_routes:
        for point in route:
            point_tuple = (round(point[0], 6), round(point[1], 6))
            if point_tuple not in point_to_idx:
                idx = len(all_points)
                point_to_idx[point_tuple] = idx
                all_points.append(point)
                graph[idx] = []
    
    logger.info(f"    Graph has {len(all_points)} unique points")
    logger.info("    Calculating edge weights with flood risk...")
    
    # Build edges within each route
    edge_count = 0
    for route in all_routes:
        # Optimization: If route is very long (>500 points), sample to reduce graph size?
        # For now, we rely on weather caching to speed up edge weight calculation.
        
        for i in range(len(route) - 1):
            p1 = (round(route[i][0], 6), round(route[i][1], 6))
            p2 = (round(route[i+1][0], 6), round(route[i+1][1], 6))
            
            idx1 = point_to_idx[p1]
            idx2 = point_to_idx[p2]
            
            # Calculate edge weight: distance × risk_weight
            lat1, lng1 = all_points[idx1]
            lat2, lng2 = all_points[idx2]
            
            distance = haversine_distance(lat1, lng1, lat2, lng2)
            
            # Get flood risk for this segment
            risk, severity, rain = predict_point_risk(lat2, lng2, month)
            
            # Weight formula: distance × (1 + risk_factors)
            # Higher risk = higher weight = avoid this edge
            risk_weight = 1.0 + (risk * 5) + (severity * 0.5) + (min(rain/10, 1) * 0.3)
            edge_weight = distance * risk_weight
            
            # Add bidirectional edges
            graph[idx1].append((idx2, edge_weight))
            graph[idx2].append((idx1, edge_weight))
            edge_count += 2
            
    logger.info(f"    Graph built with {edge_count} edges")
    logger.info("    Running Dijkstra's algorithm...")
    
    # Run Dijkstra from start to end
    start_idx = 0  # First point of first route
    end_idx = point_to_idx[(round(all_routes[0][-1][0], 6), round(all_routes[0][-1][1], 6))]
    
    # Priority queue: (distance, node)
    pq = [(0, start_idx)]
    distances = {i: float('inf') for i in range(len(all_points))}
    distances[start_idx] = 0
    previous = {i: None for i in range(len(all_points))}
    visited = set()
    
    while pq:
        current_dist, current = heapq.heappop(pq)
        
        if current in visited:
            continue
            
        visited.add(current)
        
        if current == end_idx:
            logger.info(f"    Path found! Visited {len(visited)} nodes")
            break
        
        for neighbor, weight in graph[current]:
            distance = current_dist + weight
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current
                heapq.heappush(pq, (distance, neighbor))
    
    # Reconstruct path
    if distances[end_idx] == float('inf'):
        logger.warning("    No path found to destination!")
        return None, float('inf')
    
    path = []
    current = end_idx
    while current is not None:
        path.append(all_points[current])
        current = previous[current]
    
    path.reverse()
    logger.info(f"    Optimal path has {len(path)} points")
    
    return path, distances[end_idx]

def get_live_weather(lat, lon):
    # Round to 2 decimal places (~1.1km) for caching to group nearby points
    cache_key = (round(lat, 2), round(lon, 2))
    current_time = datetime.datetime.now().timestamp()
    
    if cache_key in weather_cache:
        cached_data, timestamp = weather_cache[cache_key]
        if current_time - timestamp < weather_cache_timeout:
            return cached_data

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
            logger.warning(f"Weather API error for ({lat}, {lon}): {data}")
            return 0.0, 0.0

        rain = 0.0
        if "rain" in data:
            rain = data["rain"].get("1h", 0.0)

        humidity = data["main"].get("humidity", 0.0)
        
        # Update cache
        weather_cache[cache_key] = ((rain, humidity), current_time)

        return rain, humidity

    except Exception as e:
        logger.error(f"Weather API failed for ({lat}, {lon}): {e}")
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

def generate_fallback_summary(route_stats, hazards, is_recommended=False):
    """Generate hardcoded but varied summaries based on route severity and risk level"""
    import random
    
    risk_level = route_stats.get('risk_level', 0)
    severity = route_stats.get('severity', 0)
    rain = route_stats.get('rain', 0)
    
    # Hazards present
    if hazards:
        hazard_types = [h.get('issue_type', 'hazard') for h in hazards]
        hazard_list = ", ".join(hazard_types)
        
        if is_recommended:
            recommended_with_hazards = [
                [f"⚠️ {len(hazards)} reported hazard(s) on this route ({hazard_list})", 
                 "Despite hazards, this is still the safest option available",
                 "Exercise caution and reduce speed when passing hazard zones"],
                [f"{len(hazards)} user-reported incidents detected",
                 "Best available route when hazards are accounted for",
                 "Monitor conditions closely and follow local advisories"],
                [f"Active hazards present: {hazard_list}",
                 "Recommended despite challenges - has lowest overall risk",
                 "Proceed with enhanced awareness and slower speeds"]
            ]
            return random.choice(recommended_with_hazards)
        else:
            non_recommended_with_hazards = [
                [f"Multiple hazards reported: {hazard_list}",
                 f"Severity score ({severity:.2f}) is significantly higher than alternatives",
                 "Consider the recommended route for safer travel"],
                [f"{len(hazards)} incidents documented on this path",
                 "Higher risk route with more reported issues",
                 "Switch to the recommended alternative for better safety"],
                [f"Hazard zones detected: {hazard_list}",
                 "This route carries higher risk than available alternatives",
                 "Recommended route is the safer choice"]
            ]
            return random.choice(non_recommended_with_hazards)
    
    # No hazards - generate based on risk level and severity
    if is_recommended:
        if risk_level == 0:  # LOW RISK
            low_risk_recommended = [
                ["Clear conditions on this route", "Low flood risk expected", "Safe to proceed with normal precautions"],
                ["Excellent route choice with minimal flood hazard", "Conditions are favorable for travel", "Proceed confidently"],
                ["This route is the safest option", "Low risk of flooding or water accumulation", "Recommended for best safety"]
            ]
            return random.choice(low_risk_recommended)
        elif risk_level == 1:  # MEDIUM RISK
            med_risk_recommended = [
                ["Moderate conditions expected on route", "This is the better option between available routes", "Caution advised due to rain intensity"],
                ["Best choice with manageable risk level", "Some caution needed but lower risk than alternatives", "Monitor weather conditions"],
                ["This route has moderate hazard potential", "Still the safest available option", "Drive cautiously and stay alert"]
            ]
            return random.choice(med_risk_recommended)
        else:  # HIGH RISK
            high_risk_recommended = [
                ["High risk conditions detected", "This is the least risky available route", "Extreme caution required - consider delaying trip"],
                ["Severe flood risk on all routes", "This option is the safest available", "Only proceed if absolutely necessary"],
                ["Critical conditions present", "Recommended as best available choice", "Strong advisory to delay travel if possible"]
            ]
            return random.choice(high_risk_recommended)
    else:
        if risk_level == 0:  # LOW RISK
            low_risk_alt = [
                ["Low risk on this route", "Alternative route has better safety metrics", "Recommended route is preferred"],
                ["Generally safe conditions", "Not recommended compared to the alternative", "Consider the other route option"],
                ["Clear path but not optimal", "The other route is safer", "Switch routes for better protection"]
            ]
            return random.choice(low_risk_alt)
        elif risk_level == 1:  # MEDIUM RISK
            med_risk_alt = [
                [f"Moderate risk with severity score {severity:.2f}", "The other route is safer", "Switch for better conditions"],
                ["Caution advised on this path", "Not the recommended choice", "Alternative route is preferable"],
                ["Some flood risk expected", "Other route has lower severity", "Choose the recommended alternative"]
            ]
            return random.choice(med_risk_alt)
        else:  # HIGH RISK
            high_risk_alt = [
                [f"High severity score ({severity:.2f}) on this route", "Significantly riskier than the alternative", "Strongly avoid - use recommended route"],
                ["Serious flood hazard on this path", "Much safer alternative available", "Do not use this route"],
                ["Critical risk level detected", "Highly risky compared to recommended route", "Switch to the safer alternative immediately"]
            ]
            return random.choice(high_risk_alt)

def generate_gemini_summary(route_stats, hazards, is_recommended=False):
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
        error_msg = str(e)
        if "API key" in error_msg or "403" in error_msg:
            logger.error(f"Gemini API Key Error: {error_msg}. Please check your GEMINI_API_KEY in .env")
        else:
            logger.warning(f"Gemini API Error: {e}, using fallback summaries")
        return generate_fallback_summary(route_stats, hazards, is_recommended)

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
    
    # 3. Generate summary (without is_recommended context - will be regenerated with context later)
    insights = generate_gemini_summary(route_stats, on_route_hazards, False)

    return {
        "risk_level": risk_level,
        "severity": round(final_severity, 2),
        "insights": insights,
        "route_stats": route_stats,
        "hazards": on_route_hazards
    }



@app.post("/score-routes")
def score_routes(data: RouteRequest):
    logger.info(f"📊 Score-routes called: mode={data.mode}, routes={len(data.routes)}")
    start_time = datetime.datetime.now()
    
    results = []

    month = 7 if data.mode == "monsoon" else 4

    # 1️⃣ First: collect raw predictions
    for idx, route in enumerate(data.routes):
        logger.info(f"  Analyzing route {idx+1}/{len(data.routes)} ({len(route.coordinates)} points)...")
        pred = predict_route_risk(route.coordinates, month)

        results.append({
            "route_index": idx,
            "severity": pred["severity"],
            "risk_level": pred["risk_level"],
            "insights": pred["insights"],
            "route_stats": pred.get("route_stats"),
            "hazards": pred.get("hazards", [])
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
    safest = min(results, key=lambda r: r["severity"])
    safest_index = safest["route_index"]
    
    # 5️⃣ Regenerate insights with is_recommended flag for context-aware summaries
    final_results = []
    for r in results:
        is_recommended = (r["route_index"] == safest_index)
        insights = generate_gemini_summary(r["route_stats"], r["hazards"], is_recommended)
        
        final_results.append({
            "route_index": r["route_index"],
            "severity": r["severity"],
            "risk_level": r["risk_level"],
            "insights": insights
        })

    elapsed = (datetime.datetime.now() - start_time).total_seconds()
    logger.info(f"✓ Score-routes completed in {elapsed:.2f}s - Recommended: Route {safest_index+1}")

    return {
        "mode": data.mode,
        "routes": final_results,
        "recommended_route": safest_index
    }

@app.post("/dijkstra-multi-route")
def dijkstra_multi_route(data: DijkstraRequest):
    """
    Use Dijkstra's algorithm to find optimal path across multiple routes
    Balances shortest distance with flood safety
    """
    logger.info(f"🎯 Dijkstra-multi-route called: mode={data.mode}, routes={len(data.routes)}")
    start_time = datetime.datetime.now()
    
    try:
        month = 7 if data.mode == "monsoon" else 4
        
        # Extract coordinates from all routes
        all_routes = [route.coordinates for route in data.routes]
        total_points = sum(len(r) for r in all_routes)
        logger.info(f"  Total route points: {total_points}")
        
        # Run Dijkstra to find optimal path
        logger.info("  Running Dijkstra's algorithm...")
        optimal_path, total_risk = dijkstra_shortest_safest_path(all_routes, month)
        
        if optimal_path is None:
            logger.warning("  ⚠️ No path found!")
            return {
                "success": False,
                "message": "No path found",
                "path": [],
                "total_risk": 0,
                "distance_km": 0,
                "risk_level": "UNKNOWN",
                "insights": ["Unable to find safe route"],
                "mode": data.mode
            }
        
        logger.info(f"  Optimal path found: {len(optimal_path)} points")
        
        # Calculate total distance
        total_distance = 0
        for i in range(len(optimal_path) - 1):
            lat1, lng1 = optimal_path[i]
            lat2, lng2 = optimal_path[i + 1]
            total_distance += haversine_distance(lat1, lng1, lat2, lng2)
        
        # Determine risk level
        avg_risk = total_risk / len(optimal_path) if optimal_path else 0
        if avg_risk > 2.5:
            risk_level = "HIGH"
        elif avg_risk > 1.5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        logger.info(f"  Distance: {total_distance:.2f}km, Risk: {risk_level}")
        
        # Generate insights
        insights = [
            f"Optimal path found using Dijkstra's algorithm",
            f"Total distance: {total_distance:.2f} km",
            f"Risk level: {risk_level}"
        ]
        
        if data.mode == "monsoon":
            insights.append("Optimized for monsoon conditions with higher safety priority")
        else:
            insights.append("Optimized for current weather conditions")
        
        # Check for hazards on route
        on_route_hazards = get_reports_on_route(optimal_path, reports_db)
        if on_route_hazards:
            insights.append(f"⚠️ {len(on_route_hazards)} reported hazard(s) on route")
        else:
            insights.append("✓ No reported hazards on this route")
        
        elapsed = (datetime.datetime.now() - start_time).total_seconds()
        logger.info(f"✓ Dijkstra completed in {elapsed:.2f}s")
        
        return {
            "success": True,
            "path": optimal_path,
            "total_risk": round(total_risk, 2),
            "distance_km": round(total_distance, 2),
            "risk_level": risk_level,
            "insights": insights,
            "mode": data.mode,
            "route_index": 0
        }
        
    except Exception as e:
        logger.error(f"❌ Dijkstra error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": str(e),
            "path": [],
            "total_risk": 0,
            "distance_km": 0,
            "risk_level": "ERROR",
            "insights": ["Route optimization failed"],
            "mode": data.mode
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