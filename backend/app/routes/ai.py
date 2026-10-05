import logging
from fastapi import APIRouter, Depends, HTTPException, status
from openai import APIError, RateLimitError, AuthenticationError

from app.auth.dependencies import verify_firebase_token
from app.schemas.ai import (
    ContextAnalysisRequest,
    ContextAnalysisResponse,
    OutlineGenerationRequest,
    OutlineGenerationResponse,
    DraftSectionRequest,
    DraftSectionResponse,
    ProjectReportRequest,
    ProjectReportInitResponse,
    ProjectReportContextResponse,
    ProjectReportOutlineRequest,
    ProjectReportOutlineResponse,
    GenerateProjectReportSectionsRequest,
    GenerateProjectReportSectionsResponse,
)
from app.services.ai_service import ai_service

logger = logging.getLogger("docai.ai_route")

from app.config import settings

router = APIRouter(
    prefix="/api/ai",
    tags=["AI"],
)


@router.api_route("/test-gemini", methods=["GET", "POST"])
@router.api_route("/test-mistral", methods=["GET", "POST"], include_in_schema=False)  # backward-compatible alias
def test_gemini_connection(user: dict = Depends(verify_firebase_token)):
    """
    Diagnostic endpoint to test Gemini API connectivity with a minimal request.
    Prompt: 'Analyze this sentence: AI is used to avoid collisions in mining robots.'
    """
    analysis_pool_size = len(settings.analysis_key_pool)
    generation_pool_size = len(settings.generation_key_pool)

    logger.info(
        f"Testing Gemini Connection | "
        f"Analysis Pool: {analysis_pool_size} keys | "
        f"Generation Pool: {generation_pool_size} keys | "
        f"Model: {settings.GEMINI_MODEL}"
    )

    try:
        result = ai_service.test_mistral_minimal()  # method name kept for internal compat
        return {
            "status": "success",
            "provider": "gemini",
            "model_used": settings.GEMINI_MODEL,
            "analysis_pool_keys": analysis_pool_size,
            "generation_pool_keys": generation_pool_size,
            "response": result,
        }
    except Exception as e:
        status_code = getattr(e, "status_code", getattr(e, "status", 502))
        error_msg = getattr(e, "message", getattr(e, "detail", str(e)))
        logger.error(f"Gemini Diagnostic Test Failed | Type: {type(e).__name__} | Status: {status_code} | Error: {error_msg}")
        raise HTTPException(
            status_code=status_code if isinstance(status_code, int) and 400 <= status_code < 600 else 502,
            detail=f"Gemini API test failed [{type(e).__name__}]: {error_msg}",
        )


@router.post(
    "/analyze-context",
    response_model=ContextAnalysisResponse,
    status_code=status.HTTP_200_OK,
)
def analyze_context(
    request: ContextAnalysisRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Analyzes document topic, abstract, and uploaded reference files using Gemini AI
    to extract structured metadata (domain, core objectives, key concepts, target audience).
    """
    user_id = user.get("uid")

    try:
        response = ai_service.analyze_context(request, user_id=user_id)
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in AI context analysis: {ve}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Service Configuration Error: {str(ve)}",
        )
    except (APIError, RateLimitError, AuthenticationError) as oe:
        status_code = getattr(oe, "status_code", 502)
        logger.error(f"Upstream provider failure during context analysis [Status {status_code}]: {oe}")
        raise HTTPException(
            status_code=status_code if isinstance(status_code, int) and 400 <= status_code < 600 else 502,
            detail=f"Context analysis service failed: {getattr(oe, 'message', str(oe))}",
        )
    except Exception as exc:
        status_code = getattr(exc, "status_code", getattr(exc, "status", 502))
        logger.error(f"Error during AI context analysis [Status {status_code}]: {exc}")
        raise HTTPException(
            status_code=status_code if isinstance(status_code, int) and 400 <= status_code < 600 else 502,
            detail=f"AI Service call failed: {getattr(exc, 'message', str(exc))}",
        )



@router.post(
    "/generate-outline",
    response_model=OutlineGenerationResponse,
    status_code=status.HTTP_200_OK,
)
def generate_outline(
    request: OutlineGenerationRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Generates a structured, customizable document outline with sections, subsections,
    word count targets, and deterministic section IDs based on context metadata using Gemini AI.
    """
    try:
        response = ai_service.generate_outline(request)
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in AI outline generation: {ve}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service Configuration Error: {str(ve)}",
        )
    except (APIError, RateLimitError, AuthenticationError) as oe:
        logger.error(f"Gemini upstream failure during outline generation: {oe}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini API outline generation failed. Please check your GEMINI_API_KEY or try again later.",
        )
    except Exception as exc:
        logger.error(f"Error during AI outline generation: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service call failed: {str(exc)}",
        )


