import re
from typing import List, Optional, Any
from pydantic import BaseModel, Field, model_validator



class ContextAnalysisRequest(BaseModel):
    title: str = Field(..., description="Project title")
    domains: List[str] = Field(default_factory=list, description="Selected domains")
    abstract: Optional[str] = Field(default="", description="User abstract or summary")
    reference_text: Optional[str] = Field(default="", description="Extracted reference document content")
    custom_requirements: Optional[str] = Field(default="", description="User customized requirements")


def _normalize_dict_keys(data: Any) -> Any:
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            snake_k = re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
            new_dict[snake_k] = _normalize_dict_keys(v)
        return new_dict
    elif isinstance(data, list):
        return [_normalize_dict_keys(item) for item in data]
    return data


class SectionSpecification(BaseModel):
    section_id: str = Field(..., description="Unique slug for the section")
    title: str = Field(..., description="Display title for the section")
    description: str = Field(..., description="Content guidelines for this section")
    target_word_count: int = Field(default=500, description="Recommended word count")

    @model_validator(mode='before')
    @classmethod
    def normalize_keys(cls, data: Any) -> Any:
        return _normalize_dict_keys(data)



# ─── String fields that Gemini sometimes returns as dicts/lists ───────────────
_STR_FIELDS = {
    "problem_statement", "methodology_summary", "proposed_solution",
    "approach", "project_title", "title", "target_audience",
}


def _coerce_str(value: Any) -> str:
    """Flatten any dict or list into a readable string."""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        # Concatenate all string values from the dict, separated by ". "
        parts = []
        for v in value.values():
            if isinstance(v, str) and v.strip():
                parts.append(v.strip())
            elif isinstance(v, (dict, list)):
                parts.append(_coerce_str(v))
        return " ".join(parts) if parts else ""
    if isinstance(value, list):
        return " ".join(
            _coerce_str(item) if not isinstance(item, str) else item
            for item in value
            if item
        )
    return str(value) if value is not None else ""


class ContextAnalysisResponse(BaseModel):
    project_title: str = Field(default="Project Report", description="Formal technical title of the project")
    domains: List[str] = Field(default_factory=list, description="Relevant technical domains")
    problem_statement: str = Field(default="", description="Core problem statement")
    objectives: List[str] = Field(default_factory=list, description="Primary technical objectives")
    functional_requirements: List[str] = Field(default_factory=list, description="Core system capabilities")
    technologies_and_tools: List[str] = Field(default_factory=list, description="Frameworks and tools")
    methodology_summary: str = Field(default="", description="Architectural or algorithmic approach")
    missing_information: List[str] = Field(default_factory=list, description="Gaps identified in user input")
    suggested_sections: List[SectionSpecification] = Field(default_factory=list, description="Proposed report outline")

    @model_validator(mode='before')
    @classmethod
    def normalize_keys(cls, data: Any) -> Any:
        d = _normalize_dict_keys(data)
        if isinstance(d, dict):
            # ── Coerce any str-typed field that Gemini returned as a dict/list ──
            for field in _STR_FIELDS:
                if field in d and not isinstance(d[field], str):
                    d[field] = _coerce_str(d[field])

            if not d.get("problem_statement"):
                d["problem_statement"] = (
                    d.get("problem") or d.get("problem_description")
                    or d.get("abstract") or "Core problem statement for the project."
                )
            if not d.get("methodology_summary"):
                d["methodology_summary"] = (
                    d.get("methodology") or d.get("proposed_solution")
                    or d.get("approach") or "System architectural and algorithmic methodology."
                )
            if not d.get("project_title"):
                d["project_title"] = d.get("title") or "Project Report"
        return d





class SectionDraft(BaseModel):
    section_id: str = Field(..., description="Section identifier")
    title: str = Field(..., description="Section title")
    content_html: str = Field(..., description="Generated TipTap semantic HTML content")
    word_count: int = Field(default=0, description="Calculated word count")


class GenerateSectionsRequest(BaseModel):
    context: Optional[ContextAnalysisResponse] = Field(default=None, description="Confirmed context analysis response")
    confirmed_context: Optional[ContextAnalysisResponse] = Field(default=None, description="Confirmed context analysis alias")
    tone: Optional[str] = Field(default="technical", description="Writing tone")
    custom_instructions: Optional[str] = Field(default=None, description="Additional custom instructions")

    @model_validator(mode='before')
    @classmethod
    def sync_context(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("context") and data.get("confirmed_context"):
                data["context"] = data["confirmed_context"]
            elif not data.get("confirmed_context") and data.get("context"):
                data["confirmed_context"] = data["context"]
        return data


class GenerateSectionsResponse(BaseModel):
    project_title: str = Field(default="", description="Project title")
    total_word_count: int = Field(default=0, description="Total word count")
    combined_html: str = Field(default="", description="Stitched HTML content for TipTap editor")
    sections: List[SectionDraft] = Field(default_factory=list, description="List of drafted sections")


class RegenerateSectionRequest(BaseModel):
    section_spec: SectionSpecification = Field(..., description="Specification for the section to regenerate")
    current_content: str = Field(..., description="Current HTML content of the section")
    user_feedback: str = Field(..., description="Feedback or instructions for regeneration")
    project_context: Optional[ContextAnalysisResponse] = Field(default=None, description="Project context")


class RegenerateSectionResponse(BaseModel):
    section_id: str = Field(..., description="Section identifier")
    title: str = Field(..., description="Section title")
    replacement_html: str = Field(..., description="Newly generated replacement HTML content")
    word_count: int = Field(..., description="Calculated word count of replacement HTML")


class ExportRequest(BaseModel):
    title: str = Field(default="Project Report", description="Document title for header")
    content_html: str = Field(default="", description="TipTap semantic HTML content to export")
    html_content: Optional[str] = Field(default=None, description="TipTap semantic HTML content alias")
    format: str = Field(default="docx", description="Target export format: 'docx' or 'pdf'")

    @model_validator(mode='before')
    @classmethod
    def sync_html_content(cls, data: Any) -> Any:
        if isinstance(data, dict):
            html = data.get("content_html") or data.get("html_content") or ""
            data["content_html"] = html
            data["html_content"] = html
        return data


ExportDocumentRequest = ExportRequest