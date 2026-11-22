import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, ClipboardEdit, UserCheck } from 'lucide-react';
import { dataService } from '../services/dataService';

interface InstructorAccessGateProps {
  onActivated: () => void;
  onNavigateToOffice: () => void;
}

/** Acceso único al módulo de registro mediante nombre + cédula pre-registrados. */
export const InstructorAccessGate: React.FC<InstructorAccessGateProps> = ({
  onActivated,
  onNavigateToOffice,
}) => {
  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = dataService.validateInstructor(name, documentId);
    if (!found) {
      setError(
        'No encontramos ese nombre y cédula. El instructor debe estar registrado previamente en el Panel de Oficina.'
      );
      return;
    }
    dataService.setInstructorSession({
      name: found.name,
      documentId: found.documentId,
    });
    setError('');
    onActivated();
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25">
            <ClipboardEdit className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Acceso del instructor
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Ingresa tu nombre y número de cédula tal como fueron registrados en
              el Panel de Oficina. Solo se activa una vez por dispositivo.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="instructor-name"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Nombre completo
            </label>
            <input
              id="instructor-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Ej. Carlos Andrés Mendoza"
              className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="instructor-doc"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Número de cédula
            </label>
            <input
              id="instructor-doc"
              type="text"
              value={documentId}
              onChange={(e) => {
                setDocumentId(e.target.value);
                setError('');
              }}
              placeholder="Ej. 79.845.210"
              className="accent-focus w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100"
            />
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-xs font-medium text-rose-500">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-accent-gradient w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white min-h-[52px]"
          >
            <UserCheck className="w-5 h-5" />
            Activar y registrar clases
          </button>
        </form>

        <button
          type="button"
          onClick={onNavigateToOffice}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al Panel de Oficina
        </button>
      </div>
    </div>
  );
};