@router.post(
    "/draft-section",
    response_model=DraftSectionResponse,
    status_code=status.HTTP_200_OK,
)
def draft_section(
    request: DraftSectionRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Drafts publication-grade rich text content for an individual outline section using Gemini AI.
    Returns TipTap-compatible HTML, Markdown, calculated word count, and key takeaways.
    """
    try:
        response = ai_service.draft_section(request)
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in AI section drafting: {ve}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service Configuration Error: {str(ve)}",
        )
    except (APIError, RateLimitError, AuthenticationError) as oe:
        logger.error(f"Gemini upstream failure during section drafting: {oe}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini API section drafting failed. Please check your GEMINI_API_KEY or try again later.",
        )
    except Exception as exc:
        logger.error(f"Error during AI section drafting: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service call failed: {str(exc)}",
        )


@router.post(
    "/project-report/initiate",
    response_model=ProjectReportInitResponse,
    status_code=status.HTTP_200_OK,
)
def initiate_project_report(
    request: ProjectReportRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Initiates and validates a Project Report generation request pipeline.
    Enforces required non-empty title and non-empty domains list with 422 status validation errors.
    """
    if not request.title or not request.title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Project title is required",
        )

    cleaned_domains = [d.strip() for d in (request.domains or []) if d and d.strip()]
    if not cleaned_domains:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one domain must be selected",
        )

    try:
        return ProjectReportInitResponse(
            status="validated",
            doc_type="project_report",
            title=request.title.strip(),
            domains=cleaned_domains,
            message="Project report request validated successfully. Ready for context analysis.",
        )
    except Exception as exc:
        logger.error(f"Error during project report initiation: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="An error occurred during AI report processing. Please try again.",
        )


@router.post(
    "/project-report/analyze-context",
    response_model=ProjectReportContextResponse,
    status_code=status.HTTP_200_OK,
)
def analyze_project_context(
    request: ProjectReportRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Analyzes project report inputs (title, domains, abstract, additional context, reference files)
    using Gemini AI to extract structured context (problem statement, proposed solution, objectives, tech stack).
    """
    if not request.title or not request.title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Project title is required",
        )

    cleaned_domains = [d.strip() for d in (request.domains or []) if d and d.strip()]
    if not cleaned_domains:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one domain must be selected",
        )

    user_id = user.get("uid")

    try:
        response = ai_service.analyze_project_context(request, user_id=user_id)
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in AI project context analysis: {ve}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service Configuration Error: {str(ve)}",
        )
    except (APIError, RateLimitError, AuthenticationError) as oe:
        logger.error(f"Gemini upstream failure during project context analysis: {oe}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini API context analysis service failed. Please check your GEMINI_API_KEY or try again later.",
        )
    except Exception as exc:
        logger.error(f"Error during AI project context analysis: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI context analysis service failed. Please try again later.",
        )




@router.post(
    "/project-report/generate-outline",
    response_model=ProjectReportOutlineResponse,
    status_code=status.HTTP_200_OK,
)
def generate_project_report_outline(
    request: ProjectReportOutlineRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Generates a dynamic, non-rigid outline for a Project Report based on analyzed context using Gemini AI.
    Returns ordered sections with descriptions, DOM-friendly section IDs, and allocated word counts.
    """
    try:
        response = ai_service.generate_project_report_outline(request)
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in AI project outline generation: {ve}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service Configuration Error: {str(ve)}",
        )
    except (APIError, RateLimitError, AuthenticationError) as oe:
        logger.error(f"Gemini upstream failure during project outline generation: {oe}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini API outline generation failed. Please check your GEMINI_API_KEY or try again later.",
        )
    except Exception as exc:
        logger.error(f"Error during AI project outline generation: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI generation failed. Please try again.",
        )


@router.post(
    "/project-report/generate-sections",
    response_model=GenerateProjectReportSectionsResponse,
    status_code=status.HTTP_200_OK,
)
def generate_project_report_sections(
    request: GenerateProjectReportSectionsRequest,
    user: dict = Depends(verify_firebase_token),
):
    """
    Sequentially drafts content for all sections in a Project Report outline using Gemini AI.
    Enforces non-empty outline validation, narrative continuity, clean HTML formatting, and word count calculation.
    """
    if not request.outline or not request.outline.sections or len(request.outline.sections) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Outline must contain at least one section",
        )

    try:
        response = ai_service.generate_project_report_sections(request)
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in AI project section drafting: {ve}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Service Configuration Error: {str(ve)}",
        )
    except (APIError, RateLimitError, AuthenticationError) as oe:
        logger.error(f"Gemini upstream failure during project section drafting: {oe}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini API section drafting failed. Please check your GEMINI_API_KEY or try again later.",
        )
    except Exception as exc:
        logger.error(f"Error during AI project section drafting: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Section drafting failed. Please try again.",
        )
