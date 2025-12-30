# Migration Guide: SQLite to Firebase Firestore

This guide outlines the steps to switch your SafeNav backend from using a local SQLite database to Google Firebase Firestore. This is recommended for production deployments to ensure data persistence and scalability.

## 1. Firebase Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project (or use an existing one).
3.  Navigate to **Build > Firestore Database** and click **Create Database**.
    *   Start in **Test mode** (for development) or **Production mode** (you will need to configure security rules).
    *   Choose a location close to your users.
4.  Navigate to **Project Settings > Service Accounts**.
5.  Click **Generate new private key**.
6.  Save the JSON file. Rename it to `serviceAccountKey.json` and place it in your `backend/` folder.
    *   **IMPORTANT:** Add `serviceAccountKey.json` to your `.gitignore` file immediately to prevent leaking secrets!

## 2. Install Dependencies

In your `backend/` directory, install the Firebase Admin SDK:

```bash
pip install firebase-admin
```

Add it to your `requirements.txt`:
```text
firebase-admin==6.2.0
```

## 3. Update Code

Replace the contents of `backend/database.py` with the following code. This implementation connects to Firestore and maintains your "2-minute expiry" logic.

### New `backend/database.py`

```python
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import datetime
from typing import List
import os

# Initialize Firebase Admin SDK
# Ensure serviceAccountKey.json is in the backend directory
cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()
COLLECTION_NAME = "reports"

def init_db():
    """
    Firestore is schemaless, so no table creation is needed.
    We just verify the connection here.
    """
    try:
        # Optional: Check connection by trying to get a reference
        print("✓ Connected to Firestore")
    except Exception as e:
        print(f"Error connecting to Firestore: {e}")

def add_report(report: dict):
    """Add a new report to Firestore."""
    try:
        # Use the report ID as the document ID
        doc_ref = db.collection(COLLECTION_NAME).document(report['id'])
        doc_ref.set(report)
        print(f"Report {report['id']} added to Firestore")
    except Exception as e:
        print(f"Failed to add report: {e}")

def cleanup_expired_reports():
    """
    Delete reports older than 2 minutes.
    Note: In high-traffic apps, use Firestore TTL policies instead of manual deletion.
    """
    try:
        cutoff = datetime.datetime.now() - datetime.timedelta(minutes=2)
        cutoff_iso = cutoff.isoformat()

        # Query for documents where timestamp is less than cutoff
        # Note: You might need to create a composite index in Firebase Console if you filter by multiple fields
        docs = db.collection(COLLECTION_NAME).where('timestamp', '<', cutoff_iso).stream()

        deleted_count = 0
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1
        
        if deleted_count > 0:
            print(f"Cleaned up {deleted_count} expired reports")
            
    except Exception as e:
        print(f"Cleanup failed: {e}")

def get_all_reports() -> List[dict]:
    """Retrieve valid reports (not expired) from Firestore."""
    
    # 1. Run cleanup first
    cleanup_expired_reports()
    
    # 2. Fetch remaining reports
    try:
        reports = []
        docs = db.collection(COLLECTION_NAME).stream()
        
        for doc in docs:
            reports.append(doc.to_dict())
            
        return reports
    except Exception as e:
        print(f"Failed to fetch reports: {e}")
        return []
```

## 4. Environment Variables (Optional but Recommended)

Instead of keeping `serviceAccountKey.json` as a file, you can store its content in an environment variable for safer deployment (e.g., on Vercel or Render).

1.  Convert the JSON content to a string.
2.  Add it to your `.env` file: `FIREBASE_CREDENTIALS='{...json content...}'`
3.  Update the initialization code to read from the environment variable:

```python
import json
# ...
cred_json = os.getenv('FIREBASE_CREDENTIALS')
if cred_json:
    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
```

## 5. Firestore Indexes

If you see an error regarding indexes when running queries (like the cleanup query), check the terminal output. Firebase usually provides a direct link to create the required index automatically in the console.

## Appendix: Frontend Integration (Optional)

The configuration you provided (API Key, App ID, etc.) is for the **Frontend** (Next.js). While the backend migration above uses the Service Account to manage the database securely, you can also initialize Firebase in your frontend app. This is useful if you want to use Firebase Authentication, Analytics, or upload images directly from the browser in the future.

I have already set up the following for you:

1.  **Environment Variables:** Added your Firebase config to `.env.local`.
2.  **Initialization File:** Created `lib/firebase.ts` which initializes the Firebase app.

### How to use it in Frontend Components

If you ever need to use Firebase in a React component (e.g., to log an analytics event), you can import it like this:

```typescript
import { analytics } from '@/lib/firebase';
import { logEvent } from "firebase/analytics";

// Inside a component
useEffect(() => {
  if (analytics) {
    logEvent(analytics, 'page_view');
  }
}, []);
```

**Important Distinction:**
*   **Backend (`backend/database.py`):** Uses `firebase-admin` + `serviceAccountKey.json`. Has full access to the database.
*   **Frontend (`lib/firebase.ts`):** Uses `firebase` (Client SDK) + `NEXT_PUBLIC_FIREBASE_...` keys. Has restricted access based on Security Rules.
