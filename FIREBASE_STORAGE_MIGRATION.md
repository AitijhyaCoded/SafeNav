# Migration Guide: Local Uploads to Firebase Storage

This guide explains how to switch from saving images locally (in the `uploads/` folder) to using **Firebase Storage**. This is critical for deployment because cloud servers often delete local files when they restart.

## 1. Update Firebase Initialization

You need to tell the Firebase Admin SDK which storage bucket to use.

**File:** `backend/database.py`

**Change this:**
```python
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
```

**To this:**
```python
from firebase_admin import storage  # <--- Add this import

# ... existing code ...

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'safenav-c4754.firebasestorage.app'  # Your bucket name
    })

bucket = storage.bucket()  # <--- Initialize bucket reference
```

## 2. Add Upload Function

Add this helper function to `backend/database.py` to handle the actual upload process.

**File:** `backend/database.py`

```python
def upload_image(file_obj, filename, content_type="image/jpeg"):
    """
    Uploads a file-like object to Firebase Storage and returns the public URL.
    """
    try:
        # Create a reference to the file location in the bucket
        blob = bucket.blob(f"reports/{filename}")
        
        # Upload the file
        blob.upload_from_file(file_obj, content_type=content_type)
        
        # Make it public so the frontend can display it
        blob.make_public()
        
        print(f"Uploaded {filename} to Firebase Storage")
        return blob.public_url
    except Exception as e:
        print(f"Upload failed: {e}")
        return None
```

## 3. Update the API Endpoint

Now, update your main application logic to send the file to Firebase instead of saving it to the disk.

**File:** `backend/main.py`

**Find the `/report-issue` endpoint and modify the image handling section:**

```python
import io # Add this import at the top

# ... inside report_issue function ...

    image_url = None
    if image:
        # Generate a unique filename
        filename = f"{uuid.uuid4()}_{image.filename}"
        
        # Read the file content into memory
        content = await image.read()
        file_obj = io.BytesIO(content)
        
        # Upload to Firebase Storage using the new function
        # Note: You need to import database at the top of main.py
        image_url = database.upload_image(file_obj, filename, image.content_type)
```

## 4. Configure Storage Rules (Crucial!)

By default, Firebase Storage might block uploads. You need to allow access.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Storage** in the left menu.
3.  Click on the **Rules** tab.
4.  Paste the following rules (allows anyone to read/write - good for hackathons):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```
5.  Click **Publish**.

## 5. Cleanup (Optional)

Once this is working:
1.  You can delete the `uploads/` folder from your project.
2.  You can remove `aiofiles` from your `requirements.txt` if you aren't using it elsewhere.
3.  You can remove the `app.mount("/uploads", ...)` line from `backend/main.py`.
