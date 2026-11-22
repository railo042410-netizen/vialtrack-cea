import React, { useState } from 'react';
import { LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(error.message);
      } else {
        const result = await signUp(
          email.trim(),
          password,
          fullName.trim()
        );
        const error = result.error;
        if (error) {
          setError(error.message);
        } else if (!('data' in result) || !result.data.session) {
          setNotice(
            'Registro creado. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.'
          );
          setMode('login');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-[#070B14] bg-ambient-mesh">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              REPORTEVIALCEA
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acceso seguro a la plataforma
            </p>
          </div>
        </div>

        <div className="mt-6 flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setNotice('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setNotice('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Registrarme
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5" noValidate>
          {mode === 'register' && (
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mínimo 6 caracteres)"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
          />

          {error && (
            <p className="rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-300">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-accent-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white min-h-[50px] disabled:opacity-60"
          >
            {mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {busy
              ? 'Espere…'
              : mode === 'login'
                ? 'Entrar'
                : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-slate-500 dark:text-slate-400">
          El primer usuario registrado se convierte en administrador. Los
          siguientes son instructores.
        </p>
      </div>
    </div>
  );
};
