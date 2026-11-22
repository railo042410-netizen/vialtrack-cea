import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import {
  ATTENDANCE_STATUSES,
  AttendanceStatus,
  ClassRecord,
  LICENSE_CATEGORIES,
  LicenseCategory,
} from '../types/cea';
import { dataService } from '../services/dataService';
import { SignatureCanvas } from './SignatureCanvas';
import { InstallOnPhoneCard } from './InstallOnPhoneCard';
import { useSyncState } from '../hooks/useCloudSync';
import { CATEGORY_COLOR_THEMES } from '../utils/colorPalette';

interface InstructorFormProps {
  onRecordSaved: (record: ClassRecord) => void;
  onNavigateToOffice: () => void;
  activePaletteInk?: string;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Hora local actual del dispositivo en formato HH:mm. */
function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutesToAdd);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function calculateHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const diffMin = eh * 60 + em - (sh * 60 + sm);
  if (diffMin <= 0) return 0;
  return Math.round((diffMin / 60) * 100) / 100;
}

function formatDurationLabel(hours: number): string {
  if (hours <= 0) return '0 min';
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export const InstructorForm: React.FC<InstructorFormProps> = ({
  onRecordSaved,
  onNavigateToOffice,
  activePaletteInk,
}) => {
  const { dataVersion } = useSyncState();
  const instructors = useMemo(() => dataService.getInstructors(), [dataVersion]);
  const vehicles = useMemo(() => dataService.getVehicles(), [dataVersion]);
  const recentStudents = useMemo(() => dataService.getRecentStudents(), [dataVersion]);

  // Form fields
  const [date, setDate] = useState<string>(getTodayDateString);
  const [startTime, setStartTime] = useState<string>(getCurrentTimeString);
  const [endTime, setEndTime] = useState<string>('');
  const [instructorId, setInstructorId] = useState<string>('');
  const [instructorDocument, setInstructorDocument] = useState<string>('');
  const [licenseCategory, setLicenseCategory] = useState<LicenseCategory>('B1');

  // Vehicle selection (select-only from academy fleet)
  const [vehiclePlate, setVehiclePlate] = useState<string>('');

  // Student fields
  const [studentName, setStudentName] = useState<string>('');
  const [studentDocument, setStudentDocument] = useState<string>('');

  // Attendance & signatures
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus>('Asistió');
  const [studentSignature, setStudentSignature] = useState<string | undefined>(
    undefined
  );
  const [instructorSignature, setInstructorSignature] = useState<
    string | undefined
  >(undefined);

  // Validation & feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState<ClassRecord | null>(null);

  const totalHours = useMemo(
    () => calculateHours(startTime, endTime),
    [startTime, endTime]
  );

  // Sync instructor document when selecting instructor
  useEffect(() => {
    const found = instructors.find((i) => i.id === instructorId);
    if (found) {
      setInstructorDocument(found.documentId);
    }
  }, [instructorId, instructors]);

  // Filter fleet suggestions matching category and separate the rest
  const matchingVehicles = useMemo(
    () => vehicles.filter((v) => v.category === licenseCategory),
    [vehicles, licenseCategory]
  );
  const otherVehicles = useMemo(
    () => vehicles.filter((v) => v.category !== licenseCategory),
    [vehicles, licenseCategory]
  );

  const handleCategoryChange = (cat: LicenseCategory) => {
    setLicenseCategory(cat);
    const catVehicles = vehicles.filter((v) => v.category === cat);
    const stillMatches = catVehicles.some(
      (v) => v.plate.toUpperCase() === vehiclePlate.toUpperCase()
    );
    if (!stillMatches && catVehicles.length > 0) {
      setVehiclePlate(catVehicles[0].plate);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.vehiclePlate;
        return next;
      });
    }
  };

  const handleStudentNameChange = (val: string) => {
    setStudentName(val);
    const matched = recentStudents.find(
      (s) => s.name.toLowerCase() === val.trim().toLowerCase()
    );
    if (matched && !studentDocument) {
      setStudentDocument(matched.document);
    }
  };

  const validateForm = (): Record<string, string> => {
    const nextErrors: Record<string, string> = {};

    if (!date) nextErrors.date = 'Selecciona la fecha de la clase.';
    if (!startTime || !endTime) {
      nextErrors.time = 'Ingresa hora de inicio y hora de fin.';
    } else if (totalHours <= 0) {
      nextErrors.time = 'La hora de fin debe ser posterior a la hora de inicio.';
    }

    if (!instructorId) {
      nextErrors.instructor = 'Selecciona un instructor.';
    }
    if (!instructorDocument.trim()) {
      nextErrors.instructorDocument = 'Ingresa la identificación del instructor.';
    }

    if (!vehiclePlate.trim()) {
      nextErrors.vehiclePlate = 'Selecciona una placa registrada de la academia.';
    }

    if (!studentName.trim()) {
      nextErrors.studentName = 'Ingresa el nombre completo del estudiante.';
    }
    if (!studentDocument.trim()) {
      nextErrors.studentDocument = 'Ingresa el documento del estudiante.';
    }

    if (attendanceStatus === 'Asistió' && !studentSignature) {
      nextErrors.studentSignature =
        'Se requiere la firma digital del estudiante para confirmar asistencia.';
    }
    if (!instructorSignature) {
      nextErrors.instructorSignature =
        'Se requiere la firma digital del instructor.';
    }

    return nextErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(`field-${firstKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const selectedInstructor = instructors.find((i) => i.id === instructorId);
    const saved = dataService.saveRecord({
      date,
      startTime,
      endTime,
      totalHours,
      instructorId,
      instructorName: selectedInstructor?.name || 'Instructor CEA',
      instructorDocument: instructorDocument.trim(),
      classType: 'Práctica',
      licenseCategory,
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      studentName: studentName.trim(),
      studentDocument: studentDocument.trim(),
      attendanceStatus,
      studentSignature,
      instructorSignature,
    });

    setErrors({});
    setSubmitSuccess(saved);
    onRecordSaved(saved);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForNextClass = () => {
    setSubmitSuccess(null);
    setDate(getTodayDateString());
    setStartTime(getCurrentTimeString());
    setEndTime('');
    setInstructorId('');
    setInstructorDocument('');
    setLicenseCategory('B1');
    setVehiclePlate('');
    setStudentName('');
    setStudentDocument('');
    setAttendanceStatus('Asistió');
    setStudentSignature(undefined);
    setInstructorSignature(undefined);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedCategoryInfo = LICENSE_CATEGORIES.find(
    (c) => c.code === licenseCategory
  );
  const activeCatTheme = CATEGORY_COLOR_THEMES[licenseCategory];

  if (submitSuccess) {
    const savedCatTheme = CATEGORY_COLOR_THEMES[submitSuccess.licenseCategory];
    return (
      <div className="mx-auto max-w-xl py-4">
        <div className="rounded-2xl border border-emerald-500/35 bg-white dark:bg-slate-900/95 p-6 sm:p-8 shadow-lg shadow-emerald-500/10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {submitSuccess.id} · Sincronizado
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                Registro guardado correctamente
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                La clase ya está disponible en el panel administrativo de la oficina.
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-200 dark:border-slate-800 py-5 text-sm">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Estudiante</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                {submitSuccess.studentName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Instructor</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                {submitSuccess.instructorName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Categoría y Placa</dt>
              <dd className={`mt-0.5 font-semibold font-mono ${savedCatTheme.text}`}>
                Cat. {submitSuccess.licenseCategory}
                {submitSuccess.vehiclePlate ? ` · ${submitSuccess.vehiclePlate}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Horario y Total</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {submitSuccess.startTime}–{submitSuccess.endTime} ({submitSuccess.totalHours} h)
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleResetForNextClass}
              className="btn-accent-gradient flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white min-h-[48px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Registrar otra clase</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToOffice}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-5 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[48px]"
            >
              <span>Ver en Panel de Oficina</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-24 md:pb-10">
      <InstallOnPhoneCard />

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Registro de Clase e Instructor
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Diligencia la asistencia, vehículo asignado y firmas digitales directamente desde tu dispositivo.
          </p>
        </div>
        <div
          className="text-xs font-mono font-semibold tabular-nums"
          style={{ color: 'var(--accent-text)' }}
        >
          {date} · {formatDurationLabel(totalHours)}
        </div>
      </div>

      {/* Main 2-column responsive grid on desktop, single thumb-friendly flow on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Schedule, Instructor, Class & Vehicle */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Fecha y Horario */}
          <section
            id="field-time"
            className="section-interactive rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 space-y-4 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-mono font-bold text-white shadow-sm shadow-blue-500/25">
                  1
                </span>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Fecha y Horario
                </h2>
              </div>
              <span
                style={
                  totalHours > 0 ? { color: 'var(--accent-text)' } : undefined
                }
                className={`font-mono text-sm font-semibold tabular-nums ${
                  totalHours > 0 ? '' : 'text-rose-500'
                }`}
              >
                {totalHours > 0
                  ? `${totalHours} h (${formatDurationLabel(totalHours)})`
                  : 'Horario inválido'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div id="field-date">
                <label
                  htmlFor="input-date"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Fecha
                </label>
                <div className="relative">
                  <Calendar
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--accent-text)' }}
                  />
                  <input
                    id="input-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-start-time"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Hora de inicio
                </label>
                <div className="relative">
                  <Clock
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--accent-text)' }}
                  />
                  <input
                    id="input-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setErrors((p) => ({ ...p, time: '' }));
                    }}
                    className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-end-time"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Hora de fin
                </label>
                <div className="relative">
                  <Clock
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--accent-text)' }}
                  />
                  <input
                    id="input-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setErrors((p) => ({ ...p, time: '' }));
                    }}
                    className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Quick one-tap duration buttons (1h to 8h) */}
            <div className="space-y-2 pt-1">
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                Duración rápida (horas completas):
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((hrs) => {
                  const mins = hrs * 60;
                  const isActive = Math.abs(totalHours * 60 - mins) < 1;
                  return (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => {
                        setEndTime(addMinutesToTime(startTime, mins));
                        setErrors((p) => ({ ...p, time: '' }));
                      }}
                      className={`min-h-[44px] px-2 rounded-xl text-xs font-mono font-semibold transition-all duration-150 whitespace-nowrap active:scale-95 ${
                        isActive
                          ? 'btn-accent-gradient text-white'
                          : 'border border-slate-200 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:-translate-y-0.5 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                      }`}
                    >
                      {hrs} h
                    </button>
                  );
                })}
              </div>
            </div>

            {errors.time && (
              <p className="text-xs font-medium text-rose-500">{errors.time}</p>
            )}
          </section>

          {/* 2. Datos del Instructor */}
          <section
            id="field-instructor"
            className="section-interactive rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 space-y-4 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xs font-mono font-bold text-white shadow-sm shadow-violet-500/25">
                2
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Datos del Instructor
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="select-instructor"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Instructor asignado
                </label>
                <select
                  id="select-instructor"
                  value={instructorId}
                  onChange={(e) => {
                    const selected = instructors.find(
                      (i) => i.id === e.target.value
                    );
                    setInstructorId(e.target.value);
                    setInstructorDocument(selected?.documentId || '');
                    setErrors((p) => ({
                      ...p,
                      instructor: '',
                      instructorDocument: '',
                    }));
                  }}
                  className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100 transition-all"
                >
                  {instructors.length === 0 ? (
                    <option value="">No hay instructores registrados</option>
                  ) : (
                    instructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div id="field-instructorDocument">
                <label
                  htmlFor="input-instructor-doc"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  N.º de identificación
                </label>
                <input
                  id="input-instructor-doc"
                  type="text"
                  value={instructorDocument}
                  readOnly
                  placeholder="Se completa al elegir el instructor"
                  className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 px-3.5 text-sm font-mono tabular-nums text-slate-700 dark:text-slate-300 transition-all"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Se carga automáticamente al elegir el instructor.
                </p>
                {errors.instructorDocument && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors.instructorDocument}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* 3. Tipo de Clase (Categorías) y Placa del Vehículo */}
          <section
            id="field-vehiclePlate"
            className="section-interactive rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 space-y-5 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-mono font-bold text-white shadow-sm"
                style={{ backgroundColor: activeCatTheme.accentHex }}
              >
                3
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Tipo de Clase y Vehículo
              </h2>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Categoría de licencia
                </span>
                <span className={`text-xs font-semibold ${activeCatTheme.text}`}>
                  {selectedCategoryInfo?.label}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {LICENSE_CATEGORIES.map((cat) => {
                  const active = licenseCategory === cat.code;
                  const catColors = CATEGORY_COLOR_THEMES[cat.code];
                  return (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => handleCategoryChange(cat.code)}
                      className={`min-h-[48px] rounded-xl border font-mono text-sm font-bold transition-all duration-150 active:scale-95 ${
                        active
                          ? catColors.activeBg
                          : `border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 ${catColors.idleHover} hover:-translate-y-0.5`
                      }`}
                    >
                      {cat.code}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select-Only Vehicle Plate Picker */}
            <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 space-y-3">
              <div>
                <label
                  htmlFor="select-vehicle-plate"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Placa del vehículo asignado
                </label>
                <select
                  id="select-vehicle-plate"
                  value={vehiclePlate}
                  onChange={(e) => {
                    setVehiclePlate(e.target.value);
                    setErrors((p) => ({ ...p, vehiclePlate: '' }));
                  }}
                  className="accent-focus w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 transition-all"
                >
                  <option value="">Selecciona una placa de la academia...</option>
                  {matchingVehicles.length > 0 && (
                    <optgroup label={`Vehículos Categoría ${licenseCategory}`}>
                      {matchingVehicles.map((v) => (
                        <option key={v.plate} value={v.plate}>
                          {v.plate} — {v.model} ({v.category})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherVehicles.length > 0 && (
                    <optgroup label="Otras placas de la academia">
                      {otherVehicles.map((v) => (
                        <option key={v.plate} value={v.plate}>
                          {v.plate} — {v.model} ({v.category})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {errors.vehiclePlate && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors.vehiclePlate}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Student, Attendance & Digital Signatures */}
        <div className="lg:col-span-5 space-y-6">
          {/* 4. Datos del Estudiante */}
          <section className="section-interactive rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 space-y-4 transition-all duration-200">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-mono font-bold text-white shadow-sm shadow-emerald-500/25">
                4
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Datos del Estudiante
              </h2>
            </div>

            <div id="field-studentName">
              <label
                htmlFor="input-student-name"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Nombre completo del estudiante
              </label>
              <input
                id="input-student-name"
                type="text"
                list="recent-students-list"
                value={studentName}
                onChange={(e) => {
                  handleStudentNameChange(e.target.value);
                  setErrors((p) => ({ ...p, studentName: '' }));
                }}
                placeholder="Ej. Valentina Ríos Castaño"
                className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100 transition-all"
              />
              <datalist id="recent-students-list">
                {recentStudents.map((s) => (
                  <option key={s.document} value={s.name} />
                ))}
              </datalist>
              {errors.studentName && (
                <p className="mt-1 text-xs text-rose-500">{errors.studentName}</p>
              )}
            </div>

            <div id="field-studentDocument">
              <label
                htmlFor="input-student-doc"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Número de documento
              </label>
              <input
                id="input-student-doc"
                type="text"
                inputMode="numeric"
                value={studentDocument}
                onChange={(e) => {
                  setStudentDocument(e.target.value);
                  setErrors((p) => ({ ...p, studentDocument: '' }));
                }}
                placeholder="Ej. 1.007.452.198"
                className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 transition-all"
              />
              {errors.studentDocument && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors.studentDocument}
                </p>
              )}
            </div>
          </section>

          {/* 5. Asistencia y Firmas Digitales */}
          <section className="section-interactive rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 space-y-5 transition-all duration-200">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-rose-500 text-xs font-mono font-bold text-white shadow-sm shadow-rose-500/25">
                5
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Validación de Asistencia y Firmas
              </h2>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Estado de asistencia
              </span>
              <div className="grid grid-cols-3 gap-2">
                {ATTENDANCE_STATUSES.map((status) => {
                  const active = attendanceStatus === status;
                  const Icon =
                    status === 'Asistió'
                      ? UserCheck
                      : status === 'No asistió'
                      ? UserX
                      : XCircle;
                  const activeStyle =
                    status === 'Asistió'
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                      : status === 'No asistió'
                      ? 'border-amber-500 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                      : 'border-rose-500 bg-gradient-to-br from-rose-600 to-red-500 text-white shadow-lg shadow-rose-500/25';
                  const hoverIdleStyle =
                    status === 'Asistió'
                      ? 'hover:border-emerald-400/70 hover:text-emerald-600 dark:hover:text-emerald-400'
                      : status === 'No asistió'
                      ? 'hover:border-amber-400/70 hover:text-amber-600 dark:hover:text-amber-400'
                      : 'hover:border-rose-400/70 hover:text-rose-600 dark:hover:text-rose-400';

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setAttendanceStatus(status);
                        setErrors((p) => ({ ...p, studentSignature: '' }));
                      }}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all duration-150 min-h-[50px] active:scale-95 ${
                        active
                          ? activeStyle
                          : `border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 ${hoverIdleStyle}`
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{status}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div id="field-studentSignature" className="space-y-1">
              <SignatureCanvas
                label="Firma del Estudiante"
                helperText={
                  attendanceStatus === 'Asistió'
                    ? 'Firma táctil del estudiante'
                    : 'Opcional si el estudiante no asistió'
                }
                value={studentSignature}
                onChange={(val) => {
                  setStudentSignature(val);
                  setErrors((p) => ({ ...p, studentSignature: '' }));
                }}
                hasError={Boolean(errors.studentSignature)}
                optional={attendanceStatus !== 'Asistió'}
                accentInkHex={activePaletteInk}
              />
              {errors.studentSignature && (
                <p className="text-xs font-medium text-rose-500">
                  {errors.studentSignature}
                </p>
              )}
            </div>

            <div id="field-instructorSignature" className="space-y-1">
              <SignatureCanvas
                label="Firma del Instructor"
                helperText="Firma táctil de validación del instructor"
                value={instructorSignature}
                onChange={(val) => {
                  setInstructorSignature(val);
                  setErrors((p) => ({ ...p, instructorSignature: '' }));
                }}
                hasError={Boolean(errors.instructorSignature)}
                accentInkHex={activePaletteInk}
              />
              {errors.instructorSignature && (
                <p className="text-xs font-medium text-rose-500">
                  {errors.instructorSignature}
                </p>
              )}
            </div>

            {/* Validation summary alert */}
            {Object.values(errors).some(Boolean) && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Completa los campos obligatorios antes de guardar:
                  </p>
                  <p className="mt-0.5 opacity-90">
                    Revisa los campos resaltados en rojo para sincronizar el registro.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-accent-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white min-h-[52px]"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Guardar y Sincronizar Registro</span>
            </button>
          </section>
        </div>
      </div>
    </form>
  );
};
