-- InternShield recruitment database (Neon PostgreSQL).
-- Run only against a NEW dedicated Neon database. Never point this at the existing
-- intern-registration spreadsheet or any existing production database.
begin;

create extension if not exists pgcrypto;

create type account_role as enum ('student', 'recruiter', 'admin');
create type company_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type opportunity_status as enum ('draft', 'published', 'paused', 'closed');
create type application_status as enum (
  'submitted', 'under_review', 'shortlisted', 'interview',
  'offered', 'accepted', 'rejected', 'withdrawn'
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  full_name text not null,
  role account_role not null default 'student',
  is_active boolean not null default true,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_lowercase check (email = lower(email)),
  constraint users_email_length check (char_length(email) between 5 and 254),
  constraint users_name_length check (char_length(full_name) between 2 and 120)
);
create unique index users_email_unique on users (email);

create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete restrict,
  name text not null,
  website text,
  industry text,
  description text,
  status company_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_name_length check (char_length(name) between 2 and 160)
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  title text not null,
  description text not null,
  domain text not null default 'General',
  location text not null default 'India',
  work_mode text not null default 'Remote'
    check (work_mode in ('Remote', 'Hybrid', 'On-site')),
  internship_type text not null default 'Internship',
  duration_weeks integer,
  stipend_min integer,
  stipend_max integer,
  skills text[] not null default '{}',
  application_deadline date,
  status opportunity_status not null default 'draft',
  created_by uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_title_length check (char_length(title) between 3 and 180),
  constraint opportunities_description_length check (char_length(description) between 10 and 12000),
  constraint opportunities_duration check (duration_weeks is null or duration_weeks between 1 and 104),
  constraint opportunities_stipend_min check (stipend_min is null or stipend_min >= 0),
  constraint opportunities_stipend_max check (
    stipend_max is null or (stipend_max >= 0 and (stipend_min is null or stipend_max >= stipend_min))
  )
);
create index opportunities_public_listing_idx on opportunities (created_at desc) where status = 'published';
create index opportunities_domain_idx on opportunities (domain);
create index opportunities_company_idx on opportunities (company_id, status);

create table applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete restrict,
  applicant_id uuid not null references users(id) on delete restrict,
  cover_letter text,
  resume_url text,
  status application_status not null default 'submitted',
  recruiter_notes text,
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, applicant_id),
  constraint applications_cover_letter_length check (cover_letter is null or char_length(cover_letter) <= 5000),
  constraint applications_resume_url_length check (resume_url is null or char_length(resume_url) <= 2048),
  constraint applications_recruiter_notes_length check (recruiter_notes is null or char_length(recruiter_notes) <= 5000)
);
create index applications_applicant_created_idx on applications (applicant_id, created_at desc);
create index applications_opportunity_status_idx on applications (opportunity_id, status, created_at desc);

create table interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes between 10 and 240),
  meeting_url text,
  interviewer_id uuid references users(id) on delete set null,
  notes text,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interviews_notes_length check (notes is null or char_length(notes) <= 5000)
);
create index interviews_application_idx on interviews (application_id, scheduled_at);

create table audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_created_idx on audit_events (created_at desc);
create index audit_events_actor_idx on audit_events (actor_id, created_at desc);

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger users_updated_at before update on users for each row execute function set_updated_at();
create trigger companies_updated_at before update on companies for each row execute function set_updated_at();
create trigger opportunities_updated_at before update on opportunities for each row execute function set_updated_at();
create trigger applications_updated_at before update on applications for each row execute function set_updated_at();
create trigger interviews_updated_at before update on interviews for each row execute function set_updated_at();

commit;
