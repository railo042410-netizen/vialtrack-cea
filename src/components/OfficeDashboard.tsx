import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  Car,
  ChevronDown,
  Clock,
  Download,
  Eye,
  KeyRound,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import {
  AttendanceStatus,
  ClassRecord,
  FleetVehicle,
  Instructor,
  LICENSE_CATEGORIES,
  LicenseCategory,
} from '../types/cea';
import { dataService, exportRecordsToCSV } from '../services/dataService';
import { RecordDetailModal } from './RecordDetailModal';
import { LicenseManager } from './LicenseManager';
import { useSyncState } from '../hooks/useCloudSync';
import { CATEGORY_COLOR_THEMES } from '../utils/colorPalette';

interface OfficeDashboardProps {
  records: ClassRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onNavigateToForm: () => void;
}

type SortField =
  | 'date'
  | 'instructorName'
  | 'studentName'
  | 'licenseCategory'
  | 'totalHours'
  | 'attendanceStatus';
type SortDirection = 'asc' | 'desc';
type DatePeriodFilter = 'all' | 'today' | 'month';

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;
}

interface InstructorHoursItem {
  key: string;
  name: string;
  documentId: string;
  hours: number;
  attendedCount: number;
  totalCount: number;
  barPct: number;
}

function summarizeHoursByInstructor(
  subset: ClassRecord[],
  catalog: Instructor[]
): InstructorHoursItem[] {
  const map = new Map<string, Omit<InstructorHoursItem, 'barPct'>>();

  for (const inst of catalog) {
    const key = inst.documentId.trim() || inst.id;
    map.set(key, {
      key,
      name: inst.name,
      documentId: inst.documentId,
      hours: 0,
      attendedCount: 0,
      totalCount: 0,
    });
  }

  for (const r of subset) {
    const docKey = r.instructorDocument?.trim();
    let entry = docKey ? map.get(docKey) : undefined;
    if (!entry) {
      for (const candidate of map.values()) {
        if (
          candidate.name.toLowerCase() === r.instructorName.toLowerCase() ||
          candidate.key === r.instructorId
        ) {
          entry = candidate;
          break;
        }
      }
    }
    if (!entry) {
      const key = docKey || r.instructorId || r.instructorName;
      entry = {
        key,
        name: r.instructorName,
        documentId: r.instructorDocument || '—',
        hours: 0,
        attendedCount: 0,
        totalCount: 0,
      };
      map.set(key, entry);
    }

    entry.totalCount += 1;
    if (r.attendanceStatus === 'Asistió') {
      entry.attendedCount += 1;
      entry.hours += r.totalHours;
    }
  }

  const list = Array.from(map.values());
  const maxHours = list.reduce((max, item) => Math.max(max, item.hours), 0);

  return list
    .map((item) => ({
      ...item,
      barPct: maxHours > 0 ? (item.hours / maxHours) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.hours !== a.hours) return b.hours - a.hours;
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return a.name.localeCompare(b.name, 'es');
    });
}

