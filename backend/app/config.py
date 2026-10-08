import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Resolve path to backend/.env relative to config.py location
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)


class Settings:
    """
    Application Settings configuration container.
    Gemini is the sole AI provider for all tasks (analysis, outlining, drafting).

    6-Key Split Pool Architecture:
      ANALYSIS POOL (Keys 1–2):
        - GEMINI_ANALYSIS_API_KEY_1  : primary analysis key
        - GEMINI_ANALYSIS_API_KEY_2  : secondary analysis key (failover)
      GENERATION POOL (Keys 3–6 / Content Keys 1-4):
        - GEMINI_CONTENT_API_KEY_1   : primary generation key
        - GEMINI_CONTENT_API_KEY_2   : secondary generation key
        - GEMINI_CONTENT_API_KEY_3   : tertiary generation key
        - GEMINI_CONTENT_API_KEY_4   : quaternary generation key

    Falls back to GEMINI_API_KEY if a specific key is not set.
    Uses OpenAI-compatible endpoint for seamless SDK integration.
    """
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_STORAGE_BUCKET: str = os.getenv("FIREBASE_STORAGE_BUCKET", "")
    FIREBASE_SERVICE_ACCOUNT_PATH: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")

    # ─── Gemini: Split Pool ───
    # Legacy / fallback single key (used if specific keys are absent)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # ANALYSIS POOL — Keys 1-2 (context analysis, project context analysis)
    GEMINI_ANALYSIS_API_KEY_1: str = os.getenv("GEMINI_ANALYSIS_API_KEY_1", os.getenv("GEMINI_ANALYSIS_API_KEY", ""))
    GEMINI_ANALYSIS_API_KEY_2: str = os.getenv("GEMINI_ANALYSIS_API_KEY_2", "")

    # GENERATION POOL — Keys 1-18 (outline generation, section drafting, regeneration)
    GEMINI_CONTENT_API_KEYS = [
        os.getenv(f"GEMINI_CONTENT_API_KEY_{i}", "") for i in range(1, 19)
    ]

    # Aliases for backward compatibility
    @property
    def GEMINI_ANALYSIS_API_KEY(self) -> str:
        return self.GEMINI_ANALYSIS_API_KEY_1

    @property
    def GEMINI_CONTENT_API_KEY(self) -> str:
        return self.GEMINI_CONTENT_API_KEYS[0]

    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    GEMINI_BASE_URL: str = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")

    @property
    def effective_analysis_api_key(self) -> str:
        """Returns the primary analysis API key, falling back to the generic key."""
        return (self.GEMINI_ANALYSIS_API_KEY_1.strip() or self.GEMINI_API_KEY.strip())

    @property
    def effective_content_api_key(self) -> str:
        """Returns the primary content generation API key, falling back to the generic key."""
        return (self.GEMINI_CONTENT_API_KEYS[0].strip() or self.GEMINI_API_KEY.strip())

    def _is_valid_key(self, key: str) -> bool:
        return bool(key and key.strip() and key.strip() != "demo_key_placeholder")

    def _build_pool(self, candidates: list) -> list:
        """Builds a deduplicated, ordered pool from a list of candidate keys."""
        seen = set()
        pool = []
        for key in candidates:
            stripped = key.strip() if key else ""
            if stripped and stripped not in seen and self._is_valid_key(stripped):
                seen.add(stripped)
                pool.append(stripped)
        return pool

    # ─── Split Key Pools ───

    @property
    def analysis_key_pool(self) -> list:
        """
        ANALYSIS POOL: Keys 1-2 only.
        Used exclusively for context analysis and project context analysis.
        """
        return self._build_pool([
            self.GEMINI_ANALYSIS_API_KEY_1,
            self.GEMINI_ANALYSIS_API_KEY_2,
        ])

    @property
    def generation_key_pool(self) -> list:
        """
        GENERATION POOL: Keys 1-18 only.
        Used exclusively for outline generation, section drafting, and regeneration.
        """
        return self._build_pool(self.GEMINI_CONTENT_API_KEYS)

    @property
    def key_pool(self) -> list:
        """
        Combined pool of ALL valid keys (for backward compatibility / diagnostics).
        """
        return self._build_pool([
            self.GEMINI_ANALYSIS_API_KEY_1,
            self.GEMINI_ANALYSIS_API_KEY_2,
        ] + self.GEMINI_CONTENT_API_KEYS + [self.GEMINI_API_KEY])

    # ─── Configuration Checks ───

    @property
    def is_gemini_configured(self) -> bool:
        """True if at least one Gemini key (analysis or content or generic) is set."""
        return (
            self._is_valid_key(self.GEMINI_ANALYSIS_API_KEY_1)
            or self._is_valid_key(self.GEMINI_CONTENT_API_KEY_1)
            or self._is_valid_key(self.GEMINI_API_KEY)
        )

    @property
    def is_analysis_key_configured(self) -> bool:
        """True if the dedicated analysis API key is set."""
        return self._is_valid_key(self.effective_analysis_api_key)

    @property
    def is_content_key_configured(self) -> bool:
        """True if the dedicated content generation API key is set."""
        return self._is_valid_key(self.effective_content_api_key)

    @property
    def is_content_key_2_configured(self) -> bool:
        """True if the secondary content generation API key is set."""
        return self._is_valid_key(self.effective_content_api_key_2)

    @property
    def is_ai_configured(self) -> bool:
        """AI is configured if at least one Gemini key is present."""
        return self.is_gemini_configured

    # Legacy compatibility alias
    @property
    def is_gemini_direct_configured(self) -> bool:
        return self.is_gemini_configured


settings = Settings()

# ─── Suppress OpenAI SDK's OPENAI_API_KEY auto-detection ───
_seed_key = settings.effective_content_api_key or settings.effective_analysis_api_key
if _seed_key and not os.environ.get("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = _seed_key

# Startup diagnostics
_logger = logging.getLogger("docai.config")
_logger.info("=== DocAI 6-Key Split Pool Configuration ===")
_logger.info(f"  Model:              {settings.GEMINI_MODEL}")
_logger.info(f"  Base URL:           {settings.GEMINI_BASE_URL}")
_logger.info(f"  ── ANALYSIS POOL (Keys 1-2) ──")
_logger.info(f"  Analysis key 1:     {settings._is_valid_key(settings.GEMINI_ANALYSIS_API_KEY_1)}")
_logger.info(f"  Analysis key 2:     {settings._is_valid_key(settings.GEMINI_ANALYSIS_API_KEY_2)}")
_logger.info(f"  Analysis pool size: {len(settings.analysis_key_pool)} keys")
_logger.info(f"  ── GENERATION POOL (Content Keys) ──")
for i, key in enumerate(settings.GEMINI_CONTENT_API_KEYS, start=1):
    _logger.info(f"  Content key {i}:      {settings._is_valid_key(key)}")
_logger.info(f"  Generation pool:    {len(settings.generation_key_pool)} keys")
_logger.info(f"  ── COMBINED ──")
_logger.info(f"  Total unique keys:  {len(settings.key_pool)}")

if not settings.is_gemini_configured:
    _logger.error(
        "  ✖ No Gemini API key is configured! "
        "Set GEMINI_ANALYSIS_API_KEY_1 and GEMINI_CONTENT_API_KEY_1 in your .env file. "
        "Get keys at https://aistudio.google.com/apikey"
    )
_logger.info("================================================")
