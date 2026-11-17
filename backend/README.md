# AptiNexus API

FastAPI backend foundation for the AptiNexus React frontend.

## Local setup (Windows PowerShell)

From the repository root:

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

API health: http://127.0.0.1:8000/health  
Interactive API docs: http://127.0.0.1:8000/docs

The default local database is SQLite so the API can be started without installing PostgreSQL. To use PostgreSQL, set `DATABASE_URL` in your private `.env` file to a SQLAlchemy URL such as `postgresql+psycopg://postgres:password@localhost:5432/aptinexus`.

## Current scope

- Registration and login with Argon2 password hashing and signed JWT access tokens.
- Per-user profile, projects, evidence, assessment results, settings, notification-read state and roadmap progress stored in SQL.
- CORS configured for the local Vite development server.
- Health endpoint and Swagger docs.

Catalog and intelligence routes are placeholders until we migrate the frontend's sample career, skill, resource, assessment and graph datasets and implement their real services. Resume analysis and recommendations are not AI yet. Use the frontend's mock mode until catalog parity is implemented.

## Database migrations and deployment

Local development defaults to `AUTO_CREATE_TABLES=true`, which creates missing tables automatically for convenience. Production must use `AUTO_CREATE_TABLES=false` and run migrations before starting the API:

```powershell
cd backend
alembic upgrade head
```

The initial migration creates the `users` and `user_data` tables. Before deployment, set a strong random `SECRET_KEY`, configure a PostgreSQL `DATABASE_URL` and exact production `CORS_ORIGINS`, keep `AUTO_CREATE_TABLES=false`, run `alembic upgrade head`, and use a production-grade ASGI server. Add rate limiting and operational monitoring before opening the service publicly.
