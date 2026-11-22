import { useEffect, useState } from 'react';
import {
  getSyncState,
  initCloudSync,
  subscribeToSyncUpdates,
} from '../services/dataService';

/** Escucha cambios de datos/estado sin iniciar la sincronización. */
export function useSyncState() {
  const [state, setState] = useState(getSyncState);

  useEffect(() => {
    const unsubscribe = subscribeToSyncUpdates(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}

/** Inicia la sincronización con Supabase una sola vez y expone su estado. */
export function useCloudSync() {
  const state = useSyncState();

  useEffect(() => {
    let active = true;
    let dispose: (() => void) | undefined;

    void initCloudSync().then((cleanup) => {
      if (active) {
        dispose = cleanup;
      } else {
        cleanup();
      }
    });

    return () => {
      active = false;
      dispose?.();
    };
  }, []);

  return state;
}
