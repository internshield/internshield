# InternShield Recruitment Platform

An additive recruitment platform and backend workspace. It lives under `recruitment-platform/` so the existing InternShield website and portals are not overwritten.

**Database:** Neon PostgreSQL  
**API:** Next.js Route Handlers + TypeScript  
**Validation:** Zod  
**Authentication:** bcrypt password hashes + signed short-lived JWT access tokens  
**Hosting direction:** Cloudflare-compatible deployment, with the exact runtime confirmed before production deployment.

## Current implementation phase

The Neon database schema and API are being built and verified first. Do not connect the existing production portals, change their URLs, or import live records until database and API tests pass and the migration plan is approved.

This repository's visual recruitment UI began as a Supabase-backed scaffold. The current API endpoints use Neon, but the UI has not yet been migrated from its temporary Supabase client. Do not deploy this as a finished, connected production application yet. The next phase will switch the new recruitment UI to the Neon API after the backend has been tested.

## API endpoints

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API and database connectivity check |
| POST | `/api/auth/register` | Public | Register a student account |
| POST | `/api/auth/login` | Public | Authenticate and receive a short-lived access token |
| GET | `/api/opportunities` | Public | List published opportunities from approved companies |
| POST | `/api/companies` | Recruiter/admin token | Submit a company profile for admin review |
| GET | `/api/admin/companies?status=pending` | Admin token | View the company review queue |
| PATCH | `/api/admin/companies/:id` | Admin token | Approve, reject, or suspend a company |
| POST | `/api/opportunities` | Recruiter/admin token | Create a draft opportunity for an approved company owned by the recruiter (admins can manage any approved company) |
| GET | `/api/applications` | Student token | List the signed-in student's applications |
| POST | `/api/applications` | Student token | Submit an application; duplicate applications are rejected |
| PATCH | `/api/admin/applications/:id` | Admin token | Change application status and record an audit event |

Requests with authentication must include `Authorization: Bearer <accessToken>`. Tokens currently expire after two hours. The API never returns password hashes.

## Database schema

The migration at `neon/migrations/0001_initial.sql` creates a dedicated recruitment schema containing:

- `users`: student, recruiter, and admin accounts
- `companies`: employer profiles and review status
- `opportunities`: internship/job listings
- `applications`: applications, statuses and recruiter notes
- `interviews`: interview scheduling data
- `audit_events`: administrative change history

Constraints and indexes support unique account emails, one application per student per opportunity, status validation, search/list queries, and audit lookups.

## Local setup

1. Install Node.js 20+ and npm.
2. Create a **new, dedicated Neon project/database** for recruitment. Do not assume the existing intern-registration spreadsheet is the recruitment database.
3. In Neon, copy the pooled connection string and place it in `DATABASE_URL` in a local `.env.local`. Keep the password private.
4. Generate a unique secret and set `AUTH_SECRET` (at least 32 characters). Do not commit `.env.local`.
5. Review `neon/migrations/0001_initial.sql` and run it against the new, empty Neon database using the Neon SQL Editor.
6. Run `npm install`, then `npm run typecheck`, `npm run build`, and `npm run dev`.
7. Open `http://localhost:3000/api/health`. It should return HTTP 200 with `database: "connected"` after the database and secrets are configured.

Example registration request:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Example Student","email":"student@example.com","password":"use-a-unique-long-password"}'
```

Use a test email and password only. Never paste production credentials into issues, chats, source files, or screenshots.

## Initial admin bootstrap

Public registration can create student accounts only. It cannot choose a privileged role. After creating a verified test account, promote the intended administrator manually from Neon SQL Editor only after confirming that account's ID:

```sql
UPDATE users SET role = 'admin' WHERE id = 'VERIFIED-USER-UUID';
```

Do not expose admin promotion through a public API. Add an auditable, authenticated admin-management workflow before onboarding production administrators.

## Verification checklist

- [ ] Apply migration to a new Neon database and confirm all tables, indexes, enums and triggers exist.
- [ ] `GET /api/health` returns HTTP 200 and reports a database connection.
- [ ] Register a student; confirm the stored password is a bcrypt hash, not plaintext.
- [ ] Duplicate registration returns HTTP 409.
- [ ] Login with correct credentials returns a token; incorrect credentials return HTTP 401.
- [ ] Public opportunities list returns only published listings for approved companies.
- [ ] Unauthenticated application requests return HTTP 401.
- [ ] A student can apply once to an open opportunity; duplicate application returns HTTP 409.
- [ ] A student token cannot call the admin status endpoint.
- [ ] Admin status changes create audit events.
- [ ] Run `npm run typecheck` and `npm run build`; inspect GitHub Actions CI result.

The GitHub Actions workflow checks TypeScript and builds the app. A green build is not a substitute for integration tests against a real staging database.

## Cloudflare and domain

Keep the GoDaddy domain registration and current Cloudflare DNS configuration unchanged. Database hosting is independent of domain registration. Before deployment, confirm whether the selected Cloudflare hosting product supports this Next.js Node.js runtime and the Neon serverless driver. If using Cloudflare Pages/Workers, use a compatible adapter/runtime and verify the deployed health endpoint before adding any custom domain. Do not switch existing production DNS records as part of backend development.

## Data protection and migration

- Existing Google Sheets and Apps Script integrations remain untouched during this phase.
- Do not import the intern-registration workbook until the actual recruitment data source and its field mappings are identified.
- Start with synthetic test records or a copy of the confirmed recruitment dataset.
- Preserve original IDs where appropriate, deduplicate only by an agreed rule, reconcile row counts and key fields, and retain a rollback/export path.
- Do not switch a portal's source of truth until functional tests, access-control tests, and reconciliation pass.

## Security and production gaps

Before real candidate data is used, add rate limiting and abuse controls, email verification/password reset, refresh/revocation strategy, request-origin/CORS policy for the eventual portal domains, recruiter/company ownership checks, private resume storage, and integration tests. Do not store access tokens in insecure browser storage when connecting the frontend. The initial endpoints are a development baseline and need a security review before public launch.
