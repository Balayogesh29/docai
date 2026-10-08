import os
import re
import json
import html
import time
import logging
# uuid removed — session IDs are now deterministic hashes
import hashlib
from typing import List, Optional, Union, Any
from pathlib import Path
from datetime import datetime, timezone

from app.config import settings

# ─── Checkpoint directory for saving intermediate analysis state ───
CHECKPOINTS_DIR = Path(__file__).resolve().parent.parent.parent / "checkpoints"
CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)

# ─── Suppress OpenAI SDK's OPENAI_API_KEY auto-detection ───
# The OpenAI Python SDK reads OPENAI_API_KEY from the environment by default.
# Since we use it solely as a transport layer for Gemini's OpenAI-compatible
# endpoint, we pre-seed the env var with the Gemini key to prevent
# "OPENAI_API_KEY is missing or invalid" errors on import/instantiation.
if settings.GEMINI_API_KEY and not os.environ.get("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = settings.GEMINI_API_KEY


from pydantic import ValidationError

from app.schemas.ai import (
    ContextAnalysisRequest,
    ContextAnalysisResponse,
    OutlineGenerationRequest,
    OutlineGenerationResponse,
    DraftSectionRequest,
    DraftSectionResponse,
    SectionDraftResponse,
    ProjectReportRequest,
    ProjectReportContextResponse,
    ProjectReportOutlineSection,
    ProjectReportOutlineRequest,
    ProjectReportOutlineResponse,
    ProjectReportSectionDraft,
    GenerateProjectReportSectionsRequest,
    GenerateProjectReportSectionsResponse,
)

from app.schemas.project_report import (
    ContextAnalysisResponse as ProjectReportContextAnalysisResponse,
    SectionSpecification,
    SectionDraft,
    GenerateSectionsRequest,
    GenerateSectionsResponse,
    RegenerateSectionRequest,
    RegenerateSectionResponse,
)


logger = logging.getLogger("docai.ai_service")


# Base directory for user upload files
UPLOADS_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))


# ─── Deterministic Session ID Helpers ───
# Generate session IDs from user ID + request content so:
# 1) Two users NEVER share a checkpoint folder.
# 2) Changed inputs hash to a fresh session ID, preventing stale cache reuse.

def _deterministic_session_id(prefix: str, user_id: Optional[str] = None, *args: str) -> str:
    """
    Creates a deterministic, stable session ID from user ID and request content.
    The same inputs always produce the same session_id, enabling cross-retry resume.
    Different user IDs or modified request parameters produce distinct session IDs.
    """
    uid = str(user_id or "anonymous").strip()
    combined = "|".join([uid] + [str(a) for a in args if a is not None])
    digest = hashlib.sha256(combined.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}-{uid}-{digest}"


# ─── Checkpoint Helpers ───
# Saves intermediate pipeline state as JSON after each step/section. Writes atomically
# using a temporary file. Never stores raw API key values (only 1-based key numbers).

def _checkpoint_save(session_id: str, step_name: str, data: Any,
                     api_pool: str = "", api_key_index: int = -1, status: str = "completed") -> str:
    """
    Atomically saves a checkpoint JSON file for a given pipeline session and step.
    Writes to a temporary .tmp file first, then atomically renames to .json.
    Key index stored in metadata is 1-based (Key 1..N).
    """
    session_dir = CHECKPOINTS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    if hasattr(data, "model_dump"):
        serializable = data.model_dump()
    elif hasattr(data, "dict"):
        serializable = data.dict()
    else:
        serializable = data

    # 1-based key number for metadata (Key 1, Key 2, etc.)
    key_num = api_key_index + 1 if api_key_index >= 0 else api_key_index

    temp_file = session_dir / f"{step_name}.tmp"
    final_file = session_dir / f"{step_name}.json"
    payload = {
        "session_id": session_id,
        "step": step_name,
        "status": status,
        "api_pool": api_pool,
        "api_key_index": key_num,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "timestamp": time.time(),
        "data": serializable,
    }

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False, default=str)

    temp_file.replace(final_file)
    logger.info(f"[Checkpoint] Saved: {step_name} → {final_file} (status={status})")
    return str(final_file)


def _checkpoint_load(session_id: str, step_name: str) -> Optional[dict]:
    """
    Loads a checkpoint JSON file for a given session and step ONLY if status == 'completed'.
    If status != 'completed', or if the JSON file is unreadable/corrupt, returns None without crashing.
    """
    checkpoint_file = CHECKPOINTS_DIR / session_id / f"{step_name}.json"
    if not checkpoint_file.exists():
        return None

    try:
        with open(checkpoint_file, "r", encoding="utf-8") as f:
            payload = json.load(f)

        if not isinstance(payload, dict):
            logger.warning(f"[Checkpoint] File {checkpoint_file} does not contain a valid JSON dict.")
            return None

        if payload.get("status") != "completed":
            logger.info(f"[Checkpoint] Step {step_name} in {session_id} has status='{payload.get('status')}' (not completed). Treating as incomplete.")
            return None

        logger.info(f"[Checkpoint] Loaded: {step_name} ← {checkpoint_file}")
        return payload.get("data")
    except Exception as e:
        logger.warning(f"[Checkpoint] Unreadable or corrupt JSON file {checkpoint_file}: {e}")
        return None


def _checkpoint_load_full(session_id: str, step_name: str) -> Optional[dict]:
    """
    Loads the full checkpoint envelope ONLY if status == 'completed'.
    If corrupt or status != 'completed', returns None without crashing.
    """
    checkpoint_file = CHECKPOINTS_DIR / session_id / f"{step_name}.json"
    if not checkpoint_file.exists():
        return None

    try:
        with open(checkpoint_file, "r", encoding="utf-8") as f:
            payload = json.load(f)
        if isinstance(payload, dict) and payload.get("status") == "completed":
            return payload
        return None
    except Exception as e:
        logger.warning(f"[Checkpoint] Unreadable or corrupt full checkpoint {checkpoint_file}: {e}")
        return None


def _get_session_key_index(session_id: str, pool_name: str, pool_len: int) -> int:
    """
    Reads the most recent completed checkpoint for session_id to retrieve the last working key index (0-based).
    Persists key state per-session on disk so server restarts or multiple users never interfere.
    Returns 0 if no checkpoint exists or if invalid.
    """
    if pool_len <= 0 or not session_id:
        return 0
    session_dir = CHECKPOINTS_DIR / session_id
    if not session_dir.exists():
        return 0

    latest_ts = -1.0
    last_key_idx = 0
    for fpath in session_dir.glob("*.json"):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                payload = json.load(f)
            if isinstance(payload, dict) and payload.get("status") == "completed":
                p_pool = str(payload.get("api_pool", "")).lower()
                if p_pool == pool_name.lower():
                    ts = payload.get("timestamp", 0.0)
                    if ts > latest_ts:
                        latest_ts = ts
                        k = payload.get("api_key_index", 1)
                        # k is 1-based key number; convert back to 0-based index
                        if isinstance(k, int) and 1 <= k <= pool_len:
                            last_key_idx = k - 1
        except Exception:
            continue
    return last_key_idx


def _checkpoint_list(session_id: str) -> List[str]:
    """Lists all completed checkpoint step names for a session."""
    session_dir = CHECKPOINTS_DIR / session_id
    if not session_dir.exists():
        return []
    completed_steps = []
    for f in session_dir.glob("*.json"):
        if _checkpoint_load(session_id, f.stem) is not None:
            completed_steps.append(f.stem)
    return sorted(completed_steps)


def _checkpoint_cleanup(session_id: str):
    """Removes all checkpoint files for a completed session."""
    session_dir = CHECKPOINTS_DIR / session_id
    if session_dir.exists():
        import shutil
        shutil.rmtree(session_dir, ignore_errors=True)
        logger.info(f"[Checkpoint] Cleaned up session: {session_id}")


