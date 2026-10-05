from typing import Optional, Union, Dict, List, Any
from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Title of the document")
    doc_type: str = Field(default="custom", description="Document type (e.g. research_paper, project_report, custom)")
    content: Union[Dict[str, Any], List[Any], str] = Field(
        default_factory=dict,
        description="Document content structure (TipTap JSON, HTML, or raw text)"
    )


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    doc_type: Optional[str] = None
    content: Optional[Union[Dict[str, Any], List[Any], str]] = None


class DocumentResponse(DocumentBase):
    id: str
    user_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
