# SafeNav Deployment Guide

This guide details how to deploy the SafeNav application. Because your project has a complex Python backend (ML models, Dijkstra algorithm) and a Next.js frontend, the best strategy is a **Split Deployment**:

1.  **Backend:** Deployed on **Render** (Free, supports Python & ML libraries).
2.  **Frontend:** Deployed on **Vercel** (Free, optimized for Next.js).

---

## Phase 1: Prepare Your Code

Before deploying, we need to ensure the frontend knows where to find the backend.

### 1. Create a Backend URL Variable
Currently, your code points to `http://localhost:8000`. We need to change this to use an environment variable.

**I will update your frontend files automatically in the next step.**
They will look for `process.env.NEXT_PUBLIC_BACKEND_URL`.

### 2. Push to GitHub
Ensure all your latest changes (including the Firebase migration and the code updates below) are pushed to your GitHub repository.

---

## Phase 2: Deploy Backend (Render)

Render is excellent for Python apps.

1.  **Sign Up:** Go to [render.com](https://render.com/) and sign up with GitHub.
2.  **New Web Service:** Click **New +** -> **Web Service**.
3.  **Connect Repo:** Select your `SafeNav` repository.
4.  **Configuration:**
    *   **Name:** `safenav-backend`
    *   **Region:** Singapore (or closest to you).
    *   **Root Directory:** `backend` (Important! This tells Render your python code is in the subfolder).
    *   **Runtime:** **Python 3**.
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
    *   **Instance Type:** Free.
5.  **Environment Variables:**
    Scroll down to "Environment Variables" and add:
    *   `PYTHON_VERSION`: `3.9.0` (Recommended for ML compatibility)
    *   `GEMINI_API_KEY`: (Paste your key from .env.local)
    *   `OPENWEATHER_API_KEY`: (Paste your key from .env.local)
    *   `FIREBASE_CREDENTIALS`: (Paste the *content* of your `serviceAccountKey.json` file here as a single line string. *Note: You will need to update `database.py` to read this if you haven't already, or just commit the json file if it's a private repo for a hackathon.*)
        *   *Hackathon Shortcut:* Since this is a hackathon, you can commit `serviceAccountKey.json` to your private repo. Render will pick it up.
6.  **Deploy:** Click **Create Web Service**.

**Wait for it to finish.** Once done, Render will give you a URL like `https://safenav-backend.onrender.com`. **Copy this URL.**

---

## Phase 3: Deploy Frontend (Vercel)

1.  **Sign Up:** Go to [vercel.com](https://vercel.com/) and sign up with GitHub.
2.  **Add New Project:** Click **Add New...** -> **Project**.
3.  **Import Repo:** Import `SafeNav`.
4.  **Configuration:**
    *   **Framework Preset:** Next.js (Auto-detected).
    *   **Root Directory:** `./` (Default is fine).
5.  **Environment Variables:**
    Add the following variables (copy values from your `.env.local`):
    *   `NEXT_PUBLIC_BACKEND_URL`: **Paste your Render Backend URL here** (e.g., `https://safenav-backend.onrender.com`). **Do not add a trailing slash `/`.**
    *   `NEXT_PUBLIC_ORS_KEY`: ...
    *   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: ...
    *   `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: ...
    *   `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: ...
    *   `NEXT_PUBLIC_FIREBASE_API_KEY`: ...
    *   (Add all other `NEXT_PUBLIC_` variables).
6.  **Deploy:** Click **Deploy**.

---

## Phase 4: Final Connection

1.  Once Vercel finishes, you will get a Frontend URL (e.g., `https://safenav.vercel.app`).
2.  **Update Backend CORS:**
    *   Go back to your code `backend/main.py`.
    *   Update `allow_origins` to include your new Vercel URL.
    *   Push the change to GitHub. Render will auto-redeploy.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://safenav.vercel.app", # <--- Add your Vercel domain
        "*" # Keep this for testing if needed
    ],
    # ...
)
```

## Troubleshooting

*   **Backend 502/Timeout:** The Free tier on Render "sleeps" after inactivity. The first request might take 50 seconds to wake it up.
*   **Images not showing:** Ensure you completed the Firebase Storage migration. Local uploads will disappear on Render restarts.
*   **ML Model Errors:** If Render fails to build due to memory, try removing unused libraries from `requirements.txt`.
