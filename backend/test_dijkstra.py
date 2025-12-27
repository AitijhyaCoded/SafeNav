"""
Test script for Dijkstra's algorithm implementation
"""
import requests
import json

# Test coordinates (Kolkata area)
start = [22.5726, 88.3639]  # Kolkata center
end = [22.6208, 88.4300]    # Salt Lake

print("Testing Dijkstra's Algorithm for Flood-Safe Routing")
print("=" * 60)
print(f"Start: {start}")
print(f"End: {end}")
print()

# Test with live conditions
print("Testing with LIVE conditions...")
response = requests.post(
    "http://127.0.0.1:8000/dijkstra-route",
    json={
        "start": start,
        "end": end,
        "mode": "live"
    }
)

if response.status_code == 200:
    result = response.json()
    print(f"✓ Success: {result['success']}")
    print(f"  Path points: {len(result['path'])}")
    print(f"  Distance: {result['distance_km']} km")
    print(f"  Total risk: {result['total_risk']}")
    print(f"  Risk level: {result['risk_level']}")
    print(f"  Insights: {result['insights']}")
else:
    print(f"✗ Error: {response.status_code}")
    print(response.text)

print()

# Test with monsoon conditions
print("Testing with MONSOON conditions...")
response = requests.post(
    "http://127.0.0.1:8000/dijkstra-route",
    json={
        "start": start,
        "end": end,
        "mode": "monsoon"
    }
)

if response.status_code == 200:
    result = response.json()
    print(f"✓ Success: {result['success']}")
    print(f"  Path points: {len(result['path'])}")
    print(f"  Distance: {result['distance_km']} km")
    print(f"  Total risk: {result['total_risk']}")
    print(f"  Risk level: {result['risk_level']}")
    print(f"  Insights: {result['insights']}")
else:
    print(f"✗ Error: {response.status_code}")
    print(response.text)

print()
print("=" * 60)
print("Test complete!")
