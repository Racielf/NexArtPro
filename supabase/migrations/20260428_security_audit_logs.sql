-- Security audit logging for Supabase
-- Depends on 20260428_dynamic_rbac.sql

create table if not exists security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_users(id) on delete set null,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  severity text not null default 'info' check (severity in ('debug', 'info', 'warning', 'critical')),
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists security_audit_logs_created_at_idx on security_audit_logs(created_at desc);
create index if not exists security_audit_logs_actor_user_id_idx on security_audit_logs(actor_user_id);
create index if not exists security_audit_logs_action_idx on security_audit_logs(action);
create index if not exists security_audit_logs_resource_idx on security_audit_logs(resource_type, resource_id);
create index if not exists security_audit_logs_severity_idx on security_audit_logs(severity);

alter table security_audit_logs enable row level security;

drop policy if exists "security viewers can read audit logs" on security_audit_logs;
create policy "security viewers can read audit logs"
on security_audit_logs
for select
to authenticated
using (has_app_permission('security:view'));

-- No direct client inserts. Logs should be written through the security definer function below.
drop policy if exists "no direct audit log inserts" on security_audit_logs;
create policy "no direct audit log inserts"
on security_audit_logs
for insert
to authenticated
with check (false);

create or replace function write_security_audit_log(
  p_action text,
  p_resource_type text,
  p_resource_id text default null,
  p_severity text default 'info',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'Audit action is required';
  end if;

  if p_resource_type is null or length(trim(p_resource_type)) = 0 then
    raise exception 'Audit resource type is required';
  end if;

  if p_severity not in ('debug', 'info', 'warning', 'critical') then
    raise exception 'Invalid audit severity';
  end if;

  insert into security_audit_logs (
    actor_user_id,
    actor_auth_user_id,
    action,
    resource_type,
    resource_id,
    severity,
    metadata
  ) values (
    current_app_user_id(),
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_severity,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

create or replace function audit_app_user_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform write_security_audit_log(
      'team.user.created',
      'app_users',
      new.id::text,
      'info',
      jsonb_build_object(
        'role', coalesce(new.role, null),
        'role_id', coalesce(new.role_id::text, null),
        'active', new.active,
        'username', new.username
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.active is distinct from new.active then
      perform write_security_audit_log(
        case when new.active then 'team.user.activated' else 'team.user.disabled' end,
        'app_users',
        new.id::text,
        case when new.active then 'info' else 'warning' end,
        jsonb_build_object('previous_active', old.active, 'new_active', new.active)
      );
    end if;

    if old.role_id is distinct from new.role_id or old.role is distinct from new.role then
      perform write_security_audit_log(
        'team.user.role_changed',
        'app_users',
        new.id::text,
        'warning',
        jsonb_build_object(
          'previous_role', old.role,
          'new_role', new.role,
          'previous_role_id', old.role_id,
          'new_role_id', new.role_id
        )
      );
    end if;

    if old.auth_user_id is distinct from new.auth_user_id then
      perform write_security_audit_log(
        'team.user.auth_link_changed',
        'app_users',
        new.id::text,
        'critical',
        jsonb_build_object(
          'previous_auth_user_id', old.auth_user_id,
          'new_auth_user_id', new.auth_user_id
        )
      );
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    perform write_security_audit_log(
      'team.user.deleted',
      'app_users',
      old.id::text,
      'critical',
      jsonb_build_object('username', old.username, 'role', old.role, 'role_id', old.role_id)
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists app_users_audit_trigger on app_users;
create trigger app_users_audit_trigger
after insert or update or delete on app_users
for each row execute function audit_app_user_changes();

create or replace function audit_role_permission_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform write_security_audit_log(
      'rbac.role_permission.added',
      'app_role_permissions',
      new.role_id::text || ':' || new.permission_id::text,
      'warning',
      jsonb_build_object('role_id', new.role_id, 'permission_id', new.permission_id)
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform write_security_audit_log(
      'rbac.role_permission.removed',
      'app_role_permissions',
      old.role_id::text || ':' || old.permission_id::text,
      'warning',
      jsonb_build_object('role_id', old.role_id, 'permission_id', old.permission_id)
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists app_role_permissions_audit_trigger on app_role_permissions;
create trigger app_role_permissions_audit_trigger
after insert or delete on app_role_permissions
for each row execute function audit_role_permission_changes();
