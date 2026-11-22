import React, { useState } from 'react';
import {
  Printer,
  Trash2,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { ClassRecord } from '../types/cea';
import { CATEGORY_COLOR_THEMES } from '../utils/colorPalette';

interface RecordDetailModalProps {
  record: ClassRecord | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!record) return null;

  const StatusIcon =
    record.attendanceStatus === 'Asistió'
      ? UserCheck
      : record.attendanceStatus === 'No asistió'
      ? UserX
      : XCircle;

  const statusTextColor =
    record.attendanceStatus === 'Asistió'
      ? 'text-emerald-600 dark:text-emerald-400'
      : record.attendanceStatus === 'No asistió'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  const catTheme = CATEGORY_COLOR_THEMES[record.licenseCategory];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto print:static print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-record-title"
        onClick={(e) => e.stopPropagation()}
        className="print-only-sheet relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <p
              className="font-mono text-xs font-semibold"
              style={{ color: 'var(--accent-text)' }}
            >
              {record.id} · Acta Digital de Clase CEA
            </p>
            <h2
              id="modal-record-title"
              className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
            >
              {record.studentName}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              <span className={`font-semibold ${catTheme.text}`}>
                Categoría {record.licenseCategory}
              </span>{' '}
              ·{' '}
              <span className={`inline-flex items-center gap-1 font-medium ${statusTextColor}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {record.attendanceStatus}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="no-print inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Fecha y Horario
            </span>
            <span className="mt-0.5 block font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
              {record.date} · {record.startTime} – {record.endTime} ({record.totalHours} h)
            </span>
          </div>

          <div>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Documento del Estudiante
            </span>
            <span className="mt-0.5 block font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
              CC / Doc. {record.studentDocument}
            </span>
          </div>

          <div>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Instructor Asignado
            </span>
            <span className="mt-0.5 block font-medium text-slate-900 dark:text-slate-100">
              {record.instructorName}
            </span>
            <span className="block font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              ID {record.instructorDocument}
            </span>
          </div>

          <div>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Placa del Vehículo
            </span>
            {record.vehiclePlate ? (
              <span className="mt-0.5 block font-mono font-semibold text-slate-900 dark:text-slate-100">
                {record.vehiclePlate}
              </span>
            ) : (
              <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
                Sin placa registrada
              </span>
            )}
          </div>
        </div>

        {/* Captured Digital Signatures */}
        <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-5">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 mb-3">
            Firmas digitales capturadas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-3">
              <div className="h-24 flex items-center justify-center">
                {record.studentSignature ? (
                  <img
                    src={record.studentSignature}
                    alt={`Firma del estudiante ${record.studentName}`}
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Sin firma ({record.attendanceStatus})
                  </span>
                )}
              </div>
              <div className="mt-2 border-t border-slate-100 pt-1.5 text-center">
                <p className="text-xs font-medium text-slate-800 truncate">
                  {record.studentName}
                </p>
                <p className="text-[11px] text-slate-500">Estudiante</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-3">
              <div className="h-24 flex items-center justify-center">
                {record.instructorSignature ? (
                  <img
                    src={record.instructorSignature}
                    alt={`Firma del instructor ${record.instructorName}`}
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">Sin firma</span>
                )}
              </div>
              <div className="mt-2 border-t border-slate-100 pt-1.5 text-center">
                <p className="text-xs font-medium text-slate-800 truncate">
                  {record.instructorName}
                </p>
                <p className="text-[11px] text-slate-500">Instructor CEA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-5">
          <div>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar registro</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(record.id);
                    setConfirmDelete(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors min-h-[44px]"
                >
                  Confirmar eliminación
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="btn-accent-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white min-h-[44px] whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
