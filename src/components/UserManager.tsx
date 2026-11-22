import React, { useEffect, useState } from 'react';
import { Save, Users, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { UserProfile, UserRole } from '../hooks/useAuth';

interface UserManagerProps {
  onClose: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, document_id, role')
      .order('created_at', { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    const list = (data || []) as UserProfile[];
    setUsers(list);
    setDocs(
      Object.fromEntries(list.map((u) => [u.id, u.document_id || '']))
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const changeRole = async (user: UserProfile, role: UserRole) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id);
    if (error) {
      setError(error.message);
      return;
    }
    setError('');
    await load();
  };

  const saveDoc = async (user: UserProfile) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({ document_id: docs[user.id]?.trim() || null })
      .eq('id', user.id);
    if (error) {
      setError(error.message);
      return;
    }
    setError('');
    await load();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="users-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2
              id="users-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Usuarios y roles
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              El documento del instructor vincula sus registros con su usuario.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gestión de usuarios"
            className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {users.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">
              No hay usuarios registrados.
            </p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr_auto] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {u.full_name || u.email}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {u.email}
                  </p>
                </div>
                <select
                  value={u.role}
                  onChange={(e) =>
                    changeRole(u, e.target.value as UserRole)
                  }
                  aria-label={`Rol de ${u.email}`}
                  className="accent-focus min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="admin">Admin</option>
                  <option value="instructor">Instructor</option>
                </select>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={docs[u.id] || ''}
                    onChange={(e) =>
                      setDocs((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                    placeholder="Documento"
                    className="accent-focus w-full min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => saveDoc(u)}
                    aria-label={`Guardar documento de ${u.email}`}
                    className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 sm:hidden">
                  <Users className="inline w-3 h-3" /> {u.role}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
