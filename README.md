# DocAI — AI-Powered Document Generation Platform

DocAI is a full-stack web application for context-aware, AI-assisted multi-domain document generation. Users can create, edit, and export professional documents (Research Papers, Project Reports, Technical Docs, Business Reports, etc.) through a rich text editor powered by Gemini AI.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS, TipTap (rich text editor) |
| Backend | Python 3.13+, FastAPI, Uvicorn |
| AI Provider | Google Gemini (via OpenAI-compatible endpoint) |
| Auth | Firebase Authentication (Google + Email/Password) |
| Database | Cloud Firestore |
| Storage | Firebase Storage |

---

## Project Structure

```
doc ai/
├── frontend/       ← React + Vite web app
├── backend/        ← FastAPI Python server
├── firebase.json   ← Firestore config
├── firestore.rules ← Firestore security rules
└── .firebaserc     ← Firebase project alias
```

---

## Quick Start

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Copy and fill in your secrets
cp .env.example .env

# Start the dev server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend runs at: **http://127.0.0.1:8000**  
API docs: **http://127.0.0.1:8000/docs**

### 2. Frontend

```powershell
cd frontend
npm install

# Copy and fill in your secrets
cp .env.example .env

# Start the dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Environment Variables

### `backend/.env`
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (get from [aistudio.google.com](https://aistudio.google.com/apikey)) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON |
| `BACKEND_HOST` | Host (default: `127.0.0.1`) |
| `BACKEND_PORT` | Port (default: `8000`) |

### `frontend/.env`
| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_API_BASE_URL` | Backend URL (default: `http://127.0.0.1:8000`) |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Status check |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/auth/me` | Verify Firebase token |
| `POST` | `/api/documents/*` | Document CRUD |
| `POST` | `/api/ai/*` | AI generation |
| `POST` | `/api/storage/*` | File upload |
| `POST` | `/api/project-report/*` | Project report generation & export |
| `GET` | `/docs` | Swagger UI |
