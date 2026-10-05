import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import firestore
from google.api_core.exceptions import FailedPrecondition

from app.auth.dependencies import verify_firebase_token
from app.firebase.admin import get_firestore_client
from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
)

logger = logging.getLogger("docai.documents")

router = APIRouter(
    prefix="/api/documents",
    tags=["documents"],
)


def parse_timestamp(ts) -> str:
    """
    Safely parses Firestore timestamp, DatetimeWithNanoseconds, datetime,
    SERVER_TIMESTAMP sentinel, or None into an ISO-formatted string.
    """
    if ts is None or "Sentinel" in str(ts):
        return datetime.now(timezone.utc).isoformat()
    if hasattr(ts, "isoformat"):
        return ts.isoformat()
    return str(ts)


def serialize_doc(doc_id: str, data: dict) -> DocumentResponse:
    """
    Converts a raw Firestore document dictionary into a DocumentResponse Pydantic model,
    ensuring all timestamp objects are safely converted to ISO strings.
    """
    created_at = parse_timestamp(data.get("created_at"))
    updated_at = parse_timestamp(data.get("updated_at"))

    return DocumentResponse(
        id=doc_id,
        title=data.get("title", "Untitled Document"),
        doc_type=data.get("doc_type", "custom"),
        content=data.get("content", {}),
        user_id=data.get("user_id", ""),
        created_at=created_at,
        updated_at=updated_at,
    )


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    doc_in: DocumentCreate,
    user: dict = Depends(verify_firebase_token),
):
    """
    Creates a new document in Firestore for the authenticated user.
    """
    db = get_firestore_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    doc_data = {
        "title": doc_in.title,
        "doc_type": doc_in.doc_type,
        "content": doc_in.content,
        "user_id": user["uid"],
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }

    doc_ref = db.collection("documents").document()
    doc_ref.set(doc_data)

    # Return constructed response with instant local timestamps
    return DocumentResponse(
        id=doc_ref.id,
        title=doc_in.title,
        doc_type=doc_in.doc_type,
        content=doc_in.content,
        user_id=user["uid"],
        created_at=now_iso,
        updated_at=now_iso,
    )


@router.get("", response_model=List[DocumentResponse])
@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    user: dict = Depends(verify_firebase_token),
):
    """
    Retrieves all documents belonging to the authenticated user.
    Sorts in-memory in Python to avoid Firestore composite index requirement.
    """
    db = get_firestore_client()
    uid = user["uid"]

    try:
        query = db.collection("documents").where("user_id", "==", uid)
        docs_stream = query.stream()
        
        result = []
        for doc in docs_stream:
            data = doc.to_dict()
            result.append(serialize_doc(doc.id, data))

        # Sort in-memory by updated_at descending
        result.sort(key=lambda d: d.updated_at or "", reverse=True)
        return result

    except FailedPrecondition as e:
        logger.error(f"Firestore composite index required: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Firestore index error: {str(e)}",
        )


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    user: dict = Depends(verify_firebase_token),
):
    """
    Retrieves a single document by ID, verifying user ownership.
    """
    db = get_firestore_client()
    doc_ref = db.collection("documents").document(document_id)
    doc_snap = doc_ref.get()

    if not doc_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    data = doc_snap.to_dict()
    if data.get("user_id") != user["uid"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this document",
        )

    return serialize_doc(doc_snap.id, data)


@router.put("/{document_id}", response_model=DocumentResponse)
@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: str,
    doc_in: DocumentUpdate,
    user: dict = Depends(verify_firebase_token),
):
    """
    Updates an existing document in Firestore using partial updates (exclude_unset=True).
    """
    db = get_firestore_client()
    doc_ref = db.collection("documents").document(document_id)
    doc_snap = doc_ref.get()

    if not doc_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    data = doc_snap.to_dict()
    if data.get("user_id") != user["uid"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this document",
        )

    # Partial updates using model_dump(exclude_unset=True)
    update_fields = doc_in.model_dump(exclude_unset=True)
    if update_fields:
        update_fields["updated_at"] = firestore.SERVER_TIMESTAMP
        doc_ref.update(update_fields)

    # Refetch updated document
    updated_snap = doc_ref.get()
    return serialize_doc(updated_snap.id, updated_snap.to_dict())


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    user: dict = Depends(verify_firebase_token),
):
    """
    Deletes a document from Firestore after verifying user ownership.
    """
    db = get_firestore_client()
    doc_ref = db.collection("documents").document(document_id)
    doc_snap = doc_ref.get()

    if not doc_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    data = doc_snap.to_dict()
    if data.get("user_id") != user["uid"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this document",
        )

    doc_ref.delete()
    return {"message": "Document deleted successfully", "id": document_id}
