# Backend Restart Guide

## Problem
The backend is running an old version without the Dijkstra endpoint.

## Solution

### Option 1: Use the Restart Script (Recommended)
```bash
cd backend
restart_server.bat
```

This will:
1. Kill any process on port 8000
2. Wait 2 seconds
3. Start the updated backend with Dijkstra support

### Option 2: Manual Restart
1. **Kill existing processes**:
   - Open Task Manager (Ctrl+Shift+Esc)
   - Find "Python" processes
   - End all Python tasks

2. **Start backend**:
   ```bash
   cd backend
   venv\Scripts\activate
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

### Option 3: Use Different Port
If port 8000 is stuck, use port 8001:

1. **Start on port 8001**:
   ```bash
   cd backend
   venv\Scripts\activate
   uvicorn main:app --reload --host 127.0.0.1 --port 8001
   ```

2. **Update frontend** - Change all instances of:
   - `http://127.0.0.1:8000` → `http://127.0.0.1:8001`
   - `http://localhost:8000` → `http://localhost:8001`

## Verify Backend is Running

Test the health endpoint:
```bash
curl http://127.0.0.1:8000/health
```

Should return: `{"status":"OK"}`

Test the Dijkstra endpoint exists:
```bash
curl http://127.0.0.1:8000/docs
```

Open in browser to see API documentation with the new `/dijkstra-multi-route` endpoint.

## Test the Full Flow

1. Start backend (see above)
2. Start frontend: `npm run dev`
3. Go to http://localhost:3000/home
4. Enter route (e.g., "Kolkata" to "Salt Lake")
5. Toggle the Dijkstra checkbox
6. See routes change between modes

## Troubleshooting

### "Port 8000 already in use"
- Use `restart_server.bat` to force kill and restart
- Or use Task Manager to end Python processes
- Or use port 8001 instead

### "Module not found" errors
Make sure you're in the virtual environment:
```bash
cd backend
venv\Scripts\activate
```

### Backend starts but frontend can't connect
- Check CORS settings in `backend/main.py`
- Verify port matches in frontend code
- Check Windows Firewall isn't blocking

### Dijkstra endpoint not found
- Backend is running old code
- Use `restart_server.bat` to reload
- Check console for import errors
