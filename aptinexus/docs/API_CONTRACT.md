# AptiNexus API contract (frontend expectations)
Base URL: `VITE_API_BASE_URL` (default http://localhost:8000/api/v1). Set `VITE_USE_MOCK=false` to use it. Auth: `Authorization: Bearer <token>`.

| Method | Path | Body / response |
|---|---|---|
| POST | /auth/login, /auth/register | `{email,password[,name]}` → `{user, token}` |
| GET | /analytics/dashboard | `DashboardData` |
| GET/PUT | /profiles/me | `ProfileData` |
| GET/PUT | /projects | `Project[]` (whole list) |
| GET/PUT | /skillproof/evidence | `Evidence[]` |
| GET/PUT | /assessments/results | `Result[]` |
| GET/PUT | /users/me/settings | settings object |
| GET/PUT | /notifications/read | `string[]` of read ids |
| GET/PUT | /roadmaps/{careerId}/progress | `string[]` of completed task ids |
| GET | /careers, /careers/{id}, /skills, /resources, /assessments, /skillgraph | catalogs |

Not yet routed through the API layer (still static in the frontend): career matching, skill-gap analysis, what-if simulation, resume analysis. Verified SkillProof status must only be set by server-side review.
Types: see `src/types` and `src/data/*.ts`.
