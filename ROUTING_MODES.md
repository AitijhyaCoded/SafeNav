# Routing Modes Guide

## Two Routing Algorithms Available

### 1. Standard Mode (Checkbox OFF)
**Algorithm**: Random Forest Severity Scoring
**Focus**: Safest route only

**How it works**:
- Analyzes all available routes (typically 2-3)
- Calculates flood severity score for each route
- Recommends the route with lowest severity
- Shows all routes on map (green = safest, red = riskier)

**Visual**:
- Green solid line = Recommended safest route
- Red dashed line = Alternative routes with higher risk

**Best for**:
- When you want to see all route options
- Comparing multiple paths side-by-side
- Understanding relative risk between routes

---

### 2. Dijkstra Mode (Checkbox ON) ✨
**Algorithm**: Dijkstra's Shortest Path with Risk Weighting
**Focus**: Shortest + Safest path

**How it works**:
- Builds a graph from all route points
- Edge weight = `distance × (1 + flood_risk_factors)`
- Finds mathematically optimal path balancing distance and safety
- Can combine segments from different routes

**Visual**:
- Bright green thick line = Optimal path
- Gray faded dashed lines = Original routes (for reference)

**Best for**:
- Finding the absolute best route
- Balancing time and safety
- Getting a single clear recommendation

---

## Toggle Between Modes

Use the checkbox in the route finder:
```
☑ Use Dijkstra's Algorithm (Shortest + Safest)
```

**Checked** = Dijkstra mode (optimal path)
**Unchecked** = Standard mode (compare all routes)

---

## Example Comparison

**Scenario**: Route from Kolkata to Salt Lake

### Standard Mode Shows:
- Route 1: 5km, HIGH risk (passes through flood zone)
- Route 2: 7km, LOW risk (avoids flooding)
- **Recommendation**: Route 2 (safest)

### Dijkstra Mode Shows:
- Optimal Path: 5.5km, LOW risk
- **How**: Uses Route 1 until flood zone, switches to Route 2 to avoid flooding, returns to Route 1 after
- **Result**: Shorter than Route 2, safer than Route 1 ✨

---

## When to Use Each Mode

### Use Standard Mode when:
- You want to see all available options
- You need to compare routes visually
- You want to understand why one route is safer
- You prefer having multiple choices

### Use Dijkstra Mode when:
- You want the single best recommendation
- Time efficiency matters
- You trust the algorithm to optimize
- You want the shortest safe path

---

## Technical Details

### Standard Mode
- Endpoint: `/score-routes`
- Returns: Multiple routes with severity scores
- Display: All routes visible

### Dijkstra Mode
- Endpoint: `/dijkstra-multi-route`
- Returns: Single optimal path
- Display: Optimal path + faded reference routes

Both modes use:
- Random Forest ML models for flood prediction
- Live weather data from OpenWeather API
- User-reported hazards
- Historical flood data
