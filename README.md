# REPORTEVIALCEA

PWA mobile-first para el control digital de asistencia, horas dictadas, kilometraje y firmas de instructores en Centros de Enseñanza Automovilística (CEA).

- **GitHub:** https://github.com/railo042410-netizen/vialtrack-cea
- **Vercel:** https://vialtrack-cea.vercel.app

## Módulos

- **Registro de Instructor:** pensado para instalarse como PWA en el celular (incluye botón de instalación y captura de firmas táctiles).
- **Panel de Oficina:** diseñado para usarse en PC (KPIs, filtros, firmas, flota, instructores y **licencias**).

## Licencias

La licencia habilita **toda la app**: al abrirla se pide el código y luego se entra al Panel de Oficina. Desde el panel (botón **Licencia**) se generan códigos, se programan los cupos de instructores y vehículos, el vencimiento y se activa la licencia global.

Los instructores se registran en el Panel de Oficina con **nombre y cédula**. En el celular, el módulo *Registro de Instructor* se activa una sola vez ingresando ese nombre y cédula. El código de administración por defecto es `REPORTVIAL-ADMIN` (configurable con `VITE_ADMIN_LICENSE_KEY`).

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
