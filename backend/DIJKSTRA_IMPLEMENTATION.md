# Dijkstra's Algorithm Implementation for Flood-Safe Routing

## Overview

This implementation uses **Dijkstra's shortest path algorithm** to find the optimal route that minimizes both distance and flood risk. Unlike traditional grid-based approaches, this works directly with real road routes from OpenRouteService, ensuring practical, drivable paths.

## How It Works

### 1. Route-Based Graph Construction
- Takes actual road routes from OpenRouteService (not a grid)
- Builds a graph from all route points across multiple alternatives
- Each point becomes a node, consecutive points form edges
- Ensures paths follow real roads

### 2. Edge Weight Calculation
Each edge weight combines multiple factors:

```python
edge_weight = distance × flood_risk_weight

where:
flood_risk_weight = 1.0 + (risk × 5) + (severity × 0.5) + (rain_factor × 0.3)
```

**Components:**
- **Distance**: Haversine distance in kilometers between consecutive points
- **Flood Risk**: ML model probability (0-1) scaled by 5
- **Severity**: ML model severity prediction (0-5) scaled by 0.5
- **Rain Factor**: Live rainfall data (1 + min(rain/10, 1))

### 3. Pathfinding
- Uses priority queue (min-heap) for efficient node selection
- Follows actual road network from OpenRouteService
- Tracks visited nodes to avoid cycles
- Can switch between alternative routes when beneficial
- Reconstructs optimal path from destination to start

### 4. Risk Assessment
Final route is evaluated:
- **Total Risk**: Sum of all edge weights along the path
- **Average Risk**: Total risk / number of path points
- **Risk Level**: HIGH (>2.5), MEDIUM (>1.5), LOW (≤1.5)

## API Endpoints

### POST `/dijkstra-multi-route`

**Primary endpoint for route optimization**

**Request:**
```json
{
  "routes": [
    {"coordinates": [[22.5726, 88.3639], [22.5730, 88.3645], ...]},
    {"coordinates": [[22.5726, 88.3639], [22.5728, 88.3650], ...]}
  ],
  "mode": "live"  // or "monsoon"
}
```

**Response:**
```json
{
  "success": true,
  "path": [[22.5726, 88.3639], ...],
  "total_risk": 15.42,
  "distance_km": 8.5,
  "risk_level": "MEDIUM",
  "insights": [
    "Optimized for monsoon conditions",
    "Low flood risk path selected"
  ],
  "mode": "live",
  "route_index": 0
}
```

### POST `/dijkstra-route`

**Single route optimization endpoint**

**Request:**
```json
{
  "start": [22.5726, 88.3639],
  "end": [22.6208, 88.4300],
  "mode": "live",
  "route_coords": [[22.5726, 88.3639], [22.5730, 88.3645], ...]
}
```

## Algorithm Complexity

- **Time Complexity**: O((V + E) log V) where V = route points, E = edges
- **Space Complexity**: O(V) for distance and previous node tracking
- **Typical Route**: 100-500 points per route
- **Multiple Routes**: 2-3 alternative routes analyzed simultaneously

## Advantages Over Grid-Based Approach

1. **Real Roads**: Uses actual drivable routes, not theoretical grid paths
2. **No "Path Not Found" Errors**: Always has valid routes from OpenRouteService
3. **Faster**: Fewer nodes to process (100s vs 1000s in grid)
4. **Practical**: Results are immediately usable for navigation
5. **Multi-Route Optimization**: Can switch between routes mid-journey

## Advantages Over Simple Severity Scoring

1. **Distance-Aware**: Balances safety with shortest path
2. **Dynamic Switching**: Can use parts of different routes
3. **Weather-Integrated**: Uses live rainfall data
4. **ML-Powered**: Leverages trained models for risk prediction
5. **Optimal Guarantee**: Finds mathematically optimal path

## Testing

Run the test script:
```bash
cd backend
python test_dijkstra.py
```

## How It Solves Your Requirements

### ✅ Shortest Route
- Dijkstra inherently finds shortest path
- Distance is a primary component of edge weights
- Minimizes total travel distance

### ✅ Safest Route  
- Flood risk heavily weighted in edge calculation
- ML models predict waterlogging at each point
- Live weather data influences risk scores

### ✅ Balanced Optimization
- Edge weight formula: `distance × (1 + risk_factors)`
- Low risk areas: weight ≈ distance (shortest path)
- High risk areas: weight >> distance (avoids area)
- Result: Shortest safe path, not just shortest or safest

## Example Scenario

**Input**: 2 routes from A to B
- Route 1: 5km, passes through flood zone
- Route 2: 7km, avoids flood zone

**Without Dijkstra**: 
- Picks Route 2 (safer but longer)

**With Dijkstra**:
- Uses Route 1 until flood zone
- Switches to Route 2 to avoid flooding
- Returns to Route 1 after flood zone
- Result: 5.5km, avoids flood zone ✨

## Future Enhancements

- [ ] Real-time traffic integration
- [ ] Historical flood data overlay
- [ ] A* algorithm for faster computation
- [ ] Multi-objective Pareto optimization
- [ ] User preference weighting (safety vs speed)
