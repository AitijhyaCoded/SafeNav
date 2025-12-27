# Testing the Dijkstra Implementation

## ✅ Backend is Ready!

Your backend is running and showing:
```
📍 Endpoints available:
   POST /dijkstra-multi-route - Dijkstra optimal path
```

## How to See the Request Logs

### Step 1: Make sure frontend is running
```bash
npm run dev
```

### Step 2: Open the app
Go to: http://localhost:3000/home

### Step 3: Enter route details
- **Start Location**: `Kolkata`
- **Destination**: `Salt Lake`
- Click **"Find Safe Routes"** or **"Check Safety"** button

### Step 4: Watch the backend terminal

You should now see:
```
INFO:     127.0.0.1:56684 - "POST /dijkstra-multi-route HTTP/1.1" 200 OK
```

Or if checkbox is unchecked:
```
INFO:     127.0.0.1:56684 - "POST /score-routes HTTP/1.1" 200 OK
```

## Toggle Between Modes

Once routes are displayed:

1. **Check the checkbox**: "Use Dijkstra's Algorithm (Shortest + Safest)"
   - Backend terminal shows: `POST /dijkstra-multi-route`
   - Map shows: Single green optimal path

2. **Uncheck the checkbox**:
   - Backend terminal shows: `POST /score-routes`
   - Map shows: Multiple routes (green + red)

## What You'll See

### Frontend (Browser)
- Map with routes
- Route cards showing:
  - Distance (km)
  - Risk score
  - AI insights
  - "Optimal Path (Dijkstra)" label when using Dijkstra

### Backend (Terminal)
```
INFO:     127.0.0.1:xxxxx - "POST /dijkstra-multi-route HTTP/1.1" 200 OK
```

### Browser Console (F12)
```
DIJKSTRA RESULT FROM BACKEND: {
  success: true,
  path: [[22.5726, 88.3639], ...],
  total_risk: 15.42,
  distance_km: 8.5,
  risk_level: "MEDIUM",
  insights: [...]
}
```

## Troubleshooting

### "No routes showing"
- Check browser console (F12) for errors
- Verify OpenRouteService API key is set in `.env.local`
- Check network tab for failed requests

### "Backend not responding"
- Verify backend is running: `curl http://127.0.0.1:8000/health`
- Check CORS settings allow localhost:3000
- Restart backend: `cd backend && restart_server.bat`

### "Checkbox doesn't work"
- Check browser console for React errors
- Verify checkbox component is imported
- Clear browser cache and reload

## Expected Behavior

1. **Initial Load**: No routes shown
2. **After Submit**: Routes appear on map
3. **Toggle Checkbox**: Routes update instantly
4. **Backend Logs**: Show POST requests for each route calculation

## Success Criteria

✅ Backend shows startup message with endpoints
✅ Form submission triggers route calculation
✅ Backend logs show POST requests
✅ Map displays routes
✅ Checkbox toggles between algorithms
✅ Route cards show different data for each mode

All systems are ready - just test from the frontend!
