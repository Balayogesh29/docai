import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from firebase_admin import firestore
from app.firebase.admin import get_firestore_client

logger = logging.getLogger("docai.document_service")


class DocumentService:
    """
    Service layer for Firestore document persistence and version history tracking.
    """

    def create_document(
        self,
        user_id: str,
        project_id: Optional[str] = None,
        title: str = "Untitled Document",
        content_html: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Creates a new document record in Firestore and stores initial version snapshot v1.
        """
        db = get_firestore_client()
        now_iso = datetime.now(timezone.utc).isoformat()
        meta = metadata or {}

        doc_data = {
            "title": title,
            "doc_type": meta.get("doc_type", "project_report"),
            "content": {"html": content_html},
            "content_html": content_html,
            "user_id": user_id,
            "project_id": project_id or "",
            "version": 1,
            "metadata": meta,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }

        if project_id:
            doc_ref = db.collection("projects").document(project_id).collection("documents").document()
        else:
            doc_ref = db.collection("documents").document()

        doc_ref.set(doc_data)
        doc_id = doc_ref.id

        # Save initial version v1 in subcollection 'versions'
        v1_ref = doc_ref.collection("versions").document("v1")
        v1_data = {
            "version": 1,
            "version_name": "v1",
            "content_html": content_html,
            "notes": "Initial generated document version (v1)",
            "created_by": user_id,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
        v1_ref.set(v1_data)

        logger.info(f"Created document {doc_id} with initial version v1 for user {user_id}")

        return {
            "id": doc_id,
            "title": title,
            "doc_type": meta.get("doc_type", "project_report"),
            "content_html": content_html,
            "user_id": user_id,
            "project_id": project_id or "",
            "version": 1,
            "metadata": meta,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

    def save_document_version(
        self,
        document_id: str,
        user_id: str,
        content_html: str,
        notes: str = "Updated document snapshot",
        project_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Increments version number, appends a new snapshot to the document's versions subcollection,
        and updates the root document content and updated_at timestamp.
        """
        db = get_firestore_client()
        now_iso = datetime.now(timezone.utc).isoformat()

        if project_id:
            doc_ref = db.collection("projects").document(project_id).collection("documents").document(document_id)
        else:
            doc_ref = db.collection("documents").document(document_id)

        doc_snap = doc_ref.get()
        current_version = 1
        if doc_snap.exists:
            data = doc_snap.to_dict() or {}
            current_version = data.get("version", 1)

        new_version = current_version + 1
        version_id = f"v{new_version}"

        # Update root document
        doc_ref.update({
            "content": {"html": content_html},
            "content_html": content_html,
            "version": new_version,
            "updated_at": firestore.SERVER_TIMESTAMP,
        })

        # Append version snapshot in subcollection 'versions'
        version_ref = doc_ref.collection("versions").document(version_id)
        version_data = {
            "version": new_version,
            "version_name": version_id,
            "content_html": content_html,
            "notes": notes,
            "created_by": user_id,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
        version_ref.set(version_data)

        logger.info(f"Saved document {document_id} version {version_id} for user {user_id}")

        return {
            "id": document_id,
            "version": new_version,
            "version_name": version_id,
            "content_html": content_html,
            "notes": notes,
            "updated_at": now_iso,
        }


document_service = DocumentService()
