import React, { useState } from 'react';
import { AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { dataService } from '../services/dataService';

interface LicenseGateProps {
  onActivated: () => void;
}

/** Puerta de acceso por licencia para el módulo móvil de registro. */
export const LicenseGate: React.FC<LicenseGateProps> = ({ onActivated }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const license = dataService.validateLicenseCode(code);
    if (!license) {
      setError('Código no válido, desactivado o vencido.');
      return;
    }
    dataService.setActivatedCode(code);
    setError('');
    onActivated();
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Activar licencia
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              La licencia habilita toda la aplicación. Ingresa el código para
              acceder al Panel de Oficina y gestionar licencias, instructores y
              vehículos.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="license-code"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Código de licencia
            </label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--accent-text)' }}
              />
              <input
                id="license-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="RV-XXXX-XXXX"
                autoComplete="off"
                className="accent-focus w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-3 text-sm font-mono font-semibold tracking-wider text-slate-900 dark:text-slate-100 uppercase"
              />
            </div>
            {error && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-500">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-accent-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white min-h-[52px]"
          >
            <ShieldCheck className="w-5 h-5" />
            Activar y continuar
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Sin una licencia vigente no es posible usar la plataforma. El código
          de administrador por defecto es REPORTVIAL-ADMIN.
        </p>
      </div>
    </div>
  );
};
