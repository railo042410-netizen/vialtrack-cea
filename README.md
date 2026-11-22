# REPORTEVIALCEA

PWA mobile-first para el control digital de asistencia, horas dictadas, kilometraje y firmas de instructores en Centros de Enseñanza Automovilística (CEA).

- **GitHub:** https://github.com/railo042410-netizen/vialtrack-cea
- **Vercel:** https://vialtrack-cea.vercel.app

## Módulos

- **Registro de Instructor:** pensado para instalarse como PWA en el celular (incluye botón de instalación y captura de firmas táctiles).
- **Panel de Oficina:** diseñado para usarse en PC (KPIs, filtros, firmas, flota, instructores y **licencias**).

## Licencias

El módulo móvil exige activar un código de licencia antes de registrar. En el Panel de Oficina → **Licencias** puedes generar códigos, programar el cupo máximo de instructores y vehículos, definir vencimiento y activar una licencia global. El código de administración por defecto es `REPORTVIAL-ADMIN` (configurable con `VITE_ADMIN_LICENSE_KEY`).

## Ejecutar localmente

1. Copia `.env.example` a `.env.local` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. Instala dependencias:

   ```bash
   npm install --legacy-peer-deps
   # o: bun install
   ```

3. Arranca el servidor:

   ```bash
   npm run dev
   ```

   La app queda en http://localhost:3000.

## Base de datos

La sincronización en la nube usa Supabase. Ejecuta `supabase_schema.sql` en el SQL Editor de tu proyecto y sigue la guía completa en `SUPABASE_SETUP.md`.

El repositorio incluye `vercel.json` con el comando de instalación `npm install --legacy-peer-deps` y el directorio de salida `dist`.
