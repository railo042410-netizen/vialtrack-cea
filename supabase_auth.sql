-- Seguridad real con Supabase Auth + RLS por rol
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de supabase_schema.sql

-- 1. Perfiles de usuario -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  document_id text,
  role text not null default 'instructor' check (role in ('admin', 'instructor')),
  created_at timestamptz not null default now()
);

-- Si ya existía un esquema de perfiles propio, ensure these columns.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists document_id text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- Helper: ¿es admin el usuario actual? (security definer evita recursión RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Primer usuario registrado = admin; los demás = instructor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when not exists (select 1 from public.profiles where role = 'admin')
      then 'admin' else 'instructor'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Políticas RLS -----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cea_registros enable row level security;
alter table public.cea_instructores enable row level security;
alter table public.cea_vehiculos enable row level security;
alter table public.cea_licencias enable row level security;

-- Perfiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Registros: admin ve todo; instructor solo los suyos (por documento).
drop policy if exists "cea_registros_publico" on public.cea_registros;
drop policy if exists "cea_registros_select" on public.cea_registros;
drop policy if exists "cea_registros_insert" on public.cea_registros;
drop policy if exists "cea_registros_update" on public.cea_registros;
drop policy if exists "cea_registros_delete" on public.cea_registros;

create policy "cea_registros_select" on public.cea_registros
  for select to authenticated
  using (
    public.is_admin()
    or data->>'instructorDocument' = (
      select document_id from public.profiles where id = auth.uid()
    )
  );

create policy "cea_registros_insert" on public.cea_registros
  for insert to authenticated
  with check (
    public.is_admin()
    or data->>'instructorDocument' = (
      select document_id from public.profiles where id = auth.uid()
    )
  );

create policy "cea_registros_update" on public.cea_registros
  for update to authenticated
  using (
    public.is_admin()
    or data->>'instructorDocument' = (
      select document_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or data->>'instructorDocument' = (
      select document_id from public.profiles where id = auth.uid()
    )
  );

create policy "cea_registros_delete" on public.cea_registros
  for delete to authenticated
  using (
    public.is_admin()
    or data->>'instructorDocument' = (
      select document_id from public.profiles where id = auth.uid()
    )
  );

-- Catálogos y licencias: admin escribe; instructor solo lectura.
drop policy if exists "cea_instructores_publico" on public.cea_instructores;
drop policy if exists "cea_vehiculos_publico" on public.cea_vehiculos;
drop policy if exists "cea_licencias_publico" on public.cea_licencias;

drop policy if exists "cea_instructores_select" on public.cea_instructores;
drop policy if exists "cea_instructores_write" on public.cea_instructores;
create policy "cea_instructores_select" on public.cea_instructores
  for select to authenticated using (true);
create policy "cea_instructores_write" on public.cea_instructores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cea_vehiculos_select" on public.cea_vehiculos;
drop policy if exists "cea_vehiculos_write" on public.cea_vehiculos;
create policy "cea_vehiculos_select" on public.cea_vehiculos
  for select to authenticated using (true);
create policy "cea_vehiculos_write" on public.cea_vehiculos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cea_licencias_select" on public.cea_licencias;
drop policy if exists "cea_licencias_write" on public.cea_licencias;
create policy "cea_licencias_select" on public.cea_licencias
  for select to authenticated using (true);
create policy "cea_licencias_write" on public.cea_licencias
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
