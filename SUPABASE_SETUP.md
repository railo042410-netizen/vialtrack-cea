# Configuración de Supabase

La app funciona sin configuración (modo local). Para activar la sincronización en la nube entre el móvil y la oficina:

1. Crea un proyecto gratuito en [Supabase Dashboard](https://supabase.com/dashboard).
2. En **SQL Editor**, pega el contenido de `supabase_schema.sql` y pulsa **Run**. Eso crea `cea_registros`, `cea_instructores` y `cea_vehiculos`, sus políticas y el canal Realtime.

   > ⚠️ Las políticas permiten acceso público porque la app no tiene autenticación. Son aptas para un prototipo; para producción añade Supabase Auth y restringe el acceso por usuario/rol.

3. En **Project Settings → API**, copia el **Project URL** y la clave **anon/public**.
4. Copia `.env.example` a `.env.local` y rellena:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

5. Instala dependencias y reinicia el servidor:

   ```bash
   # Con bun (el repo trae bun.lock):
   bun install && bun run dev

   # Con npm (conflicto de peer-deps preexistente con esbuild):
   npm install --legacy-peer-deps
   npm run dev
   ```

## Comportamiento

- La app arranca vacía: no se suben datos de demostración. Las tablas son `cea_registros`, `cea_instructores`, `cea_vehiculos` y `cea_licencias` (esta última guarda licencias con cupos y vencimiento).
- Cada escritura/eliminación se guarda primero en la caché local (`localStorage`) y se encola; la cola se envía en cuanto hay conexión. El indicador de la cabecera muestra *Nube activa / Sincronizando (n) / Sin conexión*.
- Realtime mantiene el panel de oficina y los formularios actualizados cuando otro dispositivo modifica los datos.
- Si no hay conexión, los registros quedan como `pendiente_local` y se suben al recuperarse.
- **Vaciar datos** (en el panel de oficina) borra las cuatro tablas, tanto en local como en la nube.
