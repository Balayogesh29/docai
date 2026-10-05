import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger("docai.firebase")
_firebase_app = None


class LocalDevCredential(credentials.Base):
    def get_credential(self):
        from google.auth.credentials import AnonymousCredentials
        return AnonymousCredentials()


def initialize_firebase_admin():
    """
    Initializes the Firebase Admin SDK singleton.
    Reads credentials from FIREBASE_SERVICE_ACCOUNT_PATH if available.
    """
    global _firebase_app
    if _firebase_app is not None or len(firebase_admin._apps) > 0:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app

    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")
    project_id = os.getenv("FIREBASE_PROJECT_ID", "doc-ai-beb32")
    options = {}
    if project_id:
        options["projectId"] = project_id
    
    try:
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            _firebase_app = firebase_admin.initialize_app(cred, options if options else None)
            logger.info(f"Firebase Admin initialized using service account at {service_account_path}")
        elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and os.path.exists(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")):
            cred = credentials.ApplicationDefault()
            _firebase_app = firebase_admin.initialize_app(cred, options if options else None)
            logger.info("Firebase Admin initialized using Application Default Credentials")
        else:
            cred = LocalDevCredential()
            _firebase_app = firebase_admin.initialize_app(cred, options if options else None)
            logger.info("Firebase Admin initialized using LocalDevCredential fallback")
    except Exception as e:
        logger.warning(f"Firebase Admin SDK initialization notice: {e}")
        # Initialize default app if not already initialized
        if not firebase_admin._apps:
            _firebase_app = firebase_admin.initialize_app(options=options if options else None)
            logger.info("Firebase Admin initialized with default configuration")
        else:
            _firebase_app = firebase_admin.get_app()

    return _firebase_app


def get_firestore_client():
    """
    Returns a Firestore database client instance from the initialized Firebase Admin app.
    """
    initialize_firebase_admin()
    return firestore.client()


# Auto-initialize upon module import
initialize_firebase_admin()

