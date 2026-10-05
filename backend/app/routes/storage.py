import os
import uuid
import logging
import mimetypes
from datetime import datetime, timezone
from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.auth.dependencies import verify_firebase_token
from app.schemas.storage import FileUploadResponse, FileListResponse

logger = logging.getLogger("docai.storage")

router = APIRouter(
    prefix="/api/storage",
    tags=["Storage"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB Limit
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".doc"}

# Base directory for local disk storage (backend/uploads)
UPLOADS_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))


def parse_file_name_and_id(filename: str) -> Tuple[str, str]:
    """
    Parses file_id and original filename from a local filename formatted like:
    {file_id}_{original_filename}
    """
    if "_" in filename:
        parts = filename.split("_", 1)
        return parts[0], parts[1]
    return filename, filename


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(verify_firebase_token),
):
    """
    Uploads a reference document (.pdf, .docx, .txt, .doc) up to 10 MB to Local Disk Storage.
    Strictly isolated per user under path: backend/uploads/{user_id}/{file_id}_{filename}
    """
    raw_filename = file.filename or "document.txt"
    # Path Traversal Protection: sanitize filename using os.path.basename
    safe_filename = os.path.basename(raw_filename)
    
    ext = os.path.splitext(safe_filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed extensions: .pdf, .docx, .txt, .doc",
        )

    # Read bytes safely to check file size limit
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowed limit of 10 MB",
        )
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content cannot be empty",
        )

    user_id = user["uid"]
    file_id = str(uuid.uuid4())
    
    # Directory Creation Safety: ensure user directory exists
    user_dir = os.path.join(UPLOADS_BASE_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)

    file_path = os.path.join(user_dir, f"{file_id}_{safe_filename}")
    
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.error(f"Failed to write file to local disk storage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file to local disk",
        )

    uploaded_at_iso = datetime.now(timezone.utc).isoformat()
    content_type = file.content_type or mimetypes.guess_type(safe_filename)[0] or "application/octet-stream"
    download_url = f"http://127.0.0.1:8000/uploads/{user_id}/{file_id}_{safe_filename}"
    storage_path = f"uploads/{user_id}/{file_id}_{safe_filename}"

    return FileUploadResponse(
        file_id=file_id,
        filename=safe_filename,
        storage_path=storage_path,
        content_type=content_type,
        size_bytes=len(contents),
        download_url=download_url,
        uploaded_at=uploaded_at_iso,
    )


@router.get("/files", response_model=FileListResponse)
def list_files(
    user: dict = Depends(verify_firebase_token),
):
    """
    Lists all reference files uploaded by the authenticated user under backend/uploads/{user_id}/
    """
    user_id = user["uid"]
    user_dir = os.path.join(UPLOADS_BASE_DIR, user_id)

    if not os.path.exists(user_dir):
        return FileListResponse(files=[])

    files_list = []
    try:
        entries = os.listdir(user_dir)
    except Exception as e:
        logger.error(f"Error listing directory {user_dir}: {e}")
        return FileListResponse(files=[])

    for entry in entries:
        full_path = os.path.join(user_dir, entry)
        if not os.path.isfile(full_path):
            continue

        file_id, orig_filename = parse_file_name_and_id(entry)
        
        try:
            stat = os.stat(full_path)
            size_bytes = stat.st_size
            uploaded_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        except Exception as e:
            logger.warning(f"Error reading stats for {full_path}: {e}")
            size_bytes = 0
            uploaded_at = datetime.now(timezone.utc).isoformat()

        # MIME Type Guessing on GET: use mimetypes.guess_type or application/octet-stream fallback
        guessed_type, _ = mimetypes.guess_type(orig_filename)
        content_type = guessed_type or "application/octet-stream"

        download_url = f"http://127.0.0.1:8000/uploads/{user_id}/{entry}"
        storage_path = f"uploads/{user_id}/{entry}"

        files_list.append(
            FileUploadResponse(
                file_id=file_id,
                filename=orig_filename,
                storage_path=storage_path,
                content_type=content_type,
                size_bytes=size_bytes,
                download_url=download_url,
                uploaded_at=uploaded_at,
            )
        )

    return FileListResponse(files=files_list)


@router.delete("/files/{file_id}")
def delete_file(
    file_id: str,
    user: dict = Depends(verify_firebase_token),
):
    """
    Deletes a file belonging to the authenticated user matching the target file_id.
    """
    user_id = user["uid"]
    user_dir = os.path.join(UPLOADS_BASE_DIR, user_id)

    if not os.path.exists(user_dir):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    target_entry = None
    for entry in os.listdir(user_dir):
        if entry.startswith(f"{file_id}_") or entry == file_id:
            target_entry = entry
            break

    if not target_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    target_path = os.path.join(user_dir, target_entry)
    try:
        os.remove(target_path)
    except Exception as e:
        logger.error(f"Error removing file {target_path}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file from local disk",
        )

    return {"message": "File deleted successfully", "file_id": file_id}

