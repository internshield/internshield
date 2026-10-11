-- InternShield recruitment schema. Review and test in staging first.
create extension if not exists pgcrypto;
create schema if not exists private;
create type public.account_role as enum ('student','company','admin');
create type public.company_review_status as enum ('pending','approved','rejected');
create type public.opportunity_status as enum ('draft','published','paused','closed');
create type public.application_status as enum ('submitted','under_review','shortlisted','interview','offered','accepted','rejected','withdrawn');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', role public.account_role not null default 'student',
 phone text, city text, education_level text, institution text, graduation_year integer,
 skills text[] not null default '{}', resume_path text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint profile_name_length check (char_length(full_name)<=120),
 constraint profile_year_range check (graduation_year is null or graduation_year between 1950 and 2150)
);
create table public.companies (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null, website text, industry text, description text,
 review_status public.company_review_status not null default 'pending',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint company_name_length check (char_length(name) between 2 and 160)
);
create table public.opportunities (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 title text not null, description text not null, domain text not null default 'General',
 location text not null default 'India', work_mode text not null default 'Remote' check (work_mode in ('Remote','Hybrid','On-site')),
 internship_type text not null default 'Internship', duration_weeks integer, stipend_min integer, stipend_max integer,
 skills text[] not null default '{}', application_deadline date, status public.opportunity_status not null default 'draft',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint opportunity_title_length check (char_length(title) between 3 and 180),
 constraint opportunity_description_length check (char_length(description) between 10 and 12000),
 constraint opportunity_duration_positive check (duration_weeks is null or duration_weeks between 1 and 104),
 constraint opportunity_stipend_min check (stipend_min is null or stipend_min>=0),
 constraint opportunity_stipend_range check (stipend_max is null or (stipend_max>=0 and (stipend_min is null or stipend_max>=stipend_min)))
);
create table public.applications (
 id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 applicant_id uuid not null references public.profiles(id) on delete cascade, cover_letter text,
 status public.application_status not null default 'submitted', recruiter_notes text,
 status_updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(opportunity_id,applicant_id),
 constraint cover_letter_length check (cover_letter is null or char_length(cover_letter)<=5000)
);
create table public.audit_events (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
 event_type text not null, entity_type text not null, entity_id uuid, details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index opportunities_status_created_idx on public.opportunities(status,created_at desc);
create index opportunities_domain_idx on public.opportunities(domain);
create index applications_applicant_created_idx on public.applications(applicant_id,created_at desc);
create index applications_opportunity_status_idx on public.applications(opportunity_id,status);
create index companies_owner_idx on public.companies(owner_id);

-- Private helper functions avoid recursive RLS policy lookups on profiles/companies.
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') $$;
create or replace function private.current_role() returns public.account_role language sql stable security definer set search_path=''
as $$ select p.role from public.profiles p where p.id=(select auth.uid()) $$;
create or replace function private.owns_company(cid uuid) returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.companies c where c.id=cid and c.owner_id=(select auth.uid())) $$;
create or replace function private.owns_approved_company(cid uuid) returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.companies c where c.id=cid and c.owner_id=(select auth.uid()) and c.review_status='approved') $$;
revoke all on schema private from public,anon;
grant usage on schema private to anon,authenticated;
grant execute on function private.is_admin(),private.current_role(),private.owns_company(uuid),private.owns_approved_company(uuid) to anon,authenticated;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger companies_updated before update on public.companies for each row execute function public.set_updated_at();
create trigger opportunities_updated before update on public.opportunities for each row execute function public.set_updated_at();
create trigger applications_updated before update on public.applications for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=''
as $$ begin insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'student') on conflict(id) do nothing; return new; end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.opportunities enable row level security;
alter table public.applications enable row level security;
alter table public.audit_events enable row level security;

create policy profile_select_self_admin on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.is_admin()));
create policy profile_insert_self_student on public.profiles for insert to authenticated with check(id=(select auth.uid()) and role='student');
create policy profile_update_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()) and role=(select private.current_role()));
create policy profile_admin_all on public.profiles for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));

create policy company_select_approved_owner on public.companies for select to anon,authenticated using(review_status='approved' or owner_id=(select auth.uid()) or (select private.is_admin()));
create policy company_create_request on public.companies for insert to authenticated with check(owner_id=(select auth.uid()) and review_status='pending' and (select private.current_role())='student');
create policy company_admin_all on public.companies for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));

create policy opportunity_read_published_owner on public.opportunities for select to anon,authenticated using(status='published' or (select private.owns_company(company_id)) or (select private.is_admin()));
create policy opportunity_create_company on public.opportunities for insert to authenticated with check(status in ('draft','published') and (select private.owns_approved_company(company_id)) and (select private.current_role())='company');
create policy opportunity_update_company on public.opportunities for update to authenticated using((select private.owns_approved_company(company_id))) with check((select private.owns_approved_company(company_id)));
create policy opportunity_delete_company on public.opportunities for delete to authenticated using((select private.owns_approved_company(company_id)));
create policy opportunity_admin_all on public.opportunities for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));

create policy application_read_parties on public.applications for select to authenticated using(
 applicant_id=(select auth.uid()) or exists(select 1 from public.opportunities o where o.id=opportunity_id and (select private.owns_company(o.company_id))) or (select private.is_admin()));
create policy application_student_apply on public.applications for insert to authenticated with check(
 applicant_id=(select auth.uid()) and status='submitted' and recruiter_notes is null and (select private.current_role())='student'
 and exists(select 1 from public.opportunities o where o.id=opportunity_id and o.status='published'));
create policy application_recruiter_update on public.applications for update to authenticated using(
 exists(select 1 from public.opportunities o where o.id=opportunity_id and (select private.owns_approved_company(o.company_id))))
 with check(exists(select 1 from public.opportunities o where o.id=opportunity_id and (select private.owns_approved_company(o.company_id))));
create policy application_admin_all on public.applications for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy audit_admin_read on public.audit_events for select to authenticated using((select private.is_admin()));

grant usage on schema public to anon,authenticated;
grant select on public.companies,public.opportunities to anon,authenticated;
grant select,update on public.profiles to authenticated;
grant insert,update on public.companies to authenticated;
grant select,insert,update,delete on public.opportunities to authenticated;
grant select,insert on public.applications to authenticated;
grant update(status,recruiter_notes,status_updated_at,updated_at) on public.applications to authenticated;
grant select on public.audit_events to authenticated;

-- Bootstrap an admin only after creating the intended account and verifying its UUID:
-- update public.profiles set role='admin' where id='AUTH_USER_UUID';
-- Never expose a service-role key to the browser or commit secrets.
