import os
import re

file_path = r"c:\Users\Balayogesh\Downloads\doc ai\backend\app\services\ai_service.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove OpenAI imports
content = content.replace(
    "from openai import OpenAI, APIError, RateLimitError, AuthenticationError",
    ""
)

# 2. Update rotatable error helpers to check for "code" attribute (used by some Google API errors)
content = content.replace(
    'getattr(exc, "status_code", getattr(exc, "status", None))',
    'getattr(exc, "status_code", getattr(exc, "status", getattr(exc, "code", getattr(exc, "code_", None))))'
)

# 3. Update _client_for_key signature and implementation
old_client = """    def _client_for_key(self, api_key: str) -> OpenAI:
        \"\"\"Creates an OpenAI SDK client for any arbitrary API key in the pool.\"\"\"
        return OpenAI(
            api_key=api_key,
            base_url=settings.GEMINI_BASE_URL,
        )"""

new_client = """    def _client_for_key(self, api_key: str, model: str, temperature: float) -> Any:
        \"\"\"Creates a Langchain client for any arbitrary API key in the pool.\"\"\"
        from langchain_google_genai import ChatGoogleGenAI
        return ChatGoogleGenAI(model=model, google_api_key=api_key, temperature=temperature, max_retries=0)"""
content = content.replace(old_client, new_client)

# 4. Update the call to _client_for_key in _rotate_through_pool
content = content.replace(
    "client = self._client_for_key(key)",
    "client = self._client_for_key(key, model, temperature)"
)

# 5. Update _chat_completion to use LangChain
old_chat = """        for attempt in range(1, max_retries + 1):
            try:
                kwargs = dict(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                )
                if use_json_mode:
                    kwargs["response_format"] = {"type": "json_object"}

                response = client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content

                if isinstance(content, list):
                    content = "".join(
                        [c.text if hasattr(c, "text") else str(c) for c in content]
                    )

                return content or ""

            except Exception as e:"""

new_chat = """        for attempt in range(1, max_retries + 1):
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

            except Exception as e:"""
content = content.replace(old_chat, new_chat)

# 6. Remove specific OpenAI exception catches (since LangChain raises different errors, we rely on the generic Exception block which handles rotation properly via _is_rotatable_error)

# analyze_context
content = re.sub(
    r"        except \(APIError, RateLimitError, AuthenticationError\) as oe:.*?logger\.error.*?raise oe",
    "",
    content,
    flags=re.DOTALL
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done patching ai_service.py")