def _calculate_html_word_count(html_content: str) -> int:
    """
    Decodes HTML entities and strips HTML tags, styles, and scripts to calculate accurate word count.
    """
    if not html_content:
        return 0
    text = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html_content, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    words = re.findall(r'\b\w+\b', text)
    return len(words)


def _extract_text_from_file(file_path: str) -> str:
    """
    Safely reads text content from a local uploaded file.
    Supports .txt files directly; falls back gracefully for other formats.
    """
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext in [".txt", ".md", ".csv", ".json"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        elif ext == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                text_parts = [page.extract_text() or "" for page in reader.pages]
                return "\n".join(text_parts).strip()
            except Exception:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    return "".join(c for c in content if c.isprintable() or c in "\n\r\t")
        elif ext in [".docx", ".doc"]:
            try:
                import docx
                doc = docx.Document(file_path)
                return "\n".join([p.text for p in doc.paragraphs]).strip()
            except Exception:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    return "".join(c for c in content if c.isprintable() or c in "\n\r\t")
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception as e:
        logger.warning(f"Could not extract text from file {file_path}: {e}")
        return ""


def get_reference_files_context(user_id: str, file_ids: List[str]) -> str:
    """
    Looks up uploaded files for user_id matching file_ids and extracts text content.
    """
    if not user_id or not file_ids:
        return ""

    user_dir = os.path.join(UPLOADS_BASE_DIR, user_id)
    if not os.path.exists(user_dir):
        return ""

    extracted_texts = []
    try:
        entries = os.listdir(user_dir)
    except Exception as e:
        logger.error(f"Error listing user uploads directory for user {user_id}: {e}")
        return ""

    for target_id in file_ids:
        matched_entry = None
        for entry in entries:
            if entry.startswith(f"{target_id}_") or entry == target_id:
                matched_entry = entry
                break

        if matched_entry:
            full_path = os.path.join(user_dir, matched_entry)
            text = _extract_text_from_file(full_path)
            if text:
                truncated_text = text[:10000]
                if matched_entry.startswith(f"{target_id}_"):
                    filename = matched_entry[len(target_id) + 1:]
                else:
                    filename = matched_entry
                extracted_texts.append(f"--- Reference File: {filename} ---\n{truncated_text}")

    return "\n\n".join(extracted_texts)


# ─── Helper: classify Gemini errors as rotatable ───

def _is_rotatable_error(exc: Exception) -> bool:
    """Returns True if the error should trigger key rotation within a pool."""
    status_code = getattr(exc, "status_code", getattr(exc, "status", getattr(exc, "code", getattr(exc, "code_", None))))
    error_body = getattr(exc, "body", getattr(exc, "message", str(exc)))
    error_str = str(error_body).lower() if error_body else ""

    return (
        status_code == 429
        or status_code in (401, 403)
        or "quota" in error_str
        or "rate limit" in error_str
        or "resource exhausted" in error_str
        or "limit" in error_str
    )


def _is_quota_error(exc: Exception) -> bool:
    """Returns True if the error is specifically a quota/rate-limit exhaustion."""
    status_code = getattr(exc, "status_code", getattr(exc, "status", getattr(exc, "code", getattr(exc, "code_", None))))
    error_body = getattr(exc, "body", getattr(exc, "message", str(exc)))
    error_str = str(error_body).lower() if error_body else ""

    return (
        status_code == 429
        or "quota" in error_str
        or "rate limit" in error_str
        or "resource exhausted" in error_str
    )


class AIService:
    """
    Gemini-Powered AI Service:
    All tasks (context analysis, outlining, section drafting, regeneration) are routed
    through Google Gemini via the OpenAI-compatible endpoint.

    Features:
    - Aggressive retry with exponential backoff (5 retries, 2s -> 4s -> 8s -> 16s -> 32s)
    - Clean, unified client management
    - Checkpoint-based recovery with deterministic session IDs (includes user_id)
    - Two independent key pools: Analysis (2 keys) and Content (4 keys)
    - Per-session key state (derived from checkpoint metadata, not in-memory globals)
    - No fallback model: when all keys in a pool are exhausted, stop cleanly and raise
    """

    def __init__(self):
        """No instance-level key state. Key indices are per-session via checkpoint metadata."""
        pass

    # --- Model Properties ---

    @property
    def gemini_model(self) -> str:
        return settings.GEMINI_MODEL

    @property
    def model(self) -> str:
        return self.gemini_model

    # ─── Client Creation ───

    def get_analysis_client(self) -> Any:
        """
        Returns a LangChain client for analysis tasks.
        """
        if not settings.is_analysis_key_configured:
            raise ValueError("Gemini Analysis API key is not configured.")
        from langchain_google_genai import ChatGoogleGenAI
        return ChatGoogleGenAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.effective_analysis_api_key,
            temperature=0.2,
            max_retries=0
        )

    def get_content_client(self) -> Any:
        """
        Returns a LangChain client for content generation tasks.
        """
        if not settings.is_content_key_configured:
            raise ValueError("Gemini Content API key is not configured.")
        from langchain_google_genai import ChatGoogleGenAI
        return ChatGoogleGenAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.effective_content_api_key,
            temperature=0.3,
            max_retries=0
        )

    def get_gemini_openai_client(self) -> Any:
        return self.get_content_client()

    def get_gemini_client(self):
        if settings.is_gemini_configured:
            try:
                from google import genai
                return genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.warning(f"Failed to initialize native Gemini Client: {e}")
        return None

    def get_client(self) -> Any:
        return self.get_gemini_openai_client()

    def _client_for_key(self, api_key: str, model: str, temperature: float) -> Any:
        """Creates a Langchain client for any arbitrary API key in the pool."""
        from langchain_google_genai import ChatGoogleGenAI
        return ChatGoogleGenAI(model=model, google_api_key=api_key, temperature=temperature, max_retries=0)

    # ─── Pool-Based Key Rotation ───
    # Two dedicated pools: analysis (keys 1-2) and generation (keys 3-6).
    # Each pool rotates independently — analysis never borrows generation keys.

    def _rotate_through_pool(
        self,
        pool: List[str],
        pool_name: str,
        model: str,
        messages: List[dict],
        temperature: float = 0.3,
        max_retries: int = 5,
        stage: str = "request",
        use_json_mode: bool = False,
        start_key_index: int = 0,
    ) -> tuple:
        """
        Core rotation engine: iterates through a specific key pool.
        For each key, runs _chat_completion with full retry. On 429/quota/auth,
        catches the exception and advances to next key in the pool.

        Returns a tuple of (result_text, key_index_used) so callers can track
        which key succeeded for checkpoint metadata.

        NO FALLBACK MODEL: When all keys in the pool are exhausted, stops cleanly,
        preserves all checkpoints, and raises so the process can be resumed later.
        """
        if not pool:
            raise ValueError(
                f"No valid keys in {pool_name}. "
                f"Configure the appropriate GEMINI_*_API_KEY in your .env file."
            )

        last_exception = None
        for offset in range(len(pool)):
            key_index = (start_key_index + offset) % len(pool)
            key = pool[key_index]
            masked = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else "[SHORT]"

            try:
                client = self._client_for_key(key, model, temperature)
                logger.info(
                    f"[{pool_name}] Trying key {key_index + 1}/{len(pool)} "
                    f"({masked}) for stage '{stage}' | model: {model}"
                )
                result = self._chat_completion(
                    client=client,
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_retries=max_retries,
                    stage=f"{stage}_{pool_name.lower()}_key{key_index + 1}",
                    use_json_mode=use_json_mode,
                )
                return (result, key_index)

            except Exception as e:
                last_exception = e

                if _is_rotatable_error(e) and offset < len(pool) - 1:
                    logger.warning(
                        f"[{pool_name}] Key {key_index + 1} exhausted "
                        f"(status={getattr(e, 'status_code', '?')}), rotating to next key..."
                    )
                    continue
                else:
                    logger.error(
                        f"[{pool_name}] All {len(pool)} keys exhausted or "
                        f"non-rotatable error for stage '{stage}': {e}"
                    )
                    raise

        if last_exception:
            raise last_exception
        raise Exception(f"All {len(pool)} {pool_name} keys exhausted for stage '{stage}'")

    # --- Core Chat Completion (used by _rotate_through_pool) ---
    # Executes one API call with exponential backoff.
    # No fallback model. Non-retryable errors propagate immediately.

    def _chat_completion(
        self,
        client: Any,
        model: str,
        messages: List[dict],
        temperature: float = 0.3,
        max_retries: int = 5,
        stage: str = "request",
        use_json_mode: bool = False,
    ) -> str:
        """
        Executes chat completion via Gemini's OpenAI-compatible endpoint.

        Retry strategy:
          - Max 5 attempts with exponential backoff (2s -> 4s -> 8s -> 16s -> 32s)
          - Non-retryable errors (404, 401, 403, 400, 422) raise immediately
          - Rate-limit / quota errors are propagated to _rotate_through_pool
            so the next key in the pool is tried
          - No fallback model switching
        """
        last_exception = None

        for attempt in range(1, max_retries + 1):
            try:
                from langchain_core.messages import SystemMessage, HumanMessage
                lc_messages = []
                for m in messages:
                    if m["role"] == "system":
                        lc_messages.append(SystemMessage(content=m["content"]))
                    else:
                        lc_messages.append(HumanMessage(content=m["content"]))
                
                if use_json_mode:
                    client_bound = client.bind(response_mime_type="application/json")
                    response = client_bound.invoke(lc_messages)
                else:
                    response = client.invoke(lc_messages)

                return response.content or ""

            except Exception as e:
                last_exception = e
                status_code = getattr(e, "status_code", getattr(e, "status", None))
                error_body = getattr(e, "body", getattr(e, "message", str(e)))
                error_str = str(error_body).lower() if error_body else ""

                logger.warning(
                    f"[Gemini] {stage} attempt {attempt}/{max_retries} failed. "
                    f"Model: {model}, Status: {status_code}, "
                    f"Error: {type(e).__name__}: {error_body}"
                )

                # -- Non-retryable: propagate immediately --
                if status_code == 404:
                    raise ValueError(
                        f"Model '{model}' not found on Gemini API. "
                        f"Verify the model name. Original error: {error_body}"
                    ) from e

                if status_code in (401, 403):
                    raise

                if status_code in (400, 422):
                    raise ValueError(
                        f"Invalid request for model '{model}'. "
                        f"The API rejected the request payload. "
                        f"Original error: {error_body}"
                    ) from e

                # -- Rate-limit / quota: propagate so pool rotates --
                if _is_quota_error(e):
                    raise

                # -- Transient / overloaded: backoff --
                if attempt < max_retries:
                    sleep_time = 2 ** attempt
                    logger.info(
                        f"[Gemini] Retrying in {sleep_time}s... "
                        f"(attempt {attempt}/{max_retries}, model: {model})"
                    )
                    time.sleep(sleep_time)

        if last_exception is not None:
            raise last_exception
        raise Exception(f"Failed to complete '{stage}' after {max_retries} retries")

    def _analysis_rotation(
        self,
        model: str,
        messages: List[dict],
        temperature: float = 0.3,
        max_retries: int = 5,
        stage: str = "analysis",
        use_json_mode: bool = False,
        session_id: str = "",
    ) -> tuple:
        """
        Routes through ANALYSIS POOL (Keys 1-2) only.
        Used for: context analysis, project context analysis.
        Will NOT borrow generation keys.
        Key start index is loaded per-session from checkpoint metadata.
        Returns (result_text, key_index_used).
        """
        pool = settings.analysis_key_pool
        start_idx = _get_session_key_index(session_id, "analysis", len(pool)) if session_id else 0
        result, key_idx = self._rotate_through_pool(
            pool=pool,
            pool_name="Analysis Pool",
            model=model,
            messages=messages,
            temperature=temperature,
            max_retries=max_retries,
            stage=stage,
            use_json_mode=use_json_mode,
            start_key_index=start_idx,
        )
        return (result, key_idx)

    def _generation_rotation(
        self,
        model: str,
        messages: List[dict],
        temperature: float = 0.3,
        max_retries: int = 5,
        stage: str = "generation",
        use_json_mode: bool = False,
        session_id: str = "",
    ) -> tuple:
        """
        Routes through GENERATION POOL (Content Keys 1-4) only.
        Used for: outline generation, section drafting, regeneration.
        Will NOT borrow analysis keys.
        Key start index is loaded per-session from checkpoint metadata.
        Returns (result_text, key_index_used).
        """
        pool = settings.generation_key_pool
        start_idx = _get_session_key_index(session_id, "content", len(pool)) if session_id else 0
        result, key_idx = self._rotate_through_pool(
            pool=pool,
            pool_name="Generation Pool",
            model=model,
            messages=messages,
            temperature=temperature,
            max_retries=max_retries,
            stage=stage,
            use_json_mode=use_json_mode,
            start_key_index=start_idx,
        )
        return (result, key_idx)

    # Backward-compatible aliases
    def _chat_completion_with_key_rotation(self, **kwargs) -> str:
        """Legacy alias — routes to generation pool by default. Returns just text."""
        result, _ = self._generation_rotation(**kwargs)
        return result

    def _chat_completion_with_content_fallback(self, **kwargs) -> str:
        """Legacy alias — routes to generation pool. Returns just text."""
        result, _ = self._generation_rotation(**kwargs)
        return result

    # ─── Helper ───

    def _calculate_html_word_count(self, html_content: str) -> int:
        return _calculate_html_word_count(html_content)

    # ─── Context Analysis ───

    def analyze_context(
        self,
        request: ContextAnalysisRequest,
        user_id: Optional[str] = None
    ) -> ContextAnalysisResponse:
        """
        Analyzes topic, abstract, and uploaded reference files to extract structured paper metadata using Gemini.
        Uses deterministic session ID for checkpoint-based recovery.
        Uses key rotation through the ANALYSIS key pool with try-catch failover.
        """
        ref_context = ""
        if user_id and request.reference_file_ids:
            ref_context = get_reference_files_context(user_id, request.reference_file_ids)

        system_instruction = (
            "You are an expert academic research assistant and domain analyst. "
            "Analyze the provided document topic, abstract, document type, and reference context. "
            "Extract structured context information strictly as a valid JSON object matching the required schema, "
            "including primary domain, core_objectives, key_concepts, and target_audience."
        )

        user_prompt = f"Document Type: {request.doc_type}\nTopic: {request.topic}\n"
        if request.abstract:
            user_prompt += f"Abstract/Summary: {request.abstract}\n"
        if ref_context:
            user_prompt += f"\nReference Materials:\n{ref_context}\n"

        user_prompt += (
            "\nPlease analyze the above input and extract structured project information in JSON format matching the required schema."
        )

        # -- Deterministic session ID from user_id + request content --
        session_id = _deterministic_session_id(
            "ctx", user_id, request.topic, request.doc_type, request.abstract or ""
        )

        # ── Check for existing completed checkpoint ──
        cached_result = _checkpoint_load(session_id, "02_context_analysis_result")
        if cached_result:
            logger.info(f"[Analysis Resume] Session {session_id} | Reusing cached result")
            try:
                return ContextAnalysisResponse(**cached_result)
            except Exception:
                logger.warning("[Analysis Resume] Cached result invalid, regenerating...")

        # ── Checkpoint: save input so recovery can reconstruct context ──
        _checkpoint_save(session_id, "01_input", {
            "topic": request.topic,
            "doc_type": request.doc_type,
            "abstract": request.abstract or "",
            "has_reference_files": bool(request.reference_file_ids),
        }, api_pool="analysis")
        logger.info(f"[Analysis Checkpoint] Session {session_id} | Step 01_input saved")

        try:
            # ── Use ANALYSIS POOL (keys 1-2) only ──
            raw_content, key_idx = self._analysis_rotation(
                model=self.gemini_model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_retries=5,
                stage="context_analysis",
                use_json_mode=True,
                session_id=session_id,
            )

            if not raw_content:
                raise RuntimeError("AI model returned an empty response.")

            result = ContextAnalysisResponse.model_validate_json(raw_content)

            # ── Checkpoint: save structured result ──
            _checkpoint_save(session_id, "02_context_analysis_result", {
                "domain": result.domain,
                "core_objectives": result.core_objectives,
                "key_concepts": result.key_concepts,
                "target_audience": result.target_audience,
            }, api_pool="analysis", api_key_index=key_idx)
            logger.info(f"[Analysis Checkpoint] Session {session_id} | Step 02_context_analysis_result saved")

            return result


        except ValidationError as ve:
            logger.error(f"[AI Context Analysis Error] Pydantic validation error: {ve}", exc_info=True)
            raise RuntimeError(f"Failed to parse AI output into valid ContextAnalysisResponse: {ve}")
        except Exception as e:
            _checkpoint_save(session_id, "failure_context_analysis", {"error": str(e)}, api_pool="analysis", status="failed")
            logger.error(f"[AI Context Analysis Error]: {e}", exc_info=True)
            raise e

    # ─── Project Context Analysis ───

    def analyze_project_context(
        self,
        request: ProjectReportRequest,
        user_id: Optional[str] = None
    ) -> ProjectReportContextAnalysisResponse:
        """
        Analyzes title, domains, abstract, additional context, and reference materials for a Project Report
        using Gemini in strict JSON mode to extract structured context analysis.

        CHECKPOINT RECOVERY:
        - Uses deterministic session_id derived from request content
        - Checks for existing completed checkpoint before calling the API
        - Saves granular checkpoints after each analysis step
        - On retry, loads existing checkpoints and skips completed steps
        """
        ref_context = ""
        if user_id and request.reference_file_ids:
            ref_context = get_reference_files_context(user_id, request.reference_file_ids)

        system_instruction = (
            "You are an expert academic project architect. Analyze the provided project requirements and return your output strictly in valid JSON matching the schema."
        )

        user_prompt = f"Project Title: {request.title}\nDomains: {', '.join(request.domains)}\n"
        if request.abstract:
            user_prompt += f"Abstract / Summary: {request.abstract}\n"
        if request.additional_context:
            user_prompt += f"Additional Context: {request.additional_context}\n"
        if ref_context:
            user_prompt += f"\nReference Materials:\n{ref_context}\n"

        user_prompt += (
            "\nPlease analyze the project information above and extract structured context in JSON format adhering strictly to the response schema."
        )

        # ─────────────────────────────────────────────────────────────────────
        # DETERMINISTIC SESSION ID
        # Same request content → same session_id → resume from checkpoints
        # ─────────────────────────────────────────────────────────────────────
        session_id = _deterministic_session_id(
            "prj", user_id, request.title, ",".join(request.domains),
            request.abstract or "", request.additional_context or ""
        )

        # ─────────────────────────────────────────────────────────────────────
        # CHECK FOR EXISTING COMPLETED RESULT
        # If the full structured context was already saved, return it directly.
        # ─────────────────────────────────────────────────────────────────────
        cached_full = _checkpoint_load(session_id, "08_structured_context")
        if cached_full:
            logger.info(
                f"[Analysis Resume] Session {session_id} | "
                f"Reusing completed 08_structured_context checkpoint"
            )
            try:
                return ProjectReportContextAnalysisResponse(**cached_full)
            except Exception as ex:
                logger.warning(f"[Analysis Resume] Cached full result invalid ({ex}), regenerating...")

        # ─────────────────────────────────────────────────────────────────────
        # GRANULAR CHECKPOINT PIPELINE
        # Every named step is persisted as its own JSON file immediately after
        # completion. Key rotation resumes from the last successful step file
        # so no completed step is ever reprocessed.
        # Steps:
        #   01_input.json              ← raw request fields
        #   02_project_understanding   ← project title + domains + abstract
        #   03_domain_analysis         ← result.domain / technologies
        #   04_objectives              ← result.objectives / core_objectives
        #   05_requirements            ← functional_requirements
        #   06_methodology             ← methodology_summary / proposed_solution
        #   07_components              ← key_terms / technologies_and_methods
        #   08_structured_context      ← full validated response dict
        # ─────────────────────────────────────────────────────────────────────

        # Step 01 — raw input
        if not _checkpoint_load(session_id, "01_input"):
            _checkpoint_save(session_id, "01_input", {
                "title": request.title,
                "domains": request.domains,
                "abstract": request.abstract or "",
                "additional_context": request.additional_context or "",
                "has_reference_files": bool(request.reference_file_ids),
            }, api_pool="analysis")
            logger.info(f"[Analysis Checkpoint] Session {session_id} | 01_input saved")

        # Step 02 — project understanding summary
        if not _checkpoint_load(session_id, "02_project_understanding"):
            _checkpoint_save(session_id, "02_project_understanding", {
                "title": request.title,
                "domains": request.domains,
                "abstract_preview": (request.abstract or "")[:300],
            }, api_pool="analysis")
            logger.info(f"[Analysis Checkpoint] Session {session_id} | 02_project_understanding saved")

        try:
            # ── Use ANALYSIS POOL (keys 1-2) only ──
            raw_content, key_idx = self._analysis_rotation(
                model=self.gemini_model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_retries=5,
                stage="project_context_analysis",
                use_json_mode=True,
                session_id=session_id,
            )

            if not raw_content:
                raise RuntimeError("AI model returned an empty response.")

            # Strip any markdown code fences before validating
            cleaned_content = re.sub(r"^```(?:json)?\s*", "", raw_content.strip(), flags=re.IGNORECASE)
            cleaned_content = re.sub(r"\s*```$", "", cleaned_content).strip()

            result = ProjectReportContextAnalysisResponse.model_validate_json(cleaned_content)

            # Step 03 — domain analysis
            _checkpoint_save(session_id, "03_domain_analysis", {
                "domain": result.domain if hasattr(result, "domain") else [],
                "domains": result.domains if hasattr(result, "domains") else [],
                "key_terms": result.key_terms if hasattr(result, "key_terms") else [],
            }, api_pool="analysis", api_key_index=key_idx)
            logger.info(f"[Analysis Checkpoint] Session {session_id} | 03_domain_analysis saved")

            # Step 04 — objectives
            _checkpoint_save(session_id, "04_objectives", {
                "objectives": result.objectives if hasattr(result, "objectives") else [],
                "core_objectives": result.core_objectives if hasattr(result, "core_objectives") else [],
            }, api_pool="analysis", api_key_index=key_idx)
            logger.info(f"[Analysis Checkpoint] Session {session_id} | 04_objectives saved")

            # Step 05 — requirements
            _checkpoint_save(session_id, "05_requirements", {
                "functional_requirements": result.functional_requirements if hasattr(result, "functional_requirements") else [],
            }, api_pool="analysis", api_key_index=key_idx)
            logger.info(f"[Analysis Checkpoint] Session {session_id} | 05_requirements saved")

            # Step 06 — methodology
            _checkpoint_save(session_id, "06_methodology", {
                "methodology_summary": result.methodology_summary if hasattr(result, "methodology_summary") else "",
                "proposed_solution": result.proposed_solution if hasattr(result, "proposed_solution") else "",
            }, api_pool="analysis", api_key_index=key_idx)
            logger.info(f"[Analysis Checkpoint] Session {session_id} | 06_methodology saved")

            # Step 07 — components / technologies
            _checkpoint_save(session_id, "07_components", {
                "technologies_and_methods": result.technologies_and_methods if hasattr(result, "technologies_and_methods") else [],
                "technologies_and_tools": result.technologies_and_tools if hasattr(result, "technologies_and_tools") else [],
                "key_terms": result.key_terms if hasattr(result, "key_terms") else [],
            }, api_pool="analysis", api_key_index=key_idx)
            logger.info(f"[Analysis Checkpoint] Session {session_id} | 07_components saved")

            # Step 08 — full structured context (source of truth for resume)
            result_dict = result.model_dump() if hasattr(result, "model_dump") else result.dict()
            _checkpoint_save(session_id, "08_structured_context", result_dict,
                             api_pool="analysis", api_key_index=key_idx)
            logger.info(
                f"[Analysis Checkpoint] Session {session_id} | 08_structured_context saved "
                f"| All 8 steps complete"
            )

            return result


        except ValidationError as ve:
            _checkpoint_save(session_id, "failure_project_context", {"error": str(ve)}, api_pool="analysis", status="failed")
            logger.error(f"[AI Project Context Error] Pydantic validation error: {ve}", exc_info=True)
            raise RuntimeError(f"Failed to parse AI output into valid ContextAnalysisResponse: {ve}")
        except Exception as e:
            _checkpoint_save(session_id, "failure_project_context", {"error": str(e)}, api_pool="analysis", status="failed")
            logger.error(f"[AI Project Context Error]: {e}", exc_info=True)
            raise e

    # ─── Project Report Outline Generation ───

    def generate_project_report_outline(
        self,
        request: ProjectReportOutlineRequest,
        user_id: Optional[str] = None,
    ) -> ProjectReportOutlineResponse:
        """
        Generates an adapted, non-rigid document outline for a Project Report based on analyzed context using Gemini.
        Enforces DOM-friendly section IDs, sequential order, positive word count allocations, and target aggregation.
        Uses the dedicated CONTENT GENERATION API key with key pool rotation.
        """
        system_instruction = (
            "You are a senior document architect and engineering lead. "
            "Your task is to generate a comprehensive, adapted document outline for a Project Report strictly as a valid JSON object "
            "based on the provided project context (title, domains, problem statement, proposed solution, "
            "core objectives, tech stack, and target audience).\n\n"
            "Requirements:\n"
            "1. Dynamically select and order sections matching the specific technical scope of the project. "
            "Select relevant modules (e.g. Introduction, Problem Statement, Objectives, Literature Review / Background, "
            "System Architecture, Detailed Methodology / Implementation, Testing & Validation, Results & Discussion, "
            "Advantages & Limitations, Conclusion & Future Work, References).\n"
            "2. Omit sections that are irrelevant to the specific project context (e.g. omit hardware/circuit requirements "
            "for purely software or cloud-native applications, or omit dataset collection for purely theoretical algorithms).\n"
            "3. For each section, provide a concise title, detailed writing guidance in `description`, and a realistic "
            "`estimated_word_count` such that the sum across sections approximates the target total word budget.\n"
            "4. Provide a URL/DOM-friendly `section_id` formatted as `sec-<kebab-case-title>` (e.g. `sec-problem-statement`)."
        )

        user_prompt = (
            f"Project Title: {request.context.project_title}\n"
            f"Domains: {', '.join(request.context.domain)}\n"
            f"Problem Statement: {request.context.problem_statement}\n"
            f"Proposed Solution: {request.context.proposed_solution}\n"
            f"Target Audience: {request.context.target_audience}\n"
            f"Target Total Word Count: {request.target_total_words or 3000}\n"
            f"Core Objectives:\n- " + "\n- ".join(request.context.core_objectives) + "\n"
            f"Technologies & Methods:\n- " + "\n- ".join(request.context.technologies_and_methods) + "\n"
            f"Key Terms:\n- " + "\n- ".join(request.context.key_terms) + "\n"
        )
        if request.custom_instructions:
            user_prompt += f"\nCustom Instructions / User Focus: {request.custom_instructions}\n"

        user_prompt += (
            "\nPlease generate the adapted Project Report outline in JSON format adhering strictly to the response schema."
        )

        # Deterministic session for outline checkpoint (includes user_id)
        session_id = _deterministic_session_id(
            "outline", user_id, request.context.project_title,
            ",".join(request.context.domain),
            str(request.target_total_words or 3000)
        )

        # Check for cached outline
        cached_outline = _checkpoint_load(session_id, "04_report_outline")
        if cached_outline:
            logger.info(f"[Outline Resume] Session {session_id} | Reusing cached outline")
            try:
                return ProjectReportOutlineResponse(**cached_outline)
            except Exception:
                logger.warning("[Outline Resume] Cached outline invalid, regenerating...")

        try:
            raw_content, key_idx = self._generation_rotation(
                model=self.gemini_model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_retries=5,
                stage="project_report_outline",
                use_json_mode=True,
                session_id=session_id,
            )

            if not raw_content:
                raise RuntimeError("AI model returned an empty Project Report outline response.")
            outline = ProjectReportOutlineResponse.model_validate_json(raw_content)

            # Post-processing pipeline
            total_words = 0
            for idx, sec in enumerate(outline.sections, start=1):
                sec.order = idx

                # Format section_id as sec-<kebab-case-title>
                raw_slug = re.sub(r'[^a-z0-9]+', '-', sec.title.lower()).strip('-')
                if not sec.section_id or not sec.section_id.startswith("sec-"):
                    sec.section_id = f"sec-{raw_slug}" if raw_slug else f"sec-{idx}"

                # Ensure estimated_word_count > 0
                if not sec.estimated_word_count or sec.estimated_word_count <= 0:
                    sec.estimated_word_count = 500

                total_words += sec.estimated_word_count

            outline.project_title = request.context.project_title
            outline.target_total_words = total_words

            # Save outline checkpoint
            outline_dict = outline.model_dump() if hasattr(outline, "model_dump") else outline.dict()
            _checkpoint_save(session_id, "04_report_outline", outline_dict,
                             api_pool="content", api_key_index=key_idx)

            return outline


        except ValidationError as ve:
            logger.error(f"[AI Project Outline Error] Pydantic validation error: {ve}", exc_info=True)
            raise RuntimeError(f"Failed to parse AI output into valid ProjectReportOutlineResponse: {ve}")
        except Exception as e:
            logger.error(f"[AI Project Outline Error]: {e}", exc_info=True)
            raise e

    # ─── Project Report Section Drafting ───

    def generate_project_report_sections(
        self,
        request: Any,
        user_id: Optional[str] = None,
    ) -> Any:
        """
        Sequentially generates publication-grade section prose for a Project Report using Gemini.

        CHECKPOINT SYSTEM:
        - Creates a DETERMINISTIC session_id from user_id + project title + section titles
          so retries after failures find and resume from existing checkpoints.
        - Saves each section draft as a JSON checkpoint after successful generation
        - On key exhaustion (429/quota), saves progress and rotates to the next key
        - Previously drafted sections are preserved and reused from checkpoints
        - A 'failed' checkpoint is treated as incomplete and regenerated

        KEY ROTATION:
        - Uses _generation_rotation for each section through the CONTENT POOL (4 keys)
        - Key start index is per-session (loaded from checkpoint metadata)
        - If a key fails mid-section, catches the error, logs progress, and raises so
          the caller can retry -- on retry, completed section checkpoints are found and skipped
        """
        model_name = self.gemini_model

        ctx = None
        project_title = "Project Report"
        sections_list = []
        tone = "technical"

        if isinstance(request, GenerateSectionsRequest):
            ctx = request.context or request.confirmed_context
            if ctx:
                project_title = getattr(ctx, "project_title", "Project Report")
                sections_list = getattr(ctx, "suggested_sections", [])
            tone = request.tone or "technical"
        elif isinstance(request, GenerateProjectReportSectionsRequest):
            ctx = request.context
            project_title = request.project_title
            sections_list = request.outline.sections if request.outline else []
            tone = request.tone or "technical"
        elif isinstance(request, ContextAnalysisResponse):
            ctx = request
            project_title = request.project_title
            sections_list = request.suggested_sections
        elif isinstance(request, dict):
            ctx = request.get("context") or request.get("confirmed_context") or request
            project_title = ctx.get("project_title", "Project Report") if isinstance(ctx, dict) else "Project Report"
            sections_list = ctx.get("suggested_sections") if isinstance(ctx, dict) else []

        # -- Build deterministic session ID from user_id + project title + section titles --
        section_titles_str = ",".join(
            getattr(s, "title", "") or (s.get("title", "") if isinstance(s, dict) else "")
            for s in (sections_list or [])
        )
        session_id = _deterministic_session_id("gen", user_id, project_title, section_titles_str)

        logger.info(
            f"[Generation Checkpoint] Starting session {session_id} | "
            f"Project: {project_title} | Sections: {len(sections_list)} | "
            f"Generation pool size: {len(settings.generation_key_pool)}"
        )

        # ── Check for existing completed final result ──
        cached_final = _checkpoint_load(session_id, "99_final_result")
        if cached_final and cached_final.get("status") == "completed":
            logger.info(f"[Generation Resume] Session {session_id} | Found completed final result, reassembling...")
            # Reassemble from section checkpoints
            return self._reassemble_from_checkpoints(
                session_id, sections_list, project_title, request
            )

        # Save the initial request context as checkpoint
        if not _checkpoint_load(session_id, "00_session_metadata"):
            _checkpoint_save(session_id, "00_session_metadata", {
                "project_title": project_title,
                "tone": tone,
                "total_sections": len(sections_list),
                "generation_pool_size": len(settings.generation_key_pool),
            }, api_pool="content")

        sections_drafted = []
        previous_summaries = []

        system_instruction = (
            "You are a publication-grade technical writer and domain expert drafting a section for a comprehensive Project Report. "
            "Write rich, detailed, factual, publication-quality technical prose matching the target word count.\n\n"
            "Requirements:\n"
            "1. Produce `content_html` using clean, semantic HTML tags (`<p>`, `<h3>`, `<ul>`, `<ol>`, `<li>`, `<code>`, `<blockquote>`, `<strong>`, `<em>`).\n"
            "2. Do NOT include the main section heading (e.g. <h2>{title}</h2>) inside `content_html`. Start directly with introductory paragraphs `<p>` or subsections `<h3>`.\n"
            "3. Do NOT wrap `content_html` in Markdown code fences (e.g. ```html ... ```).\n"
            "4. Maintain narrative continuity with previous section context without duplicating prior content.\n"
            "5. Provide 2 to 4 key takeaways in `key_takeaways`."
        )

        for sec_index, sec in enumerate(sections_list):
            if sec_index > 0:
                time.sleep(1.5)  # Slightly longer pacing for Gemini rate limits

            sec_id = getattr(sec, "section_id", None) or (sec.get("section_id") if isinstance(sec, dict) else f"sec-{sec_index+1}")
            sec_title = getattr(sec, "title", None) or (sec.get("title") if isinstance(sec, dict) else f"Section {sec_index+1}")
            sec_desc = getattr(sec, "description", None) or (sec.get("description") if isinstance(sec, dict) else "")
            sec_words = getattr(sec, "target_word_count", None) or getattr(sec, "estimated_word_count", None) or (sec.get("target_word_count") if isinstance(sec, dict) else 500)

            # ── Check if this section was already checkpointed ──
            step_name = f"section_{sec_index:02d}_{sec_id}"
            cached_data = _checkpoint_load(session_id, step_name)
            if cached_data:
                logger.info(
                    f"[Checkpoint Resume] SKIPPING section {sec_index + 1}/{len(sections_list)}: "
                    f"'{sec_title}' (already completed)"
                )
                sections_drafted.append(SectionDraft(
                    section_id=cached_data["section_id"],
                    title=cached_data["title"],
                    content_html=cached_data["content_html"],
                    word_count=cached_data["word_count"],
                ))
                if cached_data.get("summary"):
                    previous_summaries.append(cached_data["summary"])
                continue

            subsections_text = ""
            if hasattr(sec, "subsections") and sec.subsections:
                subsections_text = "\nSubsections to cover:\n- " + "\n- ".join(sec.subsections)

            prev_context_text = ""
            if previous_summaries:
                recent_context = previous_summaries[-2:]
                prev_context_text = "\nContext from Preceding Sections:\n" + "\n".join(recent_context) + "\n"

            domains_list = getattr(ctx, "domains", None) or getattr(ctx, "domain", None) or []
            domains_str = ", ".join(domains_list) if isinstance(domains_list, list) else str(domains_list)

            user_prompt = (
                f"Project Title: {project_title}\n"
                f"Domains: {domains_str}\n"
                f"Writing Tone: {tone}\n"
                f"Target Section Title: {sec_title}\n"
                f"Section Description: {sec_desc}\n"
                f"Target Word Count: ~{sec_words} words\n"
                f"{subsections_text}\n"
                f"{prev_context_text}\n"
                "\nPlease generate clean, semantic HTML prose for this section. Do NOT include the main <h2> section heading."
            )

            messages = [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt},
            ]

            # ── Try-catch with GENERATION POOL rotation for each section ──
            try:
                raw_content, key_idx = self._generation_rotation(
                    model=model_name,
                    messages=messages,
                    temperature=0.3,
                    max_retries=5,
                    stage=f"draft_section_{sec_title}",
                    session_id=session_id,
                )
            except Exception as e:
                # Save progress checkpoint as 'failed' before raising
                logger.error(
                    f"[Section Generation] Failed on section {sec_index + 1}/{len(sections_list)} "
                    f"'{sec_title}' after exhausting all keys: {e}"
                )
                _checkpoint_save(session_id, f"failure_at_section_{sec_index:02d}", {
                    "failed_section_index": sec_index,
                    "failed_section_title": sec_title,
                    "sections_completed": len(sections_drafted),
                    "error": str(e),
                    "completed_sections": [
                        {"section_id": s.section_id, "title": s.title, "word_count": s.word_count}
                        for s in sections_drafted
                    ],
                }, api_pool="content", status="failed")
                raise

            if not raw_content:
                raise RuntimeError(f"Failed to generate section draft for section '{sec_title}'.")

            # Clean code fence artifacts from content_html
            cleaned_html = re.sub(r"^```(?:html)?\s*", "", raw_content.strip(), flags=re.IGNORECASE)
            cleaned_html = re.sub(r"\s*```$", "", cleaned_html).strip()

            # Strip leading <h2> duplicate heading if LLM included it
            cleaned_html = re.sub(r'^\s*<h2[^>]*>.*?</h2>\s*', '', cleaned_html, flags=re.IGNORECASE | re.DOTALL)

            key_takeaways = []
            takeaway_matches = re.findall(r'<li>(.*?)</li>', cleaned_html, flags=re.IGNORECASE | re.DOTALL)
            if takeaway_matches:
                key_takeaways = [re.sub(r'<[^>]+>', '', t).strip() for t in takeaway_matches if re.sub(r'<[^>]+>', '', t).strip()][:4]
            if not key_takeaways:
                key_takeaways = [f"Key insights for {sec_title}"]

            word_count = _calculate_html_word_count(cleaned_html)

            section_draft = SectionDraft(
                section_id=sec_id,
                title=sec_title,
                content_html=cleaned_html,
                word_count=word_count,
            )
            sections_drafted.append(section_draft)

            takeaways_str = "; ".join(key_takeaways) if key_takeaways else sec_title
            summary_line = f"Section '{sec_title}': {takeaways_str}"
            previous_summaries.append(summary_line)

            # ── Save checkpoint after each successful section ──
            _checkpoint_save(session_id, step_name, {
                "session_id": session_id,
                "section_id": sec_id,
                "section_title": sec_title,
                "title": sec_title,
                "status": "completed",
                "content_html": cleaned_html,
                "word_count": word_count,
                "key_takeaways": key_takeaways,
                "summary": summary_line,
            }, api_pool="content", api_key_index=key_idx)

            logger.info(
                f"[Section Generation] Completed {sec_index + 1}/{len(sections_list)}: "
                f"'{sec_title}' ({word_count} words) | Session: {session_id} | Key: {key_idx + 1}"
            )

        # ── All sections complete — assemble final report ──
        combined_parts = [f'<h2 id="{s.section_id}">{s.title}</h2>\n{s.content_html}' for s in sections_drafted]
        combined_html = "\n\n".join(combined_parts)
        total_word_count = sum(s.word_count for s in sections_drafted)

        # Save final result checkpoint
        _checkpoint_save(session_id, "99_final_result", {
            "session_id": session_id,
            "project_title": project_title,
            "document_type": "project_report",
            "total_word_count": total_word_count,
            "sections_count": len(sections_drafted),
            "all_sections_completed": True,
            "status": "completed",
        }, api_pool="content")

        logger.info(
            f"[Section Generation] ✓ Session {session_id} completed | "
            f"{len(sections_drafted)} sections | {total_word_count} total words"
        )

        if isinstance(request, GenerateProjectReportSectionsRequest):
            old_drafts = [
                ProjectReportSectionDraft(
                    section_id=s.section_id,
                    title=s.title,
                    order=idx+1,
                    content_html=s.content_html,
                    word_count=s.word_count,
                    key_takeaways=[]
                )
                for idx, s in enumerate(sections_drafted)
            ]
            return GenerateProjectReportSectionsResponse(
                project_title=project_title,
                total_word_count=total_word_count,
                sections=old_drafts,
                combined_html=combined_html,
            )

        return GenerateSectionsResponse(
            project_title=project_title,
            total_word_count=total_word_count,
            combined_html=combined_html,
            sections=sections_drafted,
        )

    def _reassemble_from_checkpoints(
        self,
        session_id: str,
        sections_list: list,
        project_title: str,
        request: Any
    ) -> Any:
        """
        Reassembles a complete report from existing section checkpoint files.
        Used when the final checkpoint exists, indicating all sections were previously completed.
        """
        sections_drafted = []
        for sec_index, sec in enumerate(sections_list):
            sec_id = getattr(sec, "section_id", None) or (sec.get("section_id") if isinstance(sec, dict) else f"sec-{sec_index+1}")
            step_name = f"section_{sec_index:02d}_{sec_id}"
            cached_data = _checkpoint_load(session_id, step_name)
            if cached_data:
                sections_drafted.append(SectionDraft(
                    section_id=cached_data["section_id"],
                    title=cached_data["title"],
                    content_html=cached_data["content_html"],
                    word_count=cached_data["word_count"],
                ))
            else:
                logger.warning(f"[Reassemble] Missing checkpoint for {step_name} in session {session_id}")

        combined_parts = [f'<h2 id="{s.section_id}">{s.title}</h2>\n{s.content_html}' for s in sections_drafted]
        combined_html = "\n\n".join(combined_parts)
        total_word_count = sum(s.word_count for s in sections_drafted)

        if isinstance(request, GenerateProjectReportSectionsRequest):
            old_drafts = [
                ProjectReportSectionDraft(
                    section_id=s.section_id,
                    title=s.title,
                    order=idx+1,
                    content_html=s.content_html,
                    word_count=s.word_count,
                    key_takeaways=[]
                )
                for idx, s in enumerate(sections_drafted)
            ]
            return GenerateProjectReportSectionsResponse(
                project_title=project_title,
                total_word_count=total_word_count,
                sections=old_drafts,
                combined_html=combined_html,
            )

        return GenerateSectionsResponse(
            project_title=project_title,
            total_word_count=total_word_count,
            combined_html=combined_html,
            sections=sections_drafted,
        )

    # --- Single Section Regeneration ---

    def regenerate_single_section(
        self,
        section_spec: Any,
        current_content: str,
        user_feedback: str,
        project_context: Optional[Any] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        sec_index: Optional[int] = None,
    ) -> RegenerateSectionResponse:
        """
        Allows rewriting a single section without re-running the entire report using Gemini.
        ALWAYS generates fresh content (never reads from cache).
        Overwrites the existing section checkpoint so future resumes use the regenerated version.
        Uses the dedicated CONTENT GENERATION API key with key pool rotation.
        """
        model_name = self.gemini_model

        sec_id = getattr(section_spec, "section_id", None) or (section_spec.get("section_id") if isinstance(section_spec, dict) else "sec-regen")
        title = getattr(section_spec, "title", None) or (section_spec.get("title") if isinstance(section_spec, dict) else "Section")
        description = getattr(section_spec, "description", None) or (section_spec.get("description") if isinstance(section_spec, dict) else "")

        context_summary = ""
        if project_context:
            p_title = getattr(project_context, "project_title", "")
            p_problem = getattr(project_context, "problem_statement", "")
            context_summary = f"Project Title: {p_title}\nProblem Statement: {p_problem}\n"

        system_instruction = (
            "You are an expert technical editor and domain architect. "
            "Rewrite and refine the specified document section according to the user's feedback. "
            "Output ONLY clean, semantic HTML (<p>, <h3>, <ul>, <ol>, <li>, <code>, <blockquote>, <strong>, <em>). "
            "Do NOT include the main <h2> title. Do NOT wrap output in markdown code fences or ```html tags."
        )

        user_prompt = (
            f"Section Title: {title}\n"
            f"Section Guidelines: {description}\n"
            f"{context_summary}"
            f"\nCurrent HTML Content:\n{current_content}\n\n"
            f"User Feedback / Revision Instructions:\n{user_feedback}\n\n"
            "Please generate the revised replacement HTML content for this section."
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt},
        ]

        # ALWAYS call the API -- never check cache for regeneration
        raw_content = self._chat_completion_with_content_fallback(
            model=model_name,
            messages=messages,
            temperature=0.3,
            max_retries=5,
            stage=f"regenerate_section_{title}",
        )

        if not raw_content:
            raise RuntimeError(f"Failed to regenerate section content for section '{title}'.")

        cleaned_html = re.sub(r"^```(?:html)?\s*", "", raw_content.strip(), flags=re.IGNORECASE)
        cleaned_html = re.sub(r"\s*```$", "", cleaned_html).strip()
        cleaned_html = re.sub(r'^\s*<h2[^>]*>.*?</h2>\s*', '', cleaned_html, flags=re.IGNORECASE | re.DOTALL)

        word_count = _calculate_html_word_count(cleaned_html)

        # Overwrite the existing section checkpoint so future resumes use regenerated content
        if session_id and sec_index is not None:
            step_name = f"section_{sec_index:02d}_{sec_id}"
            _checkpoint_save(session_id, step_name, {
                "session_id": session_id,
                "section_id": sec_id,
                "section_title": title,
                "title": title,
                "status": "completed",
                "content_html": cleaned_html,
                "word_count": word_count,
                "regenerated": True,
                "user_feedback": user_feedback[:200],
            }, api_pool="content")
            logger.info(f"[Regeneration] Overwrote checkpoint {step_name} for session {session_id}")

        return RegenerateSectionResponse(
            section_id=sec_id,
            title=title,
            replacement_html=cleaned_html,
            word_count=word_count,
        )

    # ─── Document Outline Generation ───

    def generate_outline(
        self,
        request: OutlineGenerationRequest
    ) -> OutlineGenerationResponse:
        """
        Generates a structured, hierarchical document outline with deterministic section IDs
        and word count estimates using Gemini.
        Uses the dedicated CONTENT GENERATION API key with key pool rotation.
        """
        system_instruction = (
            "You are an expert academic writer, document architect, and technical editor. "
            "Your task is to generate a comprehensive, logically structured document outline strictly as a valid JSON object based on "
            "the provided domain context, core objectives, key concepts, target audience, document type, "
            "and target word count.\n\n"
            "Requirements:\n"
            "1. For each section, assign a unique, deterministic, lower-case, URL/DOM-friendly section_id "
            "(e.g., 'sec-intro', 'sec-lit-review', 'sec-methodology', 'sec-results', 'sec-discussion', 'sec-conclusion').\n"
            "2. Ensure every section and subsection has a realistic estimated_word_count such that the total sum "
            "approximates the requested target_word_count.\n"
            "3. Include structured subsections with clear titles and descriptions for every major section."
        )

        user_prompt = (
            f"Document Type: {request.doc_type}\n"
            f"Domain: {request.context.domain}\n"
            f"Target Audience: {request.context.target_audience}\n"
            f"Target Word Count: {request.target_word_count or 3000}\n"
            f"Core Objectives:\n- " + "\n- ".join(request.context.core_objectives) + "\n"
            f"Key Concepts:\n- " + "\n- ".join(request.context.key_concepts) + "\n"
        )
        if request.custom_instructions:
            user_prompt += f"Custom Instructions / User Focus: {request.custom_instructions}\n"

        user_prompt += (
            "\nPlease generate the document outline in JSON format adhering strictly to the response schema."
        )

        try:
            raw_content = self._chat_completion_with_content_fallback(
                model=self.gemini_model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_retries=5,
                stage="outline_generation",
                use_json_mode=True,
            )

            if not raw_content:
                raise RuntimeError("AI model returned an empty outline response.")
            outline = OutlineGenerationResponse.model_validate_json(raw_content)

            total_calc = 0
            for idx, sec in enumerate(outline.sections, 1):
                if not sec.section_id or not sec.section_id.strip():
                    sec.section_id = f"sec-{idx}"

                sec_sub_total = 0
                for sub in sec.subsections:
                    if not sub.estimated_word_count or sub.estimated_word_count <= 0:
                        sub.estimated_word_count = 300
                    sec_sub_total += sub.estimated_word_count

                if not sec.estimated_word_count or sec.estimated_word_count <= 0:
                    sec.estimated_word_count = max(sec_sub_total, 600)

                total_calc += sec.estimated_word_count

            if not outline.total_estimated_word_count or outline.total_estimated_word_count <= 0:
                outline.total_estimated_word_count = total_calc

            return outline


        except ValidationError as ve:
            logger.error(f"[AI Outline Generation Error] Pydantic validation error: {ve}", exc_info=True)
            raise RuntimeError(f"Failed to parse AI output into valid OutlineGenerationResponse: {ve}")
        except Exception as e:
            logger.error(f"[AI Outline Generation Error]: {e}", exc_info=True)
            raise e

    # ─── Section Drafting ───

    def draft_section(
        self,
        request: Optional[Union[DraftSectionRequest, str]] = None,
        document_title: Optional[str] = None,
        section_name: Optional[str] = None,
        section_requirements: str = "",
        document_context: Any = "",
        tone: str = "academic",
        target_word_count: int = 500,
    ) -> DraftSectionResponse:
        """
        Drafts publication-grade content for a specific document section using Gemini.
        Generates clean TipTap-compatible HTML, Markdown, word count, and key takeaways.
        Supports both DraftSectionRequest objects and direct keyword arguments.
        Uses the dedicated CONTENT GENERATION API key with key pool rotation.
        """
        model_name = self.gemini_model

        section_id = "sec-draft"
        previous_section_summary = ""
        custom_instructions = ""

        if isinstance(request, DraftSectionRequest):
            document_title = request.document_title
            section_name = request.section.title
            section_id = request.section.section_id
            section_requirements = request.section.description or ""
            tone = request.tone or "academic"
            target_word_count = request.section.estimated_word_count or 600
            previous_section_summary = request.previous_section_summary or ""
            custom_instructions = request.custom_instructions or ""

            context_parts = []
            if request.document_context:
                if hasattr(request.document_context, "domain") and request.document_context.domain:
                    domain_val = request.document_context.domain
                    domain_str = ", ".join(domain_val) if isinstance(domain_val, list) else str(domain_val)
                    context_parts.append(f"Domain: {domain_str}")
                if hasattr(request.document_context, "target_audience") and request.document_context.target_audience:
                    context_parts.append(f"Target Audience: {request.document_context.target_audience}")
                if hasattr(request.document_context, "core_objectives") and request.document_context.core_objectives:
                    context_parts.append("Core Objectives:\n- " + "\n- ".join(request.document_context.core_objectives))
                if hasattr(request.document_context, "key_concepts") and request.document_context.key_concepts:
                    context_parts.append("Key Concepts:\n- " + "\n- ".join(request.document_context.key_concepts))
            document_context = "\n".join(context_parts)
        elif isinstance(request, str) and not document_title:
            document_title = request

        doc_title_str = document_title or "Document"
        sec_name_str = section_name or "Section"

        system_instruction = (
            "You are a world-class academic writer, subject matter expert, and technical editor. "
            "Your task is to write high-quality, rigorous, publication-grade document sections based on "
            "the provided document title, section specification, document context, tone, and target word count.\n\n"
            "Requirements:\n"
            "1. Generate clean, semantic HTML using standard rich-text tags: "
            "`<p>`, `<h2>`, `<h3>`, `<ul>`, `<ol>`, `<li>`, `<code>`, `<blockquote>`, `<strong>`, `<em>`.\n"
            "2. Do NOT wrap `content_html` in Markdown code fences (e.g. ```html ... ```).\n"
            "3. Generate clean Markdown representation of the content.\n"
            "4. Match the requested tone (e.g., academic, technical, concise)."
        )

        user_prompt = (
            f"Document Title: {doc_title_str}\n"
            f"Section: {sec_name_str}\n"
            f"Requirements: {section_requirements}\n"
            f"Context: {document_context}\n"
            f"Target Word Count: ~{target_word_count} words"
        )
        if previous_section_summary:
            user_prompt += f"\nPrevious Section Context:\n{previous_section_summary}\n"
        if custom_instructions:
            user_prompt += f"\nCustom Instructions / Focus:\n{custom_instructions}\n"

        user_prompt += "\nPlease generate clean, publication-grade HTML prose for this section."

        try:
            raw_content = self._chat_completion_with_content_fallback(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_retries=5,
                stage=f"draft_section_{sec_name_str}",
            )

            if not raw_content:
                raise RuntimeError("Empty response from Gemini model.")

            # Clean possible markdown code fences from the HTML string
            cleaned_html = re.sub(r"^```(?:html)?\s*", "", raw_content.strip(), flags=re.IGNORECASE)
            cleaned_html = re.sub(r"\s*```$", "", cleaned_html).strip()

            # Strip leading <h2> duplicate heading if LLM included it
            cleaned_html = re.sub(r'^\s*<h2[^>]*>.*?</h2>\s*', '', cleaned_html, flags=re.IGNORECASE | re.DOTALL)

            plain_markdown = re.sub(r'<[^>]+>', ' ', cleaned_html).strip()
            word_count = self._calculate_html_word_count(cleaned_html)

            key_takeaways = []
            takeaway_matches = re.findall(r'<li>(.*?)</li>', cleaned_html, flags=re.IGNORECASE | re.DOTALL)
            if takeaway_matches:
                key_takeaways = [re.sub(r'<[^>]+>', '', t).strip() for t in takeaway_matches if re.sub(r'<[^>]+>', '', t).strip()][:5]
            if not key_takeaways:
                key_takeaways = [f"Key insights for {sec_name_str}"]

            return DraftSectionResponse(
                section_id=section_id,
                title=sec_name_str,
                content_html=cleaned_html,
                content_markdown=plain_markdown,
                word_count=word_count,
                key_takeaways=key_takeaways,
            )

        except Exception as e:
            logger.error(f"[AI Router] Section draft failed for {sec_name_str}: {e}")
            raise e

    # ─── Diagnostic Test ───

    def test_mistral_minimal(self) -> str:
        """
        Executes a minimal diagnostic test request to Gemini to verify API connectivity.
        Kept as test_mistral_minimal for backward compatibility with test scripts.
        Uses the dedicated CONTENT GENERATION API key with key pool rotation.
        """
        model = self.gemini_model
        messages = [
            {"role": "user", "content": "Analyze this sentence: AI is used to avoid collisions in mining robots."}
        ]
        return self._chat_completion_with_content_fallback(
            model=model,
            messages=messages,
            temperature=0.2,
            max_retries=5,
            stage="gemini_connectivity_test",
        )


ai_service = AIService()
