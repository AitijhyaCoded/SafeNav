# Backend Logging Guide

## What Was Added

Comprehensive logging to track backend performance and identify bottlenecks.

## Log Output Examples

### Startup
```
🚀 Starting SafeNav Backend...
Loading environment from: D:\projects\SafeNav\.env.local
✓ Gemini API configured
Loading ML models...
✓ Flood risk classifier loaded
✓ Flood severity regressor loaded
✓ FastAPI app initialized
✓ CORS middleware configured
============================================================
🎉 SafeNav Backend is READY!
============================================================
📍 Endpoints available:
   GET  /health - Health check
   GET  /area-risk - Area risk assessment
   POST /score-routes - Standard route scoring
   POST /dijkstra-multi-route - Dijkstra optimal path
   POST /report-issue - Report flood hazard
   GET  /reports - Get all reports
============================================================
```

### When Routes Are Requested

#### Standard Mode (Checkbox OFF)
```
📊 Score-routes called: mode=live, routes=2
  Analyzing route 1/2 (145 points)...
  Analyzing route 2/2 (138 points)...
✓ Score-routes completed in 12.34s - Recommended: Route 2
```

#### Dijkstra Mode (Checkbox ON)
```
🎯 Dijkstra-multi-route called: mode=live, routes=2
  Total route points: 283
  Running Dijkstra's algorithm...
    Building graph from route points...
    Graph has 283 unique points
    Calculating edge weights with flood risk...
    Graph has 566 edges
    Running Dijkstra's algorithm...
    Path found! Visited 145 nodes
    Optimal path has 152 points
  Distance: 8.45km, Risk: MEDIUM
✓ Dijkstra completed in 45.67s
```

## Performance Insights

### What Takes Time

1. **Weather API Calls** (biggest bottleneck)
   - Called for EVERY route point
   - 5 second timeout per call
   - With 200+ points, this can take 3-4 minutes!

2. **ML Model Predictions**
   - Fast (milliseconds per point)
   - Not the bottleneck

3. **Dijkstra Algorithm**
   - Fast (seconds for 200-300 points)
   - Not the bottleneck

### Why 3-4 Minutes?

If you have 2 routes with 150 points each (300 total):
- Weather API called ~30 times (sampled every 10th point)
- Each call: ~1-2 seconds
- Total: 30-60 seconds just for weather

**The delay is from OpenWeather API calls, not the algorithm!**

## Optimization Options

### 1. Cache Weather Data
```python
# Add to backend/main.py
weather_cache = {}

def get_live_weather_cached(lat, lon):
    key = f"{round(lat, 2)},{round(lon, 2)}"
    if key in weather_cache:
        return weather_cache[key]
    
    result = get_live_weather(lat, lon)
    weather_cache[key] = result
    return result
```

### 2. Reduce Sampling
Already sampling every 10th point. Could increase to every 20th:
```python
sampled_coords = route_coords[::20]  # Instead of [::10]
```

### 3. Parallel API Calls
Use async/await to call weather API in parallel:
```python
import asyncio
import aiohttp

async def get_weather_batch(coordinates):
    # Call multiple weather APIs simultaneously
    pass
```

### 4. Use Mock Weather Data (Development)
For testing, skip real API calls:
```python
def get_live_weather(lat, lon):
    return 0.0, 50.0  # Mock: no rain, 50% humidity
```

## Monitoring Performance

Watch the terminal for:
- **Long delays** between log messages = slow operation
- **Weather API errors** = rate limiting or network issues
- **Large route point counts** = more API calls needed

## Recommended Next Steps

1. **Add weather caching** (biggest impact)
2. **Reduce sampling rate** if accuracy allows
3. **Consider paid weather API** with higher rate limits
4. **Add loading indicators** in frontend

## Testing

Restart backend to see new logs:
```bash
cd backend
restart_server.bat
```

Then make a route request and watch the terminal!
