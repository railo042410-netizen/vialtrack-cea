import { createClient } from '@supabase/supabase-js';

/** Crea una subcuenta real en Supabase Auth. Solo usable por rol master. */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res
      .status(500)
      .json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sin sesión' });

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profile?.role !== 'master') {
    return res.status(403).json({ error: 'Solo el rol master puede crear subcuentas' });
  }

  const { email, password, fullName, licenseId, role } = req.body || {};
  if (!email || !password || String(password).length < 6) {
    return res
      .status(400)
      .json({ error: 'Correo y contraseña de al menos 6 caracteres requeridos' });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: String(email).trim(),
    password: String(password),
    email_confirm: true,
    user_metadata: { full_name: String(fullName || '').trim() },
  });
  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  const id = `sub-${Date.now().toString(36)}`;
  const { error: insertError } = await admin.from('cea_subcuentas').insert({
    id,
    license_id: licenseId || null,
    email: String(email).trim(),
    full_name: String(fullName || '').trim(),
    role: role === 'instructor' ? 'instructor' : 'admin',
    created_by: authData.user.id,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({ id, email: created.user.email });
}
