import React from 'react';
import { AlertCircle, Cloud, CloudOff, CloudUpload } from 'lucide-react';

interface CloudSyncBadgeProps {
  configured: boolean;
  online: boolean;
  pending: number;
  error: string | null;
  lastSyncedAt: string | null;
}

export const CloudSyncBadge: React.FC<CloudSyncBadgeProps> = ({
  configured,
  online,
  pending,
  error,
  lastSyncedAt,
}) => {
  if (!configured) return null;

  let label = 'Nube activa';
  let title = 'Supabase sincronizado';
  let icon = <Cloud className="w-3.5 h-3.5 shrink-0" />;
  let style =
    'border-emerald-300/70 dark:border-emerald-700/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300';

  if (!online) {
    label = 'Sin conexión';
    title = 'Sin conexión: los cambios se guardan localmente y se subirán al volver la red';
    icon = <CloudOff className="w-3.5 h-3.5 shrink-0" />;
    style =
      'border-amber-300/70 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300';
  } else if (error) {
    label = 'Error de nube';
    title = error;
    icon = <AlertCircle className="w-3.5 h-3.5 shrink-0" />;
    style =
      'border-rose-300/70 dark:border-rose-700/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300';
  } else if (pending > 0) {
    label = `Sincronizando (${pending})`;
    title = `${pending} operacion(es) pendiente(s) de subir a Supabase`;
    icon = <CloudUpload className="w-3.5 h-3.5 shrink-0 animate-pulse" />;
    style =
      'border-amber-300/70 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300';
  } else if (lastSyncedAt) {
    title = `Última sincronización: ${new Date(lastSyncedAt).toLocaleString('es')}`;
  }

  return (
    <span
      role="status"
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${style}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
};
