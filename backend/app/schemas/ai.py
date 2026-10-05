from typing import Optional, List, Any
from pydantic import BaseModel, Field, model_validator
from app.schemas.project_report import SectionSpecification


class ContextAnalysisRequest(BaseModel):
    """
    Schema for context extraction request.
    """
    topic: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Main topic, title, or core subject of the document"
    )
    abstract: Optional[str] = Field(
        default=None,
        description="Abstract, outline, or executive summary of the paper"
    )
    doc_type: str = Field(
        default="research_paper",
        description="Target document type (e.g. research_paper, project_report, custom)"
    )
    reference_file_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="List of uploaded reference file IDs to incorporate into analysis"
    )


class ContextAnalysisResponse(BaseModel):
    """
    Structured Pydantic schema for Gemini context analysis response.
    """
    domain: str = Field(
        ...,
        description="Inferred academic or industry domain (e.g., Computer Science, Healthcare, Finance)"
    )
    core_objectives: List[str] = Field(
        default_factory=list,
        description="Main objectives or research goals of the paper"
    )
    key_concepts: List[str] = Field(
        default_factory=list,
        description="Primary concepts, methodologies, or technical terms"
    )
    target_audience: str = Field(
        ...,
        description="Intended reader profile (e.g., Academic Researchers, Software Engineers, General Audience)"
    )


class OutlineSubsection(BaseModel):
    """
    Schema for a subsection within a document outline section.
    """
    title: str = Field(..., description="Title of the subsection")
    description: str = Field(..., description="Key points or main purpose of this subsection")
    estimated_word_count: Optional[int] = Field(
        default=300,
        description="Estimated word count target for this subsection"
    )


class OutlineSection(BaseModel):
    """
    Schema for a main section in a document outline.
    """
    section_id: str = Field(
        ...,
        description="Unique deterministic identifier for DOM/navigation (e.g., sec-intro, sec-methodology, sec-1)"
    )
    title: str = Field(..., description="Title of the main section")
    description: str = Field(..., description="High-level overview and key objectives of this section")
    estimated_word_count: Optional[int] = Field(
        default=600,
        description="Estimated total word count target for this section"
    )
    subsections: List[OutlineSubsection] = Field(
        default_factory=list,
        description="List of subsections under this main section"
    )


class OutlineGenerationRequest(BaseModel):
    """
    Request payload for AI document outline generation.
    """
    context: ContextAnalysisResponse = Field(
        ...,
        description="Context metadata produced by /api/ai/analyze-context"
    )
    doc_type: str = Field(
        default="research_paper",
        description="Document type (e.g. research_paper, project_report, custom)"
    )
    target_word_count: Optional[int] = Field(
        default=3000,
        description="Target word count for the entire document"
    )
    custom_instructions: Optional[str] = Field(
        default=None,
        description="Optional user instructions for custom sections or formatting focus"
    )


class OutlineGenerationResponse(BaseModel):
    """
    Structured Pydantic response schema for generated document outline.
    """
    doc_type: str = Field(default="research_paper", description="Document type")
    title: str = Field(..., description="Proposed document title based on context and objectives")
    total_estimated_word_count: int = Field(
        ...,
        description="Total sum of estimated word counts across all main sections"
    )
    sections: List[OutlineSection] = Field(
        default_factory=list,
        description="Ordered list of main document outline sections"
    )


class DraftSectionRequest(BaseModel):
    """
    Request payload for generating a full text draft for an individual outline section.
    """
    document_title: str = Field(..., description="Title of the overall document")
    doc_type: str = Field(default="research_paper", description="Document type")
    section: OutlineSection = Field(..., description="Outline section specification to draft")
    document_context: ContextAnalysisResponse = Field(
        ...,
        description="Global document context metadata (domain, objectives, audience)"
    )
    previous_section_summary: Optional[str] = Field(
        default=None,
        description="Brief summary of the preceding section to ensure narrative flow and avoid duplication"
    )
    tone: Optional[str] = Field(
        default="academic",
        description="Writing tone (e.g. academic, technical, concise, persuasive)"
    )
    custom_instructions: Optional[str] = Field(
        default=None,
        description="Specific user guidance or instructions for drafting this section"
    )


