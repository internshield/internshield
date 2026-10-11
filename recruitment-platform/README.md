# InternShield Recruitment Platform

An additive recruitment workspace. It lives in its own directory so the existing public website and member/student portals are not overwritten.

**Design:** Premium dark Liquid Glass UI  
**Stack:** Next.js, TypeScript, Supabase Auth, PostgreSQL, Row Level Security  
**Initial release:** Public opportunity discovery, email/password sign-up and sign-in, student applications, and an application dashboard.

## Local setup

1. Install Node.js 20.9+ and npm.
2. Create a Supabase project for this recruitment platform. Review the SQL migration before running it against any production database.
3. In Supabase SQL Editor, review and run supabase/migrations/202610110001_initial_recruitment.sql.
4. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
5. Run npm install, then npm run dev from this directory.
6. Open http://localhost:3000.

Never put a Supabase service-role key in browser code, a NEXT_PUBLIC variable, or Git.

## Deployment

Create a separate hosting project connected to this GitHub repository and set its Root Directory to recruitment-platform. Add the two environment variables in hosting settings, deploy, then connect a subdomain such as careers.internshield.in through the host's domain settings and DNS panel.

Keep internshield.in, intern.internshield.in, and member.internshield.in unchanged during rollout. The new recruitment app can be deployed independently and connected to the existing portals after testing.

## First administrator and company review

Create an account, find its UUID in Supabase Auth, and use SQL Editor to assign its profile role to admin. The migration includes a commented bootstrap statement. Never allow signup metadata or a public form to assign the admin role. Public sign-ups are student accounts. A trusted admin must review companies before their opportunities can be published.

## Included

- Responsive Liquid Glass homepage
- Live published opportunity listing, search, and domain filters
- Supabase email/password authentication
- Student application submission with duplicate protection
- Dashboard with application status
- Database constraints, indexes, and row-level security policies

## Next increments before public launch

- Company onboarding and admin review UI
- Recruiter workspace for publishing roles and managing applicants
- Private resume uploads with Storage policies
- Password reset, transactional email, abuse prevention and monitoring
- End-to-end tests, accessibility review, dependency audit, and RLS security review
- Controlled migration from the existing Google Sheets / Apps Script setup, including field mapping, duplicate handling, reconciliation, consent, and rollback

## Existing InternShield data

This app does not import or modify existing Google Sheets records. Keep the existing one-tab source of truth and Apps Script integrations running until migration has been tested on a copy and reconciled. Switch the source of truth only after explicit approval and a controlled migration.

## Security

The migration enables RLS on public tables, does not assign privileged roles from signup metadata, and uses database policies to enforce row access. Browser code uses only the publishable/anon key. Review policies in staging and complete an independent security review before using real candidate data.
