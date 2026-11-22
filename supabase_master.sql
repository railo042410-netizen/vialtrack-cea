-- Plataforma maestra: rol master, subcuentas y permisos
-- Ejecutar DESPUÉS de supabase_schema.sql y supabase_auth.sql

-- 1. Roles ------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role set default 'instructor';

-- admin = administrador de oficina; master = plataforma maestra (crea licencias y subcuentas)
create or replace function public.is_master()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'master'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'master')
  );
$$;

-- Un admin no puede auto-promoverse a master.
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin() and not public.is_master() or public.is_master())
  with check (
    (public.is_admin() and role <> 'master') or public.is_master()
  );

-- 2. Subcuentas -------------------------------------------------------------
create table if not exists public.cea_subcuentas (
  id text primary key,
  license_id text,
  email text not null,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.cea_subcuentas enable row level security;

drop policy if exists "cea_subcuentas_select" on public.cea_subcuentas;
create policy "cea_subcuentas_select" on public.cea_subcuentas
  for select to authenticated
  using (public.is_master() or public.is_admin());

drop policy if exists "cea_subcuentas_write" on public.cea_subcuentas;
create policy "cea_subcuentas_write" on public.cea_subcuentas
  for all to authenticated
  using (public.is_master()) with check (public.is_master());

do $$
begin
  alter publication supabase_realtime add table public.cea_subcuentas;
exception when duplicate_object then null;
end $$;

-- Para promover al primer administrador a master, ejecutar manualmente:
-- update public.profiles set role = 'master' where email = 'tu-correo@ejemplo.com';