class DraftSectionResponse(BaseModel):
    """
    Structured Pydantic response schema for a generated section draft.
    """
    section_id: str = Field(..., description="Section identifier matching the request section_id")
    title: str = Field(..., description="Title of the drafted section")
    content_html: str = Field(
        ...,
        description="Clean, semantic HTML formatted for TipTap editor (<p>, <h2>, <h3>, <ul>, <ol>, <li>, <code>, <blockquote>)"
    )
    content_markdown: str = Field(
        ...,
        description="Markdown representation of the section content"
    )
    word_count: int = Field(..., description="Calculated word count of generated prose")
    key_takeaways: List[str] = Field(
        default_factory=list,
        description="Bullet list of main takeaways or summary points for this section"
    )

    @property
    def section_name(self) -> str:
        return self.title


SectionDraftResponse = DraftSectionResponse


class ProjectReportRequest(BaseModel):
    """
    Request payload schema for initiating a Project Report request pipeline.
    """
    doc_type: str = Field(
        default="project_report",
        description="Document type identifier"
    )
    title: str = Field(
        default="",
        description="Project report title (required, non-empty)"
    )
    domains: List[str] = Field(
        default_factory=list,
        description="Selected academic or industry domains (required, minimum 1 item)"
    )
    abstract: Optional[str] = Field(
        default="",
        description="Project abstract or summary"
    )
    additional_context: Optional[str] = Field(
        default="",
        description="Additional project context or requirements"
    )
    reference_file_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="List of uploaded reference file IDs"
    )


class ProjectReportInitResponse(BaseModel):
    """
    Structured acknowledgment response for Project Report initiation endpoint.
    """
    status: str = Field(
        default="validated",
        description="Validation status"
    )
    doc_type: str = Field(
        default="project_report",
        description="Document type"
    )
    title: str = Field(
        ...,
        description="Validated project report title"
    )
    domains: List[str] = Field(
        ...,
        description="Validated project domains"
    )
    message: str = Field(
        default="Project report request validated successfully. Ready for context analysis.",
        description="Acknowledgment message"
    )


class ProjectReportContextResponse(BaseModel):
    """
    Structured Pydantic response schema for AI Project Report context analysis.
    """
    domain: List[str] = Field(
        default_factory=list,
        description="Academic or industry domain categories relevant to the project"
    )
    domains: List[str] = Field(
        default_factory=list,
        description="Relevant technical domains, e.g. AI, Cloud"
    )
    project_title: str = Field(
        ...,
        description="Project report title"
    )
    problem_statement: str = Field(
        ...,
        description="Concise description of the core problem or challenge being addressed"
    )
    proposed_solution: str = Field(
        default="",
        description="Overview of the proposed technical architecture, solution, or system approach"
    )
    methodology_summary: str = Field(
        default="",
        description="Summary of the architectural or algorithmic approach"
    )
    core_objectives: List[str] = Field(
        default_factory=list,
        description="List of core technical goals and objectives of the project"
    )
    objectives: List[str] = Field(
        default_factory=list,
        description="Primary technical objectives"
    )
    technologies_and_methods: List[str] = Field(
        default_factory=list,
        description="Primary tech stack, frameworks, tools, algorithms, or methodologies used"
    )
    technologies_and_tools: List[str] = Field(
        default_factory=list,
        description="Frameworks, APIs, libraries, and tools"
    )
    target_audience: str = Field(
        default="Technical Evaluators, Engineers, and Project Stakeholders",
        description="Intended reader profile (e.g., Technical Evaluators, Software Engineers, Clients)"
    )
    key_terms: List[str] = Field(
        default_factory=list,
        description="Key domain terms, technical concepts, or keywords"
    )
    functional_requirements: List[str] = Field(
        default_factory=list,
        description="Core system functional capabilities"
    )
    missing_information: List[str] = Field(
        default_factory=list,
        description="Gaps or missing details in the user input"
    )
    suggested_sections: List[SectionSpecification] = Field(
        default_factory=list,
        description="Proposed report structure"
    )

    @model_validator(mode='before')
    @classmethod
    def sync_context_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if ("domains" in data or "domain" in data):
                domains_val = data.get("domains") or data.get("domain") or []
                if not isinstance(domains_val, list):
                    domains_val = [domains_val]
                data["domains"] = domains_val
                data["domain"] = domains_val

            if ("objectives" in data or "core_objectives" in data):
                objs_val = data.get("objectives") or data.get("core_objectives") or []
                data["objectives"] = objs_val
                data["core_objectives"] = objs_val

            if ("technologies_and_tools" in data or "technologies_and_methods" in data):
                tech_val = data.get("technologies_and_tools") or data.get("technologies_and_methods") or []
                data["technologies_and_tools"] = tech_val
                data["technologies_and_methods"] = tech_val

            if ("methodology_summary" in data or "proposed_solution" in data):
                sol_val = data.get("methodology_summary") or data.get("proposed_solution") or ""
                data["methodology_summary"] = sol_val
                data["proposed_solution"] = sol_val

            if "project_title" not in data and "title" in data:
                data["project_title"] = data["title"]
        return data



