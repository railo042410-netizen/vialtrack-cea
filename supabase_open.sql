-- Modelo simplificado: la licencia controla la app; sin Auth ni roles.
-- Ejecutar en el SQL Editor para revertir las políticas de supabase_auth.sql.

drop trigger if exists on_auth_user_created on auth.users;

-- Políticas antiguas por rol / auth
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

drop policy if exists "cea_registros_select" on public.cea_registros;
drop policy if exists "cea_registros_insert" on public.cea_registros;
drop policy if exists "cea_registros_update" on public.cea_registros;
drop policy if exists "cea_registros_delete" on public.cea_registros;
drop policy if exists "cea_instructores_select" on public.cea_instructores;
drop policy if exists "cea_instructores_write" on public.cea_instructores;
drop policy if exists "cea_vehiculos_select" on public.cea_vehiculos;
drop policy if exists "cea_vehiculos_write" on public.cea_vehiculos;
drop policy if exists "cea_licencias_select" on public.cea_licencias;
drop policy if exists "cea_licencias_write" on public.cea_licencias;
drop policy if exists "cea_subcuentas_select" on public.cea_subcuentas;
drop policy if exists "cea_subcuentas_write" on public.cea_subcuentas;

-- Acceso público controlado por la licencia en la app (sin usuarios Auth).
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
