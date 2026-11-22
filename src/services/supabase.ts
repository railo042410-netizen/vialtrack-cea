import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * La app sigue funcionando en modo local (solo localStorage) si no hay
 * credenciales de Supabase. La nube se activa únicamente cuando están
 * configuradas las variables VITE_SUPABASE_* en .env.local.
 */
export const isCloudConfigured = Boolean(url && anonKey);

let client: SupabaseClient | undefined;

if (isCloudConfigured) {
  client = createClient(url, anonKey);
}

export const supabase = client;
