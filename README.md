# GradeAI — AI Exam Evaluation System

An AI-powered exam evaluation platform that uses Google Gemini for automated grading, MongoDB for persistent storage, and AWS S3 for file storage.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **File Storage:** AWS S3
- **AI:** Google Gemini + Google Cloud Vision

## Project Structure

```
exam-evaluator/
├── backend/          # FastAPI backend
│   ├── main.py       # App entry point
│   ├── rbac.py       # All API routes + MongoDB logic
│   ├── .env          # Your secrets (never commit this)
│   └── .env.example  # Template for environment variables
└── frontend/         # React frontend
    └── src/
        ├── pages/    # Page components
        └── lib/      # API client, auth, utilities
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- An AWS S3 bucket
- A Google Gemini API key

### 1. Clone the repo

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Open `backend/.env` and fill in:
- `MONGODB_URI` — your MongoDB Atlas connection string
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET_NAME` — from AWS IAM
- `JWT_SECRET_KEY` — any long random string

Also place your `google-creds.json` (Google Cloud service account) in the `backend/` folder.

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. First-time setup

On first run, visit `/bootstrap` to create the Global Owner (GOG) account. This is disabled after the first user is created.

## Roles

| Role | Access |
|------|--------|
| GOG (Global Owner) | Full platform access, manages institutes |
| Super Admin | Manages admins and schedules within an institute |
| Admin | Manages evaluators, approves work |
| Evaluator | Runs AI evaluations, uploads answer scripts |

## Environment Variables

See `backend/.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Database name (default: `gradeai`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `AWS_S3_BUCKET_NAME` | S3 bucket for file storage |
| `JWT_SECRET_KEY` | Secret for signing auth tokens |

## Notes

- `backend/.env` and `backend/google-creds.json` are gitignored — never commit these
- `venv/` and `node_modules/` are gitignored — run the install commands above after cloning
- If `MONGODB_URI` is left empty, the app falls back to local JSON file storage (for development only)
