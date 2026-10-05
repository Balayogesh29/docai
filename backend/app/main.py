import os
import logging
import traceback
from fastapi import FastAPI, Depends, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv

# Configure logging early so all docai.* diagnostics are visible
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-28s | %(levelname)-5s | %(message)s",
)

from app.auth.dependencies import verify_firebase_token
from app.firebase.admin import initialize_firebase_admin
from app.routes.documents import router as documents_router
from app.routes.storage import router as storage_router
from app.routes.ai import router as ai_router
from app.routes.project_report import router as project_report_router

# Load environment variables
load_dotenv()


logger = logging.getLogger("docai.main")

# Ensure Firebase Admin SDK is initialized on startup
initialize_firebase_admin()

app = FastAPI(
    title="DocAI API",
    description="FastAPI Backend for DocAI",
    version="1.0.0",
)

# Ensure local uploads directory exists and mount static files route
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


# Configure CORS with explicit origins
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = list(set([
    frontend_url,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catches unhandled server exceptions globally.
    Re-raises FastAPI/Starlette HTTP exceptions and validation errors so custom status codes
    (401, 403, 404, 413, 422) are preserved without being swallowed into generic 500 errors.
    """
    if isinstance(exc, (HTTPException, StarletteHTTPException, RequestValidationError)):
        raise exc

    logger.error(f"Unhandled server error on {request.method} {request.url}: {exc}")
    logger.error(traceback.format_exc())

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# Register routers
app.include_router(documents_router)
app.include_router(storage_router)
app.include_router(ai_router)
app.include_router(project_report_router)




@app.get("/")
def read_root():
    return {"message": "DocAI API is running"}


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/api/auth/me")
def get_current_user_profile(user: dict = Depends(verify_firebase_token)):
    """
    Protected endpoint to verify Firebase ID token and return safe identity information.
    """
    return {
        "authenticated": True,
        "uid": user.get("uid"),
        "email": user.get("email"),
        "email_verified": user.get("email_verified", False),
    }
