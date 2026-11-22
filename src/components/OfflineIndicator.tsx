import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/95 px-3.5 py-2 text-xs font-medium text-amber-100 shadow-lg backdrop-blur-sm"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Modo sin conexión · Los registros se guardan localmente</span>
    </div>
  );
};
