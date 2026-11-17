# AptiNexus frontend

React + TypeScript + Vite + Tailwind, Framer Motion, React Three Fiber, Recharts.

## Run
    npm install
    npm run dev        # http://localhost:5173
    npm run build      # type-check + production build
Copy `.env.example` to `.env`. `VITE_API_BASE_URL` points at the FastAPI backend. API mode is the default; set `VITE_USE_MOCK=true` only to work offline with local catalog data.

## Data sources
Career, skill, resource and assessment catalogs are reference content served by the API. Profiles, projects, evidence, assessment results and roadmap progress are stored per account. Career matches and skill gaps use the signed-in user's saved records. Resume analysis extracts text for the user to review; it does not independently verify qualifications. A skill is marked **Verified** only after independent review.

## Structure
`src/services/api` (REST client + modules) · `src/services/mock` (optional local adapter) · `src/data` (catalog reference content) · `src/pages` · `src/components` · `src/contexts` · `src/hooks`.
The backend contract is in `docs/API_CONTRACT.md`. User data and catalogs go through the API layer.
The original logo is kept untouched in `design/`; the app uses a downscaled copy of the same artwork.

## Not yet verified
Built and type-checked only. Not tested in a browser, on mobile, with a screen reader, or on a low-end GPU. Check the 3D SkillGraph and its 2D fallback first.

