import re

file_path = r"c:\Users\Balayogesh\Downloads\doc ai\backend\app\services\ai_service.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace get_analysis_client
old_1 = """    def get_analysis_client(self) -> OpenAI:
        \"\"\"
        Returns an OpenAI SDK client for analysis tasks (context analysis, project context analysis)
        using the dedicated analysis API key.
        \"\"\"
        if not settings.is_analysis_key_configured:
            raise ValueError(
                "Gemini Analysis API key is not configured. "
                "Set GEMINI_ANALYSIS_API_KEY in your .env file. "
                "Get a key at https://aistudio.google.com/apikey"
            )
        logger.info(
            f"[Gemini Analysis Client] Using analysis key | "
            f"Model: {settings.GEMINI_MODEL} | Base URL: {settings.GEMINI_BASE_URL}"
        )
        return OpenAI(
            api_key=settings.effective_analysis_api_key,
            base_url=settings.GEMINI_BASE_URL,
        )"""
new_1 = """    def get_analysis_client(self) -> Any:
        \"\"\"
        Returns a LangChain client for analysis tasks.
        \"\"\"
        if not settings.is_analysis_key_configured:
            raise ValueError("Gemini Analysis API key is not configured.")
        from langchain_google_genai import ChatGoogleGenAI
        return ChatGoogleGenAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.effective_analysis_api_key,
            temperature=0.2,
            max_retries=0
        )"""

# Replace get_content_client
old_2 = """    def get_content_client(self) -> OpenAI:
        \"\"\"
        Returns an OpenAI SDK client for content generation tasks (outline, drafting, regeneration)
        using the dedicated content generation API key.
        \"\"\"
        if not settings.is_content_key_configured:
            raise ValueError(
                "Gemini Content API key is not configured. "
                "Set GEMINI_CONTENT_API_KEY in your .env file. "
                "Get a key at https://aistudio.google.com/apikey"
            )
        logger.info(
            f"[Gemini Content Client] Using primary content key | "
            f"Model: {settings.GEMINI_MODEL} | Base URL: {settings.GEMINI_BASE_URL}"
        )
        return OpenAI(
            api_key=settings.effective_content_api_key,
            base_url=settings.GEMINI_BASE_URL,
        )"""
new_2 = """    def get_content_client(self) -> Any:
        \"\"\"
        Returns a LangChain client for content generation tasks.
        \"\"\"
        if not settings.is_content_key_configured:
            raise ValueError("Gemini Content API key is not configured.")
        from langchain_google_genai import ChatGoogleGenAI
        return ChatGoogleGenAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.effective_content_api_key,
            temperature=0.3,
            max_retries=0
        )"""

# Replace get_gemini_openai_client and get_client
old_3 = """    def get_gemini_openai_client(self) -> OpenAI:
        \"\"\"
        Legacy compatibility method — routes to content client by default.
        \"\"\"
        return self.get_content_client()

    def get_gemini_client(self):
        \"\"\"Returns native google.genai Client for Gemini (used for visual/diagram features).\"\"\"
        if settings.is_gemini_configured:
            try:
                from google import genai
                return genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.warning(f"Failed to initialize native Gemini Client: {e}")
        return None

    def get_client(self) -> OpenAI:
        return self.get_gemini_openai_client()"""
new_3 = """    def get_gemini_openai_client(self) -> Any:
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
        return self.get_gemini_openai_client()"""

content = content.replace(old_1, new_1)
content = content.replace(old_2, new_2)
content = content.replace(old_3, new_3)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done patching client methods in ai_service.py")
