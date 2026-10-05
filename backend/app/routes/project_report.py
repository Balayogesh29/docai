import logging
import re
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, model_validator
from openai import APIError, RateLimitError, AuthenticationError

from app.auth.dependencies import verify_firebase_token
from app.schemas.project_report import (
    GenerateSectionsRequest,
    GenerateSectionsResponse,
    RegenerateSectionRequest,
    RegenerateSectionResponse,
)
from app.services.ai_service import ai_service
from app.services.export_service import export_service

logger = logging.getLogger("docai.project_report_router")

router = APIRouter(
    prefix="/api/project-report",
    tags=["Project Report"],
)


class ExportRequest(BaseModel):
    title: str = "Project Report"
    content_html: str = ""
    html_content: Optional[str] = None
    format: str = "docx"  # docx or pdf

    @model_validator(mode='before')
    @classmethod
    def sync_html_content(cls, data: Any) -> Any:
        if isinstance(data, dict):
            html = data.get("content_html") or data.get("html_content") or ""
            data["content_html"] = html
            data["html_content"] = html
        return data


@router.post("/generate-sections", response_model=GenerateSectionsResponse, status_code=status.HTTP_200_OK)
def generate_sections(
    request: GenerateSectionsRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Generates section-by-section prose for a Project Report using Mistral,
    sequentially iterating with pacing and assembling TipTap-ready semantic HTML.
    """
    context = request.context or request.confirmed_context
    if not context:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Project context or confirmed_context is required",
        )

    try:
        response = ai_service.generate_project_report_sections(request)
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in section generation: {ve}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service Configuration Error: {str(ve)}",
        )
    except (APIError, RateLimitError, AuthenticationError) as oe:
        logger.error(f"AI provider error during section generation: {oe}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI generation service failed. Please check credentials or try again later.",
        )
    except Exception as exc:
        logger.error(f"Error during section generation: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Section generation failed. Please try again later.",
        )


@router.post("/regenerate-section", response_model=RegenerateSectionResponse, status_code=status.HTTP_200_OK)
def regenerate_section(
    request: RegenerateSectionRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Granularly rewrites and regenerates a single section based on user feedback without re-running the entire report.
    Returns clean replacement HTML for the TipTap editor.
    """
    if not request.user_feedback or not request.user_feedback.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="User feedback instructions are required for section regeneration",
        )

    try:
        response = ai_service.regenerate_single_section(
            section_spec=request.section_spec,
            current_content=request.current_content,
            user_feedback=request.user_feedback,
            project_context=request.project_context,
        )
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in single section regeneration: {ve}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service Configuration Error: {str(ve)}",
        )
    except (APIError, RateLimitError, AuthenticationError) as oe:
        logger.error(f"AI provider error during single section regeneration: {oe}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI regeneration service failed. Please check credentials or try again later.",
        )
    except Exception as exc:
        logger.error(f"Error during single section regeneration: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Section regeneration failed. Please try again later.",
        )


@router.post("/export")
async def export_document(request: ExportRequest):
    fmt = request.format.lower()
    if fmt == "docx":
        buffer = export_service.html_to_docx(request.content_html, request.title)
        filename = f"{request.title.replace(' ', '_')}.docx"
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif fmt == "pdf":
        buffer = export_service.html_to_pdf(request.content_html, request.title)
        filename = f"{request.title.replace(' ', '_')}.pdf"
        media_type = "application/pdf"
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Supported: docx, pdf")

    return StreamingResponse(
        buffer,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


