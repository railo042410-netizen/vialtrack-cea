-- VialTrack CEA: esquema para Supabase (ejecutar en SQL Editor)
-- Cada tabla guarda el objeto de dominio completo en `data` (jsonb).

create table if not exists public.cea_registros (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cea_instructores (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cea_vehiculos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cea_licencias (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- La app no implementa autenticación: acceso público solo para prototipo.
-- En producción, añade Supabase Auth y restringe estas políticas por usuario/rol.
alter table public.cea_registros enable row level security;
alter table public.cea_instructores enable row level security;
alter table public.cea_vehiculos enable row level security;
alter table public.cea_licencias enable row level security;

drop policy if exists "cea_registros_publico" on public.cea_registros;
create policy "cea_registros_publico" on public.cea_registros
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "cea_instructores_publico" on public.cea_instructores;
create policy "cea_instructores_publico" on public.cea_instructores
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "cea_vehiculos_publico" on public.cea_vehiculos;
create policy "cea_vehiculos_publico" on public.cea_vehiculos
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "cea_licencias_publico" on public.cea_licencias;
create policy "cea_licencias_publico" on public.cea_licencias
  for all to anon, authenticated using (true) with check (true);

-- Realtime: la oficina y el móvil reciben cambios al instante.
do $$
begin
  alter publication supabase_realtime add table public.cea_registros;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.cea_instructores;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.cea_vehiculos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.cea_licencias;
exception when duplicate_object then null;
end $$;
