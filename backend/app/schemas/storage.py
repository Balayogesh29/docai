from typing import List
from pydantic import BaseModel, Field


class FileUploadResponse(BaseModel):
    file_id: str = Field(..., description="Unique generated UUID for the uploaded file")
    filename: str = Field(..., description="Original filename")
    storage_path: str = Field(..., description="Full storage path in Cloud Storage")
    content_type: str = Field(..., description="MIME content type of the file")
    size_bytes: int = Field(..., description="File size in bytes")
    download_url: str = Field(..., description="Signed or public download URL")
    uploaded_at: str = Field(..., description="ISO 8601 formatted upload timestamp")


class FileListResponse(BaseModel):
    files: List[FileUploadResponse] = Field(default_factory=list, description="List of user uploaded files")
