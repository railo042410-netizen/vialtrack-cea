import { useEffect, useState } from 'react';
import {
  ClipboardEdit,
  LayoutDashboard,
  Moon,
  Palette,
  Sun,
} from 'lucide-react';
import { ClassRecord } from './types/cea';
import { dataService } from './services/dataService';
import { InstructorForm } from './components/InstructorForm';
import { InstructorAccessGate } from './components/InstructorAccessGate';
import { OfficeDashboard } from './components/OfficeDashboard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CloudSyncBadge } from './components/CloudSyncBadge';
import { LicenseGate } from './components/LicenseGate';
import { useCloudSync } from './hooks/useCloudSync';
import { COLOR_PALETTES, ColorPaletteId } from './utils/colorPalette';

type ActiveView = 'instructor' | 'office';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('office');
  const [records, setRecords] = useState<ClassRecord[]>(() =>
    dataService.getRecords()
  );
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vialtrack_theme');
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
    } catch {
      // ignore storage errors
    }
    return true;
  });
  const [palette, setPalette] = useState<ColorPaletteId>(() => {
    try {
      const saved = localStorage.getItem('vialtrack_palette') as ColorPaletteId | null;
      if (saved && COLOR_PALETTES.some((p) => p.id === saved)) return saved;
    } catch {
      // ignore
    }
    return 'aurora';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLicensed, setIsLicensed] = useState<boolean>(() =>
    dataService.isDeviceLicensed()
  );
  const [instructorReady, setInstructorReady] = useState<boolean>(() =>
    dataService.isInstructorSessionValid()
  );
  const cloudSync = useCloudSync();

  useEffect(() => {
    setRecords(dataService.getRecords());
    setIsLicensed(dataService.isDeviceLicensed());
    setInstructorReady(dataService.isInstructorSessionValid());
  }, [cloudSync.dataVersion]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('vialtrack_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    try {
      localStorage.setItem('vialtrack_palette', palette);
    } catch {
      // ignore
    }
  }, [palette]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const handleRecordSaved = (saved: ClassRecord) => {
    setRecords(dataService.getRecords());
    showToast(`Registro ${saved.id} guardado y sincronizado`);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = dataService.deleteRecord(id);
    setRecords(updated);
    showToast(`Registro ${id} eliminado`);
  };

  const handleClearAll = () => {
    const empty = dataService.clearAllData();
    setRecords(empty);
    setInstructorReady(false);
    showToast('Datos vaciados · todo listo para empezar de cero');
  };

  const activePaletteMeta =
    COLOR_PALETTES.find((p) => p.id === palette) || COLOR_PALETTES[0];

  // La licencia controla TODA la app: sin ella no se ve ningún módulo.
  if (!isLicensed) {
    return (
      <LicenseGate
        onActivated={() => {
          setIsLicensed(true);
          setActiveView('office');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070B14] dark:text-slate-100 bg-ambient-mesh transition-colors duration-300">
      {/* Top Bar */}
      <header className="no-print sticky top-0 z-40 h-14 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#070B14]/85 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('office');
            }}
            className="font-display text-base sm:text-lg font-bold tracking-tight whitespace-nowrap shrink-0 bg-clip-text text-transparent"
            style={{ backgroundImage: 'var(--accent-gradient)' }}
          >
            REPORTEVIALCEA
          </a>

          <nav
            aria-label="Vistas principales"
            className="hidden md:flex items-center gap-8 h-full"
          >
            <button
              type="button"
              onClick={() => setActiveView('office')}
              style={
                activeView === 'office'
                  ? { color: 'var(--accent-text)' }
                  : undefined
              }
              className={`relative h-full inline-flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'office'
                  ? ''
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Panel de Oficina ({records.length})</span>
              {activeView === 'office' && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full"
                  style={{ backgroundImage: 'var(--accent-gradient)' }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('instructor')}
              style={
                activeView === 'instructor'
                  ? { color: 'var(--accent-text)' }
                  : undefined
              }
              className={`relative h-full inline-flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'instructor'
                  ? ''
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ClipboardEdit className="w-4 h-4" />
              <span>Registro de Instructor</span>
              {activeView === 'instructor' && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full"
                  style={{ backgroundImage: 'var(--accent-gradient)' }}
                />
              )}
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <CloudSyncBadge
              configured={cloudSync.configured}
              online={cloudSync.online}
              pending={cloudSync.pending}
              error={cloudSync.error}
              lastSyncedAt={cloudSync.lastSyncedAt}
            />
            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
              className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-2.5">
          <div className="flex items-center gap-2.5 text-xs">
            <Palette
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--accent-text)' }}
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Gama de color
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span
              className="font-semibold"
              style={{ color: 'var(--accent-text)' }}
            >
              {activePaletteMeta.name}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Seleccionar gama de colores de la interfaz"
            className="flex items-center gap-2"
          >
            {COLOR_PALETTES.map((item) => {
              const selected = palette === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Tema ${item.name}`}
                  title={item.name}
                  onClick={() => setPalette(item.id)}
                  className={`group relative inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all min-h-[36px] whitespace-nowrap shrink-0 ${
                    selected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-md shrink-0 transition-transform duration-150 ${
                      selected ? 'scale-110 ring-2 ring-white/40 dark:ring-slate-900/30' : 'group-hover:scale-110'
                    }`}
                    style={{ backgroundImage: item.swatchGradient }}
                  />
                  <span className="hidden sm:inline">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeView === 'office' ? (
          <OfficeDashboard
            records={records}
            onDeleteRecord={handleDeleteRecord}
            onClearAll={handleClearAll}
            onNavigateToForm={() => {
              setActiveView('instructor');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : instructorReady ? (
          <InstructorForm
            onRecordSaved={handleRecordSaved}
            activePaletteInk={activePaletteMeta.inkHex}
            onNavigateToOffice={() => {
              setActiveView('office');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <InstructorAccessGate
            onActivated={() => setInstructorReady(true)}
            onNavigateToOffice={() => {
              setActiveView('office');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      <nav
        aria-label="Navegación móvil"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#070B14]/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-2 h-14">
          <button
            type="button"
            onClick={() => {
              setActiveView('office');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={
              activeView === 'office' ? { color: 'var(--accent-text)' } : undefined
            }
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              activeView === 'office' ? '' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {activeView === 'office' && (
              <span
                className="absolute top-0 inset-x-6 h-0.5 rounded-b-full"
                style={{ backgroundImage: 'var(--accent-gradient)' }}
              />
            )}
            <LayoutDashboard className="w-5 h-5" />
            <span>Panel Oficina</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('instructor');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={
              activeView === 'instructor'
                ? { color: 'var(--accent-text)' }
                : undefined
            }
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              activeView === 'instructor' ? '' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {activeView === 'instructor' && (
              <span
                className="absolute top-0 inset-x-6 h-0.5 rounded-b-full"
                style={{ backgroundImage: 'var(--accent-gradient)' }}
              />
            )}
            <ClipboardEdit className="w-5 h-5" />
            <span>Registro Instructor</span>
          </button>
        </div>
      </nav>

      {toastMessage && (
        <div
          role="status"
          className="no-print fixed bottom-20 md:bottom-6 right-4 z-50 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl"
          style={{ backgroundImage: 'var(--accent-gradient)' }}
        >
          {toastMessage}
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
