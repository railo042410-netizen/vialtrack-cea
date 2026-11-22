import React, { useState } from 'react';
import { AlertCircle, Check, KeyRound, ShieldCheck, X } from 'lucide-react';
import { dataService } from '../services/dataService';

interface LicenseGateProps {
  onActivated: () => void;
  onClose?: () => void;
}

/** Activación y selección de licencias. Varias pueden estar activas a la vez. */
export const LicenseGate: React.FC<LicenseGateProps> = ({
  onActivated,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const activated = dataService
    .getActivatedLicenses()
    .map((lic) => dataService.validateLicenseCode(lic))
    .filter(Boolean) as Array<{ code: string; clientName: string; id?: string }>;
  const selected = dataService.getSelectedLicenseCode();

  const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

  const useLicense = (value: string) => {
    const license = dataService.validateLicenseCode(value);
    if (!license) {
      setError('Código no válido, pausado o vencido.');
      return false;
    }
    if (isDesktop() && !dataService.canUseOffice(license)) {
      setError(
        'Esta licencia ya tiene su Panel de Oficina activado en otro equipo.'
      );
      return false;
    }
    if (isDesktop()) dataService.bindOfficeDevice(license);
    dataService.setActivatedLicense(value);
    setError('');
    onActivated();
    onClose?.();
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    useLicense(code);
  };

  return (
    <div
      className={`${onClose ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4' : 'flex min-h-screen items-center justify-center px-4 py-10 bg-slate-50 dark:bg-[#070B14] bg-ambient-mesh'}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-gate-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h1
                id="license-gate-title"
                className="text-xl font-bold text-slate-900 dark:text-white"
              >
                Activar licencia
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                La licencia habilita toda la aplicación. Puedes tener varias
                activas y elegir con cuál trabajar.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar selector de licencias"
              className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {activated.length > 0 && (
          <div className="mt-5 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Licencias activadas
            </p>
            {activated.map((lic) => {
              const active = lic.code === selected;
              return (
                <button
                  key={lic.code}
                  type="button"
                  onClick={() => useLicense(lic.code)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                    active
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {lic.clientName}
                    </span>
                    <span className="font-mono text-[11px] opacity-80">
                      {lic.code}
                    </span>
                  </span>
                  {active ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <span className="shrink-0 text-[11px] font-semibold">Usar</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5" noValidate>
          <div>
            <label
              htmlFor="license-code"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              {activated.length > 0 ? 'Agregar otra licencia' : 'Código de licencia'}
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
              <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-500">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
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
          Cada licencia es independiente: tiene sus propios instructores,
          vehículos y registros. El código de administración por defecto es
          REPORTVIAL-ADMIN.
        </p>
      </div>
    </div>
  );
};