class ProjectReportOutlineSection(BaseModel):
    """
    Schema for a section in a Project Report outline.
    """
    section_id: str = Field(
        ...,
        description="Deterministic, URL/DOM-friendly section identifier (e.g., sec-problem-statement)"
    )
    title: str = Field(
        ...,
        description="Title of the section"
    )
    order: int = Field(
        default=1,
        description="Sequential order index of the section"
    )
    description: str = Field(
        ...,
        description="Detailed drafting instructions and focus points for this section"
    )
    estimated_word_count: int = Field(
        default=500,
        description="Estimated target word count allocation for this section"
    )
    subsections: List[str] = Field(
        default_factory=list,
        description="Subtopics or subsections under this main section"
    )


class ProjectReportOutlineRequest(BaseModel):
    """
    Request payload schema for dynamic Project Report outline generation.
    """
    context: ProjectReportContextResponse = Field(
        ...,
        description="Analyzed Project Report context from Phase 6B"
    )
    target_total_words: Optional[int] = Field(
        default=3000,
        description="Target total document word count"
    )
    custom_instructions: Optional[str] = Field(
        default=None,
        description="Optional user preferences or specific outline requests"
    )


class ProjectReportOutlineResponse(BaseModel):
    """
    Structured response schema for dynamic Project Report outline generation.
    """
    project_title: str = Field(
        ...,
        description="Project report title"
    )
    target_total_words: int = Field(
        ...,
        description="Actual aggregated target word count budget"
    )
    sections: List[ProjectReportOutlineSection] = Field(
        default_factory=list,
        description="Ordered list of dynamically generated report sections"
    )


class ProjectReportSectionDraft(BaseModel):
    """
    Schema for an individually drafted Project Report section.
    """
    section_id: str = Field(
        ...,
        description="DOM-friendly section identifier"
    )
    title: str = Field(
        ...,
        description="Section title"
    )
    order: int = Field(
        default=1,
        description="Sequential section order index"
    )
    content_html: str = Field(
        ...,
        description="Semantic HTML formatted prose for TipTap editor (<p>, <h3>, <ul>, <ol>, <code>, <blockquote>)"
    )
    word_count: int = Field(
        ...,
        description="Calculated word count of generated prose"
    )
    key_takeaways: List[str] = Field(
        default_factory=list,
        description="Bullet list of main takeaways for this section"
    )


class GenerateProjectReportSectionsRequest(BaseModel):
    """
    Request payload schema for section-by-section Project Report drafting.
    """
    project_title: str = Field(
        ...,
        description="Project report title"
    )
    context: ProjectReportContextResponse = Field(
        ...,
        description="Analyzed Project Report context from Phase 6B"
    )
    outline: ProjectReportOutlineResponse = Field(
        ...,
        description="Project Report outline from Phase 6C"
    )
    tone: Optional[str] = Field(
        default="technical",
        description="Writing tone (e.g., technical, academic, concise)"
    )


class GenerateProjectReportSectionsResponse(BaseModel):
    """
    Structured response schema containing all drafted sections and assembled HTML for TipTap.
    """
    project_title: str = Field(
        ...,
        description="Project report title"
    )
    total_word_count: int = Field(
        ...,
        description="Total word count across all drafted sections"
    )
    sections: List[ProjectReportSectionDraft] = Field(
        default_factory=list,
        description="List of individually drafted section objects"
    )
    combined_html: str = Field(
        ...,
        description="Concatenated HTML of all sections ready for TipTap injection"
    )




