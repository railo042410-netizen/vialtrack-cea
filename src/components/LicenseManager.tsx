import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { License } from '../types/cea';
import { dataService } from '../services/dataService';
import { useSyncState } from '../hooks/useCloudSync';

interface LicenseManagerProps {
  onClose: () => void;
}

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export const LicenseManager: React.FC<LicenseManagerProps> = ({ onClose }) => {
  const { dataVersion } = useSyncState();
  const [licenses, setLicenses] = useState<License[]>(() =>
    dataService.getLicenses()
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [maxInstructors, setMaxInstructors] = useState('10');
  const [maxVehicles, setMaxVehicles] = useState('10');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const instructors = useMemo(
    () => dataService.getInstructors(),
    [dataVersion]
  );
  const vehicles = useMemo(() => dataService.getVehicles(), [dataVersion]);

  useEffect(() => {
    setLicenses(dataService.getLicenses());
  }, [dataVersion]);

  const resetForm = () => {
    setEditingId(null);
    setClientName('');
    setMaxInstructors('10');
    setMaxVehicles('10');
    setExpiresAt(defaultExpiry());
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inst = Number(maxInstructors);
    const veh = Number(maxVehicles);
    if (!clientName.trim()) {
      setError('Ingresa el nombre del cliente.');
      return;
    }
    if (!Number.isFinite(inst) || inst < 1 || !Number.isFinite(veh) || veh < 1) {
      setError('Los cupos deben ser números mayores a cero.');
      return;
    }
    if (!expiresAt) {
      setError('Selecciona la fecha de vencimiento.');
      return;
    }

    if (editingId) {
      const current = licenses.find((l) => l.id === editingId);
      if (current) {
        dataService.updateLicense({
          ...current,
          clientName: clientName.trim(),
          maxInstructors: inst,
          maxVehicles: veh,
          expiresAt,
        });
      }
    } else {
      dataService.addLicense({
        clientName,
        maxInstructors: inst,
        maxVehicles: veh,
        expiresAt,
      });
    }

    setLicenses(dataService.getLicenses());
    resetForm();
  };

  const handleEdit = (license: License) => {
    setEditingId(license.id);
    setClientName(license.clientName);
    setMaxInstructors(String(license.maxInstructors));
    setMaxVehicles(String(license.maxVehicles));
    setExpiresAt(license.expiresAt);
    setError('');
  };

  const handleActivate = (id: string) => {
    dataService.activateLicense(id);
    setLicenses(dataService.getLicenses());
  };

  const handleToggleEnabled = (license: License) => {
    dataService.updateLicense({ ...license, enabled: !license.enabled });
    setLicenses(dataService.getLicenses());
  };

  const handleDelete = (license: License) => {
    if (!window.confirm(`¿Eliminar la licencia de ${license.clientName}?`)) return;
    dataService.deleteLicense(license.id);
    setLicenses(dataService.getLicenses());
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="licenses-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2
              id="licenses-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Licencias y cupos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Genera códigos, programa el número de instructores y vehículos, y
              activa la licencia vigente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gestión de licencias"
            className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                setError('');
              }}
              placeholder="Nombre del cliente / academia"
              className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100 sm:col-span-2"
            />
            <label className="text-xs text-slate-600 dark:text-slate-400">
              Máx. instructores
              <input
                type="number"
                min={1}
                value={maxInstructors}
                onChange={(e) => {
                  setMaxInstructors(e.target.value);
                  setError('');
                }}
                className="accent-focus mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-400">
              Máx. vehículos
              <input
                type="number"
                min={1}
                value={maxVehicles}
                onChange={(e) => {
                  setMaxVehicles(e.target.value);
                  setError('');
                }}
                className="accent-focus mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-400 sm:col-span-2">
              Vencimiento
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => {
                  setExpiresAt(e.target.value);
                  setError('');
                }}
                className="accent-focus mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </label>
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="btn-accent-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white min-h-[44px]"
            >
              {editingId ? (
                <Save className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {editingId ? 'Actualizar licencia' : 'Generar licencia'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 min-h-[44px]"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
          {licenses.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              No hay licencias generadas.
            </p>
          ) : (
            licenses.map((license) => {
              const expired = license.expiresAt < today;
              const status = !license.enabled
                ? 'Desactivada'
                : expired
                  ? 'Vencida'
                  : license.isActive
                    ? 'Activa'
                    : 'Inactiva';
              const statusStyle = license.enabled && !expired && license.isActive
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : expired || !license.enabled
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-300';

              return (
                <div key={license.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {license.clientName}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${statusStyle}`}
                        >
                          {status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(license.code)}
                        title="Copiar código"
                        className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 hover:underline"
                      >
                        <KeyRound className="w-3 h-3" />
                        {license.code}
                        {copied === license.code ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleActivate(license.id)}
                        disabled={!license.enabled || expired}
                        title="Activar esta licencia"
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 min-h-[36px]"
                      >
                        Activar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(license)}
                        title="Editar cupos"
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(license)}
                        title={license.enabled ? 'Desactivar' : 'Activar'}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px]"
                      >
                        {license.enabled ? 'Pausar' : 'Reanudar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(license)}
                        aria-label={`Eliminar licencia ${license.clientName}`}
                        className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>
                      Instructores:{' '}
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {instructors.length}/{license.maxInstructors}
                      </strong>
                    </span>
                    <span>
                      Vehículos:{' '}
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {vehicles.length}/{license.maxVehicles}
                      </strong>
                    </span>
                    <span>
                      Vence: <strong className="font-mono">{license.expiresAt}</strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          La licencia activa define los cupos globales. El código de administración
          permite acceder al registro sin consumir una licencia comercial.
        </p>
      </div>
    </div>
  );
};
