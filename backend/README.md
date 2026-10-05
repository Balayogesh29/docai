# DocAI Backend Foundation (Phase 4A)

This is the FastAPI backend foundation for **DocAI**, a Context-Aware Human-AI Collaborative Framework for Multi-Domain Document Generation.

## Technology Stack

- **Python**: 3.13+
- **Framework**: FastAPI
- **ASGI Server**: Uvicorn
- **Environment Management**: python-dotenv

---

## Getting Started

### 1. Create Virtual Environment

Navigate to the `backend` directory and create a virtual environment:

```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Windows (CMD)**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```
- **macOS / Linux**:
  ```bash
  source venv/bin/activate
  ```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Environment Configuration

Copy `.env.example` to `.env` if not already present:

```bash
cp .env.example .env
```

Default configuration (`.env`):
```env
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
```

---

## Running the Backend Server

Run the server with Uvicorn auto-reload:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Development server URL: **http://127.0.0.1:8000**

---

## Available Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Root endpoint returning application status message |
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/docs` | Interactive Swagger API documentation |
| `GET` | `/redoc` | ReDoc API documentation |

---

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to allow requests from the React frontend running locally at `http://localhost:5173`.