export const OfficeDashboard: React.FC<OfficeDashboardProps> = ({
  records,
  onDeleteRecord,
  onClearAll,
  onNavigateToForm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<DatePeriodFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<
    LicenseCategory | 'Todas'
  >('Todas');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'Todos'>(
    'Todos'
  );

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedRecord, setSelectedRecord] = useState<ClassRecord | null>(null);
  const [showTodayByInstructor, setShowTodayByInstructor] = useState(false);
  const [showMonthByInstructor, setShowMonthByInstructor] = useState(false);

  // Licenses manager modal state
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // Fleet plates manager modal state
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(() =>
    dataService.getVehicles()
  );
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCategory, setNewCategory] = useState<LicenseCategory>('B1');
  const [fleetError, setFleetError] = useState('');

  // Instructors manager modal state
  const [showInstructorsModal, setShowInstructorsModal] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>(() =>
    dataService.getInstructors()
  );
  const [newInstName, setNewInstName] = useState('');
  const [newInstDoc, setNewInstDoc] = useState('');
  const [instructorError, setInstructorError] = useState('');

  // Catálogos compartidos: se actualizan cuando otro dispositivo los modifica.
  const { dataVersion } = useSyncState();
  const licenses = useMemo(() => dataService.getLicenses(), [dataVersion]);
  useEffect(() => {
    setVehicles(dataService.getVehicles());
    setInstructors(dataService.getInstructors());
  }, [dataVersion]);

  const handleAddFleetPlate = () => {
    const clean = newPlate.trim().toUpperCase();
    if (!clean) {
      setFleetError('Ingresa la placa del vehículo.');
      return;
    }
    if (vehicles.some((v) => v.plate.toUpperCase() === clean)) {
      setFleetError(`La placa ${clean} ya existe en la flota.`);
      return;
    }
    const activeLicense = dataService.getActiveLicense();
    if (activeLicense && vehicles.length >= activeLicense.maxVehicles) {
      setFleetError(
        `Cupo de vehículos alcanzado (${activeLicense.maxVehicles}) según la licencia de ${activeLicense.clientName}.`
      );
      return;
    }
    const { vehicles: updated } = dataService.addVehicle({
      plate: clean,
      model: newModel.trim(),
      category: newCategory,
    });
    setVehicles(updated);
    setNewPlate('');
    setNewModel('');
    setFleetError('');
  };

  const handleDeleteFleetPlate = (plate: string) => {
    const updated = dataService.deleteVehicle(plate);
    setVehicles(updated);
  };

  const handleAddInstructor = () => {
    const cleanName = newInstName.trim();
    const cleanDoc = newInstDoc.trim();
    if (!cleanName || !cleanDoc) {
      setInstructorError('Ingresa el nombre completo y el documento del instructor.');
      return;
    }
    if (instructors.some((i) => i.documentId.trim() === cleanDoc)) {
      setInstructorError(`Ya existe un instructor con documento ${cleanDoc}.`);
      return;
    }
    const activeLicense = dataService.getActiveLicense();
    if (activeLicense && instructors.length >= activeLicense.maxInstructors) {
      setInstructorError(
        `Cupo de instructores alcanzado (${activeLicense.maxInstructors}) según la licencia de ${activeLicense.clientName}.`
      );
      return;
    }
    dataService.addInstructor({
      name: cleanName,
      documentId: cleanDoc,
      specialties: ['B1'],
    });
    setInstructors(dataService.getInstructors());
    setNewInstName('');
    setNewInstDoc('');
    setInstructorError('');
  };

  const handleDeleteInstructor = (id: string) => {
    const updated = dataService.deleteInstructor(id);
    setInstructors(updated);
  };

  const todayStr = useMemo(getTodayStr, []);
  const currentMonthPrefix = todayStr.slice(0, 7);

  // KPI calculations
  const kpis = useMemo(() => {
    const todayRecords = records.filter((r) => r.date === todayStr);
    const monthRecords = records.filter((r) =>
      r.date.startsWith(currentMonthPrefix)
    );

    const hoursToday = todayRecords
      .filter((r) => r.attendanceStatus === 'Asistió')
      .reduce((acc, r) => acc + r.totalHours, 0);

    const hoursMonth = monthRecords
      .filter((r) => r.attendanceStatus === 'Asistió')
      .reduce((acc, r) => acc + r.totalHours, 0);

    const absentCount = records.filter(
      (r) =>
        r.attendanceStatus === 'No asistió' ||
        r.attendanceStatus === 'Cancelada'
    ).length;
    const absencePct =
      records.length > 0
        ? Math.round((absentCount / records.length) * 1000) / 10
        : 0;

    const todayByInstructor = summarizeHoursByInstructor(todayRecords, instructors);
    const monthByInstructor = summarizeHoursByInstructor(monthRecords, instructors);

    return {
      hoursToday,
      todayCount: todayRecords.length,
      todayByInstructor,
      hoursMonth,
      monthCount: monthRecords.length,
      monthByInstructor,
      absentCount,
      absencePct,
    };
  }, [records, instructors, todayStr, currentMonthPrefix]);

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = records.filter((r) => {
      if (periodFilter === 'today' && r.date !== todayStr) return false;
      if (
        periodFilter === 'month' &&
        !r.date.startsWith(currentMonthPrefix)
      ) {
        return false;
      }
      if (
        categoryFilter !== 'Todas' &&
        r.licenseCategory !== categoryFilter
      ) {
        return false;
      }
      if (statusFilter !== 'Todos' && r.attendanceStatus !== statusFilter) {
        return false;
      }

      if (q) {
        const haystack = [
          r.id,
          r.date,
          r.instructorName,
          r.instructorDocument,
          r.studentName,
          r.studentDocument,
          r.licenseCategory,
          r.vehiclePlate || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);
      } else if (sortField === 'totalHours') {
        cmp = a.totalHours - b.totalHours;
      } else {
        cmp = String(a[sortField]).localeCompare(String(b[sortField]), 'es');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [
    records,
    searchQuery,
    periodFilter,
    categoryFilter,
    statusFilter,
    sortField,
    sortDirection,
    todayStr,
    currentMonthPrefix,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--accent-text)' }} />
    ) : (
      <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--accent-text)' }} />
    );
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    periodFilter !== 'all' ||
    categoryFilter !== 'Todas' ||
    statusFilter !== 'Todos';

  const clearFilters = () => {
    setSearchQuery('');
    setPeriodFilter('all');
    setCategoryFilter('Todas');
    setStatusFilter('Todos');
  };

  return (
    <div className="space-y-6 pb-24 md:pb-10">
      {/* Header Row */}
      <div className="no-print flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Panel de Oficina y Base de Datos
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Consolidado en vivo de horas dictadas, asistencia, flota y firmas digitales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowLicenseModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Licencias ({licenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInstructors(dataService.getInstructors());
              setInstructorError('');
              setShowInstructorsModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300/70 dark:border-violet-700/60 bg-violet-50/70 dark:bg-violet-950/30 px-3.5 py-2.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nuevo instructor ({instructors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVehicles(dataService.getVehicles());
              setFleetError('');
              setShowFleetModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/70 dark:border-emerald-700/60 bg-emerald-50/70 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Nuevo vehículo ({vehicles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                '¿Vaciar todos los registros, instructores y vehículos (local y nube)?'
              );
              if (!confirmed) return;
              onClearAll();
              setVehicles(dataService.getVehicles());
              setInstructors(dataService.getInstructors());
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Vaciar datos</span>
          </button>

          <button
            type="button"
            onClick={() => exportRecordsToCSV(filteredRecords)}
            disabled={filteredRecords.length === 0}
            className="btn-accent-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40 disabled:pointer-events-none min-h-[44px] whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV / Excel ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <section
        aria-label="Resumen operativo"
        className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4 items-start"
      >
        {/* KPI 1: Horas dictadas hoy (desplegable por instructor) */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-200/80 dark:border-sky-500/25 bg-gradient-to-br from-white via-white to-sky-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/35 transition-all duration-150">
          <button
            type="button"
            aria-expanded={showTodayByInstructor}
            onClick={() => setShowTodayByInstructor((v) => !v)}
            className="w-full text-left p-4 sm:p-5 hover:bg-sky-50/50 dark:hover:bg-sky-950/25 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Horas dictadas hoy
              </p>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm shadow-sky-500/30 shrink-0">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold tabular-nums text-sky-700 dark:text-sky-300">
              {kpis.hoursToday.toFixed(1)} h
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                {kpis.todayCount}{' '}
                {kpis.todayCount === 1 ? 'sesión registrada' : 'sesiones registradas'}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap shrink-0">
                <span>{showTodayByInstructor ? 'Ocultar' : 'Por instructor'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showTodayByInstructor ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </div>
          </button>

          {showTodayByInstructor && (
            <div className="border-t border-sky-200/70 dark:border-sky-500/20 px-4 sm:px-5 py-3.5 space-y-2.5 bg-white/60 dark:bg-slate-950/35">
              {kpis.todayByInstructor.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No hay instructores registrados.
                </p>
              ) : (
                kpis.todayByInstructor.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setPeriodFilter('today');
                      setSearchQuery(item.name);
                    }}
                    title={`Filtrar registros de hoy de ${item.name}`}
                    className="w-full text-left group space-y-1 rounded-lg px-2 py-1.5 -mx-2 hover:bg-sky-500/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-sky-700 dark:group-hover:text-sky-300">
                        {item.name}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-sky-700 dark:text-sky-300 shrink-0">
                        {item.hours.toFixed(1)} h
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-sky-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300"
                          style={{
                            width: `${Math.max(item.hours > 0 ? 5 : 0, item.barPct)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {item.attendedCount} asist.
                      </span>
                    </div>
                  </button>
                ))
              )}
              <div className="flex items-center justify-between border-t border-sky-200/70 dark:border-sky-500/20 pt-2 text-xs font-semibold text-sky-800 dark:text-sky-200">
                <span>Consolidado hoy</span>
                <span className="font-mono tabular-nums">
                  {kpis.hoursToday.toFixed(1)} h
                </span>
              </div>
            </div>
          )}
        </div>

        {/* KPI 2: Total horas del mes (desplegable por instructor) */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-500/25 bg-gradient-to-br from-white via-white to-emerald-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/35 transition-all duration-150">
          <button
            type="button"
            aria-expanded={showMonthByInstructor}
            onClick={() => setShowMonthByInstructor((v) => !v)}
            className="w-full text-left p-4 sm:p-5 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/25 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Total horas del mes
              </p>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-sm shadow-emerald-500/30 shrink-0">
                <CalendarClock className="w-4 h-4" />
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {kpis.hoursMonth.toFixed(1)} h
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                {kpis.monthCount} registros en el mes actual
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                <span>{showMonthByInstructor ? 'Ocultar' : 'Por instructor'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showMonthByInstructor ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </div>
          </button>

          {showMonthByInstructor && (
            <div className="border-t border-emerald-200/70 dark:border-emerald-500/20 px-4 sm:px-5 py-3.5 space-y-2.5 bg-white/60 dark:bg-slate-950/35">
              {kpis.monthByInstructor.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No hay instructores registrados.
                </p>
              ) : (
                kpis.monthByInstructor.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setPeriodFilter('month');
                      setSearchQuery(item.name);
                    }}
                    title={`Filtrar registros del mes de ${item.name}`}
                    className="w-full text-left group space-y-1 rounded-lg px-2 py-1.5 -mx-2 hover:bg-emerald-500/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {item.name}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-300 shrink-0">
                        {item.hours.toFixed(1)} h
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300"
                          style={{
                            width: `${Math.max(item.hours > 0 ? 5 : 0, item.barPct)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {item.attendedCount} asist.
                      </span>
                    </div>
                  </button>
                ))
              )}
              <div className="flex items-center justify-between border-t border-emerald-200/70 dark:border-emerald-500/20 pt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                <span>Consolidado mes</span>
                <span className="font-mono tabular-nums">
                  {kpis.hoursMonth.toFixed(1)} h
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-500/25 bg-gradient-to-br from-white via-white to-amber-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30 p-4 sm:p-5 transition-transform duration-150 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Índice de inasistencias
            </p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-sm shadow-amber-500/30">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {kpis.absencePct.toFixed(1)}%
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {kpis.absentCount} inasistencias o canceladas
          </p>
        </div>
      </section>

      {/* Search & Filters Toolbar */}
      <section className="no-print section-interactive rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 space-y-3.5 transition-all duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="lg:col-span-5 relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--accent-text)' }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por fecha, instructor, estudiante, categoría o placa..."
              className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Period segmented buttons */}
          <div className="lg:col-span-3 flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'today', label: 'Hoy' },
                { id: 'month', label: 'Este mes' },
              ] as const
            ).map((opt) => {
              const active = periodFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriodFilter(opt.id)}
                  style={
                    active ? { backgroundImage: 'var(--accent-gradient)' } : undefined
                  }
                  className={`flex-1 min-h-[36px] rounded-lg px-2.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Select dropdown filters */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-2">
            <select
              aria-label="Filtrar por categoría"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as LicenseCategory | 'Todas')
              }
              className="accent-focus min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 transition-all"
            >
              <option value="Todas">Cat.: Todas</option>
              {LICENSE_CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  Cat. {c.code}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por asistencia"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as AttendanceStatus | 'Todos')
              }
              className="accent-focus min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 transition-all"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Asistió">Asistió</option>
              <option value="No asistió">No asistió</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">
            Mostrando{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {filteredRecords.length}
            </strong>{' '}
            de {records.length} registros · Haz clic en una fila para ver las firmas digitales
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              style={{ color: 'var(--accent-text)' }}
              className="font-semibold hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {/* Data Table (Desktop) + Structured Rows (Mobile) */}
      <section className="no-print overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
        {filteredRecords.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              No hay registros que coincidan con tu búsqueda
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Ajusta los filtros de fecha, placa o instructor, o registra una nueva clase desde el módulo móvil.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
                >
                  Limpiar filtros
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateToForm}
                className="btn-accent-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar nueva clase</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 pl-5 pr-3">
                      <button
                        type="button"
                        onClick={() => handleSort('date')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                      >
                        <span>Fecha y Hora</span>
                        {renderSortIcon('date')}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort('instructorName')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                      >
                        <span>Instructor</span>
                        {renderSortIcon('instructorName')}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort('studentName')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                      >
                        <span>Estudiante</span>
                        {renderSortIcon('studentName')}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort('licenseCategory')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                      >
                        <span>Categoría</span>
                        {renderSortIcon('licenseCategory')}
                      </button>
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Placa</th>
                    <th className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('totalHours')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white whitespace-nowrap ml-auto"
                      >
                        <span>Horas</span>
                        {renderSortIcon('totalHours')}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort('attendanceStatus')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                      >
                        <span>Asistencia</span>
                        {renderSortIcon('attendanceStatus')}
                      </button>
                    </th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80 text-sm">
                  {filteredRecords.map((rec) => {
                    const StatusIcon =
                      rec.attendanceStatus === 'Asistió'
                        ? UserCheck
                        : rec.attendanceStatus === 'No asistió'
                        ? UserX
                        : XCircle;
                    const statusColor =
                      rec.attendanceStatus === 'Asistió'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : rec.attendanceStatus === 'No asistió'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400';
                    const catTheme = CATEGORY_COLOR_THEMES[rec.licenseCategory];

                    return (
                      <tr
                        key={rec.id}
                        onClick={() => setSelectedRecord(rec)}
                        className="group cursor-pointer transition-colors hover:bg-slate-50/95 dark:hover:bg-slate-800/60"
                      >
                        <td className="py-3.5 pl-5 pr-3 whitespace-nowrap">
                          <div className="font-mono text-xs font-medium tabular-nums text-slate-900 dark:text-slate-100">
                            {rec.date}
                          </div>
                          <div className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            {rec.startTime}–{rec.endTime}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                            {rec.instructorName}
                          </div>
                          <div className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            {rec.instructorDocument}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[190px]">
                            {rec.studentName}
                          </div>
                          <div className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            Doc. {rec.studentDocument}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap text-xs">
                          <span className={`font-mono font-bold ${catTheme.text}`}>
                            Cat. {rec.licenseCategory}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {rec.vehiclePlate ? (
                            <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {rec.vehiclePlate}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {rec.totalHours.toFixed(1)} h
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${statusColor}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{rec.attendanceStatus}</span>
                          </span>
                        </td>

                        <td className="py-3.5 pl-3 pr-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord(rec);
                            }}
                            aria-label={`Ver detalle de ${rec.studentName}`}
                            style={{ color: 'var(--accent-text)' }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Scannable List */}
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRecords.map((rec) => {
                const StatusIcon =
                  rec.attendanceStatus === 'Asistió'
                    ? UserCheck
                    : rec.attendanceStatus === 'No asistió'
                    ? UserX
                    : XCircle;
                const statusColor =
                  rec.attendanceStatus === 'Asistió'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : rec.attendanceStatus === 'No asistió'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400';
                const catTheme = CATEGORY_COLOR_THEMES[rec.licenseCategory];

                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedRecord(rec)}
                    className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span>{rec.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {rec.startTime}–{rec.endTime}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-bold ${catTheme.text}`}>
                          {rec.licenseCategory}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {rec.studentName}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        Instr. {rec.instructorName}
                        {rec.vehiclePlate ? ` · ${rec.vehiclePlate}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <span className="block font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {rec.totalHours.toFixed(1)} h
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${statusColor}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{rec.attendanceStatus}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Licenses Management Modal */}
      {showLicenseModal && <LicenseManager onClose={() => setShowLicenseModal(false)} />}

      {/* Detail & Signatures Modal */}
      <RecordDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onDelete={(id) => {
          onDeleteRecord(id);
          setSelectedRecord(null);
        }}
      />

      {/* Fleet Plates Management Modal */}
      {showFleetModal && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          onClick={() => setShowFleetModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fleet-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2
                  id="fleet-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  Placas de Vehículos de la Academia
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Administra la lista de placas disponibles para los instructores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFleetModal(false)}
                aria-label="Cerrar gestión de placas"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => {
                    setNewPlate(e.target.value.toUpperCase());
                    setFleetError('');
                  }}
                  placeholder="Placa (ej. XYZ-123)"
                  className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono font-semibold uppercase text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="Vehículo / Modelo"
                  className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
                />
                <select
                  aria-label="Categoría"
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as LicenseCategory)
                  }
                  className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-sm font-mono text-slate-900 dark:text-slate-100"
                >
                  {LICENSE_CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      Cat. {c.code}
                    </option>
                  ))}
                </select>
              </div>
              {fleetError && (
                <p className="text-xs text-rose-500">{fleetError}</p>
              )}
              <button
                type="button"
                onClick={handleAddFleetPlate}
                className="btn-accent-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar nueva placa</span>
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
              {vehicles.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  No hay placas registradas aún.
                </p>
              ) : (
                vehicles.map((v) => {
                  const catTheme = CATEGORY_COLOR_THEMES[v.category];
                  return (
                    <div
                      key={v.plate}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <div className="min-w-0 truncate">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {v.plate}
                        </span>
                        <span className="mx-2 text-slate-400">·</span>
                        <span className={`font-mono text-xs font-bold ${catTheme.text}`}>
                          {v.category}
                        </span>
                        <span className="mx-2 text-slate-400">·</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {v.model}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFleetPlate(v.plate)}
                        aria-label={`Eliminar placa ${v.plate}`}
                        className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructors Management Modal */}
      {showInstructorsModal && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          onClick={() => setShowInstructorsModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="instructors-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2
                  id="instructors-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  Instructores de la Academia
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Registra y administra los instructores disponibles en el formulario móvil.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructorsModal(false)}
                aria-label="Cerrar gestión de instructores"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newInstName}
                  onChange={(e) => {
                    setNewInstName(e.target.value);
                    setInstructorError('');
                  }}
                  placeholder="Nombre completo"
                  className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={newInstDoc}
                  onChange={(e) => {
                    setNewInstDoc(e.target.value);
                    setInstructorError('');
                  }}
                  placeholder="N.º de identificación"
                  className="accent-focus w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              {instructorError && (
                <p className="text-xs text-rose-500">{instructorError}</p>
              )}
              <button
                type="button"
                onClick={handleAddInstructor}
                className="btn-accent-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar nuevo instructor</span>
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
              {instructors.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  No hay instructores registrados aún.
                </p>
              ) : (
                instructors.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="min-w-0 truncate">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {inst.name}
                      </span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        ID {inst.documentId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteInstructor(inst.id)}
                      aria-label={`Eliminar instructor ${inst.name}`}
                      className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
