import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import { License, Subaccount } from '../types/cea';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { useSyncState } from '../hooks/useCloudSync';

export const MasterPanel: React.FC = () => {
  const { dataVersion } = useSyncState();
  const licenses = useMemo(() => dataService.getLicenses(), [dataVersion]);
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('cea_subcuentas')
        .select('*')
        .order('created_at', { ascending: false });
      if (active) setSubaccounts((data as Subaccount[]) || []);
    };
    void load();
    return () => {
      active = false;
    };
  }, [dataVersion, refresh]);

  const [clientName, setClientName] = useState('');
  const [maxInstructors, setMaxInstructors] = useState('10');
  const [maxVehicles, setMaxVehicles] = useState('10');
  const [expiresAt, setExpiresAt] = useState('2027-12-31');
  const [licenseError, setLicenseError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [licenseId, setLicenseId] = useState('');
  const [role, setRole] = useState<'admin' | 'instructor'>('admin');
  const [subError, setSubError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const createLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setLicenseError('Ingresa el cliente.');
      return;
    }
    dataService.addLicense({
      clientName,
      maxInstructors: Number(maxInstructors) || 1,
      maxVehicles: Number(maxVehicles) || 1,
      expiresAt,
    });
    setClientName('');
    setLicenseError('');
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  };

  const createSubaccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError('');
    if (!supabase) {
      setSubError('Supabase no configurado.');
      return;
    }
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch('/api/create-subaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          licenseId: licenseId || null,
          role,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setSubError(payload.error || 'No se pudo crear la subcuenta.');
        return;
      }
      setEmail('');
      setPassword('');
      setFullName('');
      setLicenseId('');
      setRole('admin');
      setRefresh((r) => r + 1);
    } catch {
      setSubError('No se pudo contactar con el servidor.');
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const licenseLabel = (license: License) =>
    `${license.clientName} · ${license.code}`;

  return (
    <div className="space-y-6 pb-24 md:pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Plataforma Maestra
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Genera licencias y subcuentas con acceso real desde un solo lugar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-500/25 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Licencias</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-700 dark:text-amber-300">
            {licenses.length}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200/80 dark:border-sky-500/25 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Subcuentas</p>
          <p className="mt-1 font-mono text-2xl font-bold text-sky-700 dark:text-sky-300">
            {subaccounts.length}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-500/25 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Licencia activa</p>
          <p className="mt-1 truncate text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {dataService.getActiveLicense()?.clientName || 'Ninguna'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Licencias */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <KeyRound className="w-4 h-4" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Generar licencias
            </h2>
          </div>

          <form onSubmit={createLicense} className="space-y-2.5">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Cliente / academia"
              className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <label className="text-xs text-slate-600 dark:text-slate-400">
                Máx. instructores
                <input
                  type="number"
                  min={1}
                  value={maxInstructors}
                  onChange={(e) => setMaxInstructors(e.target.value)}
                  className="accent-focus mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-600 dark:text-slate-400">
                Máx. vehículos
                <input
                  type="number"
                  min={1}
                  value={maxVehicles}
                  onChange={(e) => setMaxVehicles(e.target.value)}
                  className="accent-focus mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100"
                />
              </label>
            </div>
            <label className="block text-xs text-slate-600 dark:text-slate-400">
              Vencimiento
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="accent-focus mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </label>
            {licenseError && (
              <p className="text-xs text-rose-500">{licenseError}</p>
            )}
            <button
              type="submit"
              className="btn-accent-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Generar licencia
            </button>
          </form>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {licenses.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-xs text-slate-500">
                Aún no hay licencias.
              </p>
            ) : (
              licenses.map((l) => {
                const expired = l.expiresAt < today;
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {l.clientName}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyCode(l.code)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-300 hover:underline"
                      >
                        {l.code}
                        {copied === l.code ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60" />
                        )}
                      </button>
                      <p className="text-[11px] text-slate-500">
                        {l.maxInstructors} instr. · {l.maxVehicles} veh. · vence{' '}
                        {l.expiresAt}
                        {expired ? ' (VENCIDA)' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {l.isActive && !expired && (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          ACTIVA
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => dataService.activateLicense(l.id)}
                        disabled={!l.enabled || expired}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40"
                      >
                        Activar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Subcuentas */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
              <Users className="w-4 h-4" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Generar subcuentas
            </h2>
          </div>

          <form onSubmit={createSubaccount} className="space-y-2.5">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@subcuenta.com"
              className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña inicial (mín. 6)"
              className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={licenseId}
                onChange={(e) => setLicenseId(e.target.value)}
                aria-label="Licencia asignada"
                className="accent-focus min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="">Sin licencia</option>
                {licenses.map((l) => (
                  <option key={l.id} value={l.id}>
                    {licenseLabel(l)}
                  </option>
                ))}
              </select>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'admin' | 'instructor')
                }
                aria-label="Rol de la subcuenta"
                className="accent-focus min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="admin">Admin</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>
            {subError && <p className="text-xs text-rose-500">{subError}</p>}
            <button
              type="submit"
              disabled={busy}
              className="btn-accent-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white min-h-[44px] disabled:opacity-60"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {busy ? 'Creando…' : 'Crear subcuenta'}
            </button>
          </form>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {subaccounts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-xs text-slate-500">
                Aún no hay subcuentas.
              </p>
            ) : (
              subaccounts.map((s: Subaccount) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {s.full_name || s.email}
                    </p>
                    <p className="truncate text-xs text-slate-500">{s.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-md bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                      {s.role}
                    </span>
                    <p className="mt-1 max-w-[140px] truncate text-[10px] text-slate-500">
                      {licenses.find((l) => l.id === s.license_id)?.clientName ||
                        'Sin licencia'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Shield className="w-3.5 h-3.5" />
        Las subcuentas se crean como usuarios reales de Supabase Auth mediante el
        endpoint protegido por rol master.
      </p>
    </div>
  );
};
