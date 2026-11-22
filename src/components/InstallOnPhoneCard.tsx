import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * Inicio de instalación PWA exclusivo del módulo "Registro de Instructor".
 * Se muestra solo en pantallas pequeñas: el panel de oficina es de escritorio.
 */
export const InstallOnPhoneCard: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (!isInstallable) {
      setShowGuide(true);
      return;
    }
    setBusy(true);
    try {
      const accepted = await install();
      if (!accepted) setShowGuide(true);
    } catch {
      setShowGuide(true);
    } finally {
      setBusy(false);
    }
  };

  const buttonLabel = busy
    ? 'Instalando…'
    : isInstallable
      ? 'Instalar en el celular'
      : isIOS
        ? 'Instalar en iPhone / iPad'
        : 'Cómo instalar en el celular';

  return (
    <>
      <div className="no-print md:hidden mb-5 rounded-2xl border border-sky-200/80 dark:border-sky-500/25 bg-gradient-to-br from-white via-white to-sky-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/35 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm shadow-sky-500/30">
            <Smartphone className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Registro desde tu celular
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Instala la app en tu teléfono para registrar clases y capturar firmas
              táctiles desde cualquier lugar. El panel de oficina se usa en PC.
            </p>
            <button
              type="button"
              onClick={handleInstall}
              disabled={busy}
              className="btn-accent-gradient mt-3 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white min-h-[44px] disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{buttonLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {showGuide && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-phone-guide-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h3
                id="install-phone-guide-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                Instalar en tu celular
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Cerrar guía de instalación"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {isIOS ? (
                <>
                  <li>1. Abre esta página en <strong>Safari</strong>.</li>
                  <li>2. Toca el botón <strong>Compartir</strong>.</li>
                  <li>3. Selecciona <strong>Agregar a inicio</strong>.</li>
                </>
              ) : (
                <>
                  <li>1. Abre esta página en <strong>Chrome</strong> desde tu celular.</li>
                  <li>2. Toca el menú <strong>⋮</strong> (arriba a la derecha).</li>
                  <li>3. Elige <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla de inicio</strong>.</li>
                </>
              )}
            </ol>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="btn-accent-gradient mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-white min-h-[44px]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
