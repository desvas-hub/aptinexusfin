# AptiNexus preview deployment

This repository includes a Render Blueprint for a temporary end-to-end preview and a Vercel SPA rewrite for the React frontend.

## 1. Deploy the API and PostgreSQL

1. In Render, create a new Blueprint and select this GitHub repository.
2. Review the resources in `render.yaml`: one FastAPI web service and one PostgreSQL database in Singapore.
3. Render will ask for `CORS_ORIGINS`. You can enter the Vercel frontend URL after the frontend is created; use the exact origin only (for example, `https://your-project.vercel.app`), with no trailing slash or path.
4. Apply the Blueprint and wait for the API health check at `/health` to pass.

The API start command runs `alembic upgrade head` before Uvicorn. Production schema auto-creation is disabled and the generated `SECRET_KEY` is managed by Render.

## 2. Deploy the frontend

1. Import this GitHub repository into Vercel.
2. Use the Vite defaults: build command `npm run build`, output directory `dist`.
3. Add these environment variables for the Production environment:
   - `VITE_API_BASE_URL`: the Render API URL followed by `/api/v1` (for example, `https://your-api.onrender.com/api/v1`).
   - `VITE_USE_MOCK`: `false`.
4. Deploy the frontend and copy its exact HTTPS origin.
5. Return to Render and set `CORS_ORIGINS` to that exact origin, then redeploy the API if prompted.

## 3. First end-to-end test

- Open the Vercel URL and register a new test account.
- Confirm login, profile saving, career discovery, skill gaps, roadmap progress, assessments, SkillGraph and resume parsing.
- Use a small PDF or DOCX containing non-sensitive text when checking resume parsing.
- Confirm the API health endpoint returns `{"status":"ok","service":"aptinexus-api"}`.

## Preview-environment limitations

The Blueprint intentionally uses free Render plans to make a low-cost preview possible. Free services may sleep when idle, and the free PostgreSQL database is temporary and not suitable for permanent user data. Do not use this preview for real student records or rely on it as the production database. Before a public launch, select an appropriate paid service/database plan, configure backups and monitoring, and review the provider's current pricing and data-retention terms.

## Local development

The backend defaults to SQLite and `AUTO_CREATE_TABLES=true`. The frontend uses the API by default; set `VITE_USE_MOCK=true` only when intentionally using the local adapter.

