-- Dynamic RBAC schema for Supabase
-- Run this migration in the Supabase SQL editor or via Supabase CLI.

create extension if not exists pgcrypto;

alter table app_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists role_id uuid,
  add column if not exists invite_code text,
  add column if not exists invite_expires_at timestamptz;

create table if not exists app_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists app_permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists app_role_permissions (
  role_id uuid not null references app_roles(id) on delete cascade,
  permission_id uuid not null references app_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

alter table app_users
  add constraint app_users_role_id_fkey foreign key (role_id) references app_roles(id) on delete set null;

create unique index if not exists app_users_auth_user_id_uidx on app_users(auth_user_id) where auth_user_id is not null;
create unique index if not exists app_users_invite_code_uidx on app_users(invite_code) where invite_code is not null;

insert into app_roles (key, label, description, is_system)
values
  ('admin', 'Owner / Admin', 'Full access to all modules, team management and settings.', true),
  ('office_agent', 'Office Agent', 'Can access office operations such as customers, estimates, work orders, invoices and collections.', true),
  ('field_agent', 'Field Agent', 'Can access assigned field work orders and field execution tools.', true)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  is_system = excluded.is_system;

insert into app_permissions (key, label, description)
values
  ('admin:all', 'All permissions', 'Administrative override for all application permissions.'),
  ('team:manage', 'Manage team', 'Create invites, activate or disable users and manage access.'),
  ('office:access', 'Office access', 'Access administrative and office operations modules.'),
  ('field:access', 'Field access', 'Access field worker modules.'),
  ('settings:manage', 'Manage settings', 'Manage company and application settings.'),
  ('security:view', 'View security', 'View security dashboards and audit logs.'),
  ('finance:manage', 'Manage finance', 'Manage payments, income, expenses and payroll.'),
  ('documents:sign', 'Sign documents', 'Access document signing workflows.')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;

insert into app_role_permissions (role_id, permission_id)
select r.id, p.id
from app_roles r
join app_permissions p on p.key in ('admin:all', 'team:manage', 'office:access', 'field:access', 'settings:manage', 'security:view', 'finance:manage', 'documents:sign')
where r.key = 'admin'
on conflict do nothing;

insert into app_role_permissions (role_id, permission_id)
select r.id, p.id
from app_roles r
join app_permissions p on p.key in ('office:access', 'documents:sign')
where r.key = 'office_agent'
on conflict do nothing;

insert into app_role_permissions (role_id, permission_id)
select r.id, p.id
from app_roles r
join app_permissions p on p.key in ('field:access', 'documents:sign')
where r.key = 'field_agent'
on conflict do nothing;

update app_users u
set role_id = r.id
from app_roles r
where u.role_id is null
  and r.key = u.role;

create or replace function current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from app_users
  where auth_user_id = auth.uid()
    and active = true
  limit 1
$$;

create or replace function current_app_role_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(r.key, u.role)
  from app_users u
  left join app_roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1
$$;

create or replace function current_app_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct p.key), array[]::text[])
  from app_users u
  join app_roles r on r.id = u.role_id
  join app_role_permissions rp on rp.role_id = r.id
  join app_permissions p on p.id = rp.permission_id
  where u.auth_user_id = auth.uid()
    and u.active = true
$$;

create or replace function has_app_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from unnest(current_app_permissions()) as permission(key)
    where permission.key = permission_key or permission.key = 'admin:all'
  )
$$;

alter table app_users enable row level security;
alter table app_roles enable row level security;
alter table app_permissions enable row level security;
alter table app_role_permissions enable row level security;

drop policy if exists "app users read own or team manager" on app_users;
create policy "app users read own or team manager"
on app_users
for select
using (auth.uid() = auth_user_id or has_app_permission('team:manage'));

drop policy if exists "team managers update users" on app_users;
create policy "team managers update users"
on app_users
for update
using (has_app_permission('team:manage'))
with check (has_app_permission('team:manage'));

drop policy if exists "authenticated users read roles" on app_roles;
create policy "authenticated users read roles"
on app_roles
for select
to authenticated
using (true);

drop policy if exists "authenticated users read permissions" on app_permissions;
create policy "authenticated users read permissions"
on app_permissions
for select
to authenticated
using (true);

drop policy if exists "authenticated users read role permissions" on app_role_permissions;
create policy "authenticated users read role permissions"
on app_role_permissions
for select
to authenticated
using (true);

drop policy if exists "team managers manage roles" on app_roles;
create policy "team managers manage roles"
on app_roles
for all
using (has_app_permission('team:manage'))
with check (has_app_permission('team:manage'));

drop policy if exists "team managers manage role permissions" on app_role_permissions;
create policy "team managers manage role permissions"
on app_role_permissions
for all
using (has_app_permission('team:manage'))
with check (has_app_permission('team:manage'));
