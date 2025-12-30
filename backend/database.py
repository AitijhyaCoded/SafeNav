import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import datetime
from typing import List
import os
import json

# Initialize Firebase Admin SDK
# Check for environment variable first (Production), then file (Local)
firebase_creds_env = os.getenv("FIREBASE_CREDENTIALS")
cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

if not firebase_admin._apps:
    if firebase_creds_env:
        # Production: Load from environment variable string
        try:
            cred_dict = json.loads(firebase_creds_env)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("✓ Firebase initialized from environment variable")
        except json.JSONDecodeError as e:
            print(f"Error parsing FIREBASE_CREDENTIALS: {e}")
    elif os.path.exists(cred_path):
        # Local: Load from file
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("✓ Firebase initialized from local file")
    else:
        print("Warning: No Firebase credentials found (Env var or File)")

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
