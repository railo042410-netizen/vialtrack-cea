/**
 * dataService.js — Persistencia local + sincronización con Firebase Supabase
 * ============================================================================
 * El localStorage actúa como caché offline y Supabase/Postgres como fuente de
 * verdad en la nube. Las escrituras se encolan y se suben en cuanto hay red;
 * los cambios de otros dispositivos llegan en tiempo real vía Realtime.
 *
 * Si no hay variables VITE_SUPABASE_* configuradas, la app sigue funcionando
 * únicamente en modo local. Consulta SUPABASE_SETUP.md para la configuración.
 */

import { supabase, isCloudConfigured } from './supabase';

const STORAGE_KEYS = {
  RECORDS: 'vialtrack_cea_records_v1',
  INSTRUCTORS: 'vialtrack_cea_instructors_v1',
  VEHICLES: 'vialtrack_cea_vehicles_v1',
  LICENSES: 'vialtrack_cea_licenses_v1',
  SUBACCOUNTS: 'vialtrack_cea_subaccounts_v1',
};

const OUTBOX_KEY = 'vialtrack_cea_outbox_v1';
const CLOUD_SEEDED_KEY = 'vialtrack_cea_cloud_seeded_v1';
const ACTIVATED_LICENSE_KEY = 'vialtrack_cea_activated_license_v1';
const ACTIVATED_LICENSES_KEY = 'vialtrack_cea_activated_licenses_v1';
const SELECTED_LICENSE_KEY = 'vialtrack_cea_selected_license_v1';
const INSTRUCTOR_SESSION_KEY = 'vialtrack_cea_instructor_session_v1';
const DEVICE_ID_KEY = 'vialtrack_cea_device_id_v1';

// Código de administración: da acceso sin consumir licencia comercial.
const ADMIN_LICENSE_CODE =
  import.meta.env.VITE_ADMIN_LICENSE_KEY || 'REPORTVIAL-ADMIN';

const CLOUD_COLLECTIONS = {
  records: 'cea_registros',
  instructors: 'cea_instructores',
  vehicles: 'cea_vehiculos',
  licenses: 'cea_licencias',
  subaccounts: 'cea_subcuentas',
};

const STORAGE_FOR_COLLECTION = {
  records: STORAGE_KEYS.RECORDS,
  instructors: STORAGE_KEYS.INSTRUCTORS,
  vehicles: STORAGE_KEYS.VEHICLES,
  licenses: STORAGE_KEYS.LICENSES,
  subaccounts: STORAGE_KEYS.SUBACCOUNTS,
};

/**
 * Genera una firma caligráfica SVG realista en Data URL para los datos precargados.
 */
function buildSampleSignature(pathD) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120"><path d="${pathD}" fill="none" stroke="#0f172a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE_SIGNATURES = {
  inst1: buildSampleSignature('M28 84 C42 36, 56 26, 60 78 C64 94, 78 52, 96 66 C108 76, 124 44, 142 62 C158 78, 178 48, 206 58 C230 66, 262 56, 286 52'),
  inst2: buildSampleSignature('M34 74 C52 28, 72 90, 92 42 C104 20, 114 86, 134 62 C152 42, 176 76, 204 58 C226 44, 248 68, 276 54'),
  inst3: buildSampleSignature('M26 66 C48 48, 64 24, 76 76 C84 96, 108 38, 128 60 C148 80, 172 44, 198 64 C218 78, 248 58, 282 62'),
  inst4: buildSampleSignature('M32 82 C44 40, 62 38, 74 74 C88 92, 104 48, 124 56 C144 64, 168 38, 192 66 C214 88, 250 54, 288 60'),
  stud1: buildSampleSignature('M30 76 C46 52, 68 32, 78 72 C86 92, 112 52, 132 68 C154 84, 176 42, 204 62 C228 78, 254 54, 280 58'),
  stud2: buildSampleSignature('M38 72 C56 34, 70 84, 94 54 C112 32, 130 78, 156 58 C178 42, 204 72, 232 56 C252 46, 272 62, 290 54'),
  stud3: buildSampleSignature('M24 78 C48 30, 62 82, 84 48 C100 24, 118 82, 140 58 C162 36, 188 74, 214 56 C236 42, 260 66, 284 52'),
  stud4: buildSampleSignature('M36 68 C54 44, 74 30, 86 74 C98 92, 118 46, 142 64 C166 80, 194 44, 224 60 C248 72, 268 52, 292 56'),
};

function formatDateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// La app arranca de cero: no se precargan instructores ni vehículos.
const DEFAULT_INSTRUCTORS = [];
const DEFAULT_VEHICLES = [];

export const SUGGESTED_TOPICS = {
  Práctica: [
    'Control de embrague, arranque en pendiente y cambios',
    'Estacionamiento en reversa, paralelo y en bahía',
    'Conducción en vía urbana, glorietas y prelación',
    'Frenado de emergencia y control en piso húmedo',
    'Maniobras de seguridad en carretera y adelantamiento',
    'Evaluación práctica integral pre-licencia',
  ],
  Teórica: [
    'Normas de tránsito y señalización vial reglamentaria',
    'Seguridad activa, pasiva y manejo defensivo',
    'Responsabilidad civil, penal y comparendos',
    'Primeros auxilios y protocolo ante siniestros viales',
    'Factores de riesgo: fatiga, alcohol y velocidad',
  ],
  Taller: [
    'Inspección preoperacional y niveles de fluidos',
    'Sistema de frenos, suspensión y desgaste de llantas',
    'Cambio de neumático y uso de equipo de carretera',
    'Mecánica básica diésel y frenos de aire',
  ],
};

function createSeedRecords() {
  const today = formatDateOffset(0);
  const yesterday = formatDateOffset(1);
  const twoDaysAgo = formatDateOffset(2);
  const threeDaysAgo = formatDateOffset(3);
  const fiveDaysAgo = formatDateOffset(5);

  return [
    {
      id: 'REG-2026-1012',
      date: today,
      startTime: '06:30',
      endTime: '08:30',
      totalHours: 2,
      instructorId: 'inst-01',
      instructorName: 'Carlos Andrés Mendoza',
      instructorDocument: '79.845.210',
      classType: 'Práctica',
      licenseCategory: 'B1',
      vehiclePlate: 'KLM-482',
      kmStart: 42282,
      kmEnd: 42310,
      studentName: 'Valentina Ríos Castaño',
      studentDocument: '1.007.452.198',
      topic: 'Conducción en vía urbana, glorietas y prelación',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud1,
      instructorSignature: SAMPLE_SIGNATURES.inst1,
      createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1011',
      date: today,
      startTime: '07:00',
      endTime: '08:30',
      totalHours: 1.5,
      instructorId: 'inst-02',
      instructorName: 'Laura Sofía Ramírez',
      instructorDocument: '52.914.633',
      classType: 'Práctica',
      licenseCategory: 'A2',
      vehiclePlate: 'MOT-64F',
      kmStart: 14756,
      kmEnd: 14780,
      studentName: 'Sebastián Gómez Muñoz',
      studentDocument: '1.019.832.411',
      topic: 'Frenado de emergencia y control en pista de conos',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud2,
      instructorSignature: SAMPLE_SIGNATURES.inst2,
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1010',
      date: today,
      startTime: '08:00',
      endTime: '10:00',
      totalHours: 2,
      instructorId: 'inst-04',
      instructorName: 'Marcela Patricia Vargas',
      instructorDocument: '1.032.391.477',
      classType: 'Teórica',
      licenseCategory: 'B1',
      studentName: 'Camila Andrea Torres',
      studentDocument: '1.026.589.302',
      topic: 'Normas de tránsito y señalización vial reglamentaria',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud3,
      instructorSignature: SAMPLE_SIGNATURES.inst4,
      createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1009',
      date: today,
      startTime: '09:00',
      endTime: '10:30',
      totalHours: 1.5,
      instructorId: 'inst-03',
      instructorName: 'Jhonathan David Ospina',
      instructorDocument: '1.018.442.890',
      classType: 'Práctica',
      licenseCategory: 'C2',
      vehiclePlate: 'TRK-714',
      kmStart: 118492,
      kmEnd: 118520,
      studentName: 'Mauricio Beltrán Salcedo',
      studentDocument: '80.241.955',
      topic: 'Maniobras de seguridad en carretera y frenos de aire',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud4,
      instructorSignature: SAMPLE_SIGNATURES.inst3,
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1008',
      date: today,
      startTime: '10:00',
      endTime: '11:00',
      totalHours: 1,
      instructorId: 'inst-01',
      instructorName: 'Carlos Andrés Mendoza',
      instructorDocument: '79.845.210',
      classType: 'Práctica',
      licenseCategory: 'C1',
      vehiclePlate: 'SPB-207',
      kmStart: 64120,
      kmEnd: 64120,
      studentName: 'Diego Alejandro Parra',
      studentDocument: '1.015.490.214',
      topic: 'Estacionamiento en reversa, paralelo y en bahía',
      attendanceStatus: 'No asistió',
      instructorSignature: SAMPLE_SIGNATURES.inst1,
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1007',
      date: yesterday,
      startTime: '14:00',
      endTime: '16:00',
      totalHours: 2,
      instructorId: 'inst-02',
      instructorName: 'Laura Sofía Ramírez',
      instructorDocument: '52.914.633',
      classType: 'Práctica',
      licenseCategory: 'B1',
      vehiclePlate: 'FTR-915',
      kmStart: 18908,
      kmEnd: 18940,
      studentName: 'Juliana Morales Díaz',
      studentDocument: '1.030.614.872',
      topic: 'Control de embrague, arranque en pendiente y cambios',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud1,
      instructorSignature: SAMPLE_SIGNATURES.inst2,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1006',
      date: yesterday,
      startTime: '16:30',
      endTime: '18:30',
      totalHours: 2,
      instructorId: 'inst-04',
      instructorName: 'Marcela Patricia Vargas',
      instructorDocument: '1.032.391.477',
      classType: 'Taller',
      licenseCategory: 'B1',
      vehiclePlate: 'KLM-482',
      kmStart: 42278,
      kmEnd: 42282,
      studentName: 'Nicolás Herrera Quintero',
      studentDocument: '1.012.394.710',
      topic: 'Inspección preoperacional y cambio de neumático',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud2,
      instructorSignature: SAMPLE_SIGNATURES.inst4,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 21).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1005',
      date: yesterday,
      startTime: '18:30',
      endTime: '20:30',
      totalHours: 2,
      instructorId: 'inst-01',
      instructorName: 'Carlos Andrés Mendoza',
      instructorDocument: '79.845.210',
      classType: 'Teórica',
      licenseCategory: 'C1',
      studentName: 'Brayan Stiven Lozano',
      studentDocument: '1.022.984.105',
      topic: 'Responsabilidad civil, penal y comparendos',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud3,
      instructorSignature: SAMPLE_SIGNATURES.inst1,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1004',
      date: twoDaysAgo,
      startTime: '08:00',
      endTime: '10:00',
      totalHours: 2,
      instructorId: 'inst-03',
      instructorName: 'Jhonathan David Ospina',
      instructorDocument: '1.018.442.890',
      classType: 'Práctica',
      licenseCategory: 'C3',
      vehiclePlate: 'ART-309',
      kmStart: 204570,
      kmEnd: 204610,
      studentName: 'Héctor Fabio Cárdenas',
      studentDocument: '91.472.603',
      topic: 'Acople de semirremolque y giro amplio en intersección',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud4,
      instructorSignature: SAMPLE_SIGNATURES.inst3,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1003',
      date: twoDaysAgo,
      startTime: '11:00',
      endTime: '12:30',
      totalHours: 1.5,
      instructorId: 'inst-02',
      instructorName: 'Laura Sofía Ramírez',
      instructorDocument: '52.914.633',
      classType: 'Práctica',
      licenseCategory: 'A2',
      vehiclePlate: 'MOT-89G',
      kmStart: 22395,
      kmEnd: 22415,
      studentName: 'Mariana Castro Pineda',
      studentDocument: '1.000.843.219',
      topic: 'Equilibrio a baja velocidad y trazado en curva',
      attendanceStatus: 'Cancelada',
      instructorSignature: SAMPLE_SIGNATURES.inst2,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 53).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1002',
      date: threeDaysAgo,
      startTime: '15:00',
      endTime: '17:00',
      totalHours: 2,
      instructorId: 'inst-04',
      instructorName: 'Marcela Patricia Vargas',
      instructorDocument: '1.032.391.477',
      classType: 'Teórica',
      licenseCategory: 'A2',
      studentName: 'Cristian Camilo Ruiz',
      studentDocument: '1.014.329.874',
      topic: 'Seguridad activa, pasiva y manejo defensivo',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud1,
      instructorSignature: SAMPLE_SIGNATURES.inst4,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 74).toISOString(),
      syncStatus: 'sincronizado',
    },
    {
      id: 'REG-2026-1001',
      date: fiveDaysAgo,
      startTime: '07:30',
      endTime: '09:30',
      totalHours: 2,
      instructorId: 'inst-01',
      instructorName: 'Carlos Andrés Mendoza',
      instructorDocument: '79.845.210',
      classType: 'Práctica',
      licenseCategory: 'B1',
      vehiclePlate: 'KLM-482',
      kmStart: 42240,
      kmEnd: 42278,
      studentName: 'Esteban Duarte Vélez',
      studentDocument: '1.020.774.512',
      topic: 'Evaluación práctica integral pre-licencia',
      attendanceStatus: 'Asistió',
      studentSignature: SAMPLE_SIGNATURES.stud2,
      instructorSignature: SAMPLE_SIGNATURES.inst1,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
      syncStatus: 'sincronizado',
    },
  ];
}

function readStorage(key, fallbackFactory) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = fallbackFactory();
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return fallbackFactory();
  }
}

// ---------------------------------------------------------------------------
// Motor de sincronización: Supabase <-> caché local (localStorage)
// ---------------------------------------------------------------------------

let syncState = {
  configured: isCloudConfigured,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pending: 0,
  lastSyncedAt: null,
  error: null,
  dataVersion: 0,
};

const syncListeners = new Set();
let cloudReady = false;
let flushing = false;

function notifySync() {
  for (const listener of syncListeners) {
    listener({ ...syncState, pending: readOutbox().length });
  }
}

function notifyDataChanged() {
  syncState = { ...syncState, dataVersion: syncState.dataVersion + 1 };
  notifySync();
}

/** Estado actual de la sincronización (para la UI). */
export function getSyncState() {
  return { ...syncState, pending: readOutbox().length };
}

/** Suscribe a cambios de datos y de estado de sincronización. */
export function subscribeToSyncUpdates(listener) {
  syncListeners.add(listener);
  listener(getSyncState());
  return () => syncListeners.delete(listener);
}

function readOutbox() {
  return readStorage(OUTBOX_KEY, () => []);
}

function writeOutbox(ops) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
}

function enqueue(op) {
  const ops = readOutbox();
  ops.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...op,
  });
  writeOutbox(ops);
  notifySync();
  void flushOutbox();
}

function getDocId(item, collectionKey) {
  return collectionKey === 'vehicles' ? item.plate : item.id;
}

function cloudPayload(collectionKey, item) {
  const clean = JSON.parse(JSON.stringify(item)); // elimina campos undefined
  if (collectionKey === 'records') clean.syncStatus = 'sincronizado';
  return clean;
}

/** Lee una tabla completa y reconstruye los objetos de dominio. */
async function fetchTable(table) {
  // cea_subcuentas usa columnas planas; el resto guarda el objeto en `data`.
  const flat = table === CLOUD_COLLECTIONS.subaccounts;
  const { data, error } = await supabase
    .from(table)
    .select(flat ? '*' : 'id, data');
  if (error) throw error;
  if (flat) return data || [];
  return (data || []).map((row) => ({ id: row.id, ...row.data }));
}

async function writeSeedToCloud(seed) {
  // Vacía las tres tablas antes de insertar el dataset indicado (vacío al limpiar).
  for (const table of Object.values(CLOUD_COLLECTIONS)) {
    const { error } = await supabase.from(table).delete().neq('id', '');
    if (error) throw error;
  }

  const groups = {
    records: seed.records || [],
    instructors: seed.instructors || [],
    vehicles: seed.vehicles || [],
    licenses: seed.licenses || [],
    subaccounts: seed.subaccounts || [],
  };

  for (const [key, items] of Object.entries(groups)) {
    const rows = items.map((item) => ({
      id: getDocId(item, key),
      data: cloudPayload(key, item),
    }));
    if (rows.length === 0) continue;
    const { error } = await supabase.from(CLOUD_COLLECTIONS[key]).upsert(rows);
    if (error) throw error;
  }
}

async function applyCloudOp(op) {
  if (!supabase) return;
  if (op.type === 'reset_demo') {
    await writeSeedToCloud(op.payload);
    return;
  }
  const table = CLOUD_COLLECTIONS[op.collection];
  if (!table) return;

  if (op.type === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', op.docId);
    if (error) throw error;
  } else if (op.type === 'save') {
    const row = {
      id: getDocId(op.payload, op.collection),
      data: cloudPayload(op.collection, op.payload),
    };
    const { error } = await supabase.from(table).upsert(row);
    if (error) throw error;
  }
}

function markRecordAsSynced(id) {
  const records = readStorage(STORAGE_KEYS.RECORDS, () => []);
  const index = records.findIndex((r) => r.id === id);
  if (index === -1 || records[index].syncStatus === 'sincronizado') return;
  records[index] = { ...records[index], syncStatus: 'sincronizado' };
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  notifyDataChanged();
}

/** Envía a Supabase las operaciones encoladas. */
export async function flushOutbox() {
  if (!isCloudConfigured || !supabase || flushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  flushing = true;
  try {
    let ops = readOutbox();
    while (ops.length > 0) {
      const op = ops[0];
      try {
        await applyCloudOp(op);
        ops = readOutbox().filter((pending) => pending.id !== op.id);
        writeOutbox(ops);
        if (op.collection === 'records' && op.type === 'save') {
          markRecordAsSynced(op.payload.id);
        }
      } catch (error) {
        syncState = {
          ...syncState,
          error: error?.message || 'Error al sincronizar con Supabase',
        };
        notifySync();
        break;
      }
    }
    if (ops.length === 0) {
      syncState = {
        ...syncState,
        error: null,
        lastSyncedAt: new Date().toISOString(),
      };
    }
  } finally {
    flushing = false;
    notifySync();
  }
}

function mergeCloudSnapshot(collectionKey, cloudItems) {
  let merged = [...cloudItems];

  // Las operaciones pendientes locales prevalecen sobre lo que llega del server.
  for (const op of readOutbox()) {
    if (op.collection !== collectionKey) continue;
    if (op.type === 'delete') {
      merged = merged.filter(
        (item) => getDocId(item, collectionKey) !== op.docId
      );
    } else if (op.type === 'save') {
      const id = getDocId(op.payload, collectionKey);
      merged = merged.filter((item) => getDocId(item, collectionKey) !== id);
      merged.push(op.payload);
    }
  }

  // Conserva registros creados sin conexión que aún no han subido.
  if (collectionKey === 'records') {
    const localRecords = readStorage(STORAGE_KEYS.RECORDS, () => []);
    for (const local of localRecords) {
      if (
        local.syncStatus === 'pendiente_local' &&
        !merged.some((item) => item.id === local.id)
      ) {
        merged.push(local);
      }
    }
  }

  localStorage.setItem(
    STORAGE_FOR_COLLECTION[collectionKey],
    JSON.stringify(merged)
  );
  notifyDataChanged();
}

/** Comprueba/siembra Supabase y habilita la aplicación de cambios remotos. */
async function prepareCloud() {
  if (!supabase || cloudReady) return;

  try {
    let [records, instructors, vehicles, licenses, subaccounts] =
      await Promise.all([
        fetchTable(CLOUD_COLLECTIONS.records),
        fetchTable(CLOUD_COLLECTIONS.instructors),
        fetchTable(CLOUD_COLLECTIONS.vehicles),
        fetchTable(CLOUD_COLLECTIONS.licenses),
        fetchTable(CLOUD_COLLECTIONS.subaccounts),
      ]);

    const cloudIsEmpty =
      records.length === 0 &&
      instructors.length === 0 &&
      vehicles.length === 0 &&
      licenses.length === 0 &&
      subaccounts.length === 0;
    const alreadySeeded = localStorage.getItem(CLOUD_SEEDED_KEY) === '1';

    if (cloudIsEmpty && !alreadySeeded) {
      await writeSeedToCloud({
        records: readStorage(STORAGE_KEYS.RECORDS, () => []),
        instructors: readStorage(STORAGE_KEYS.INSTRUCTORS, () => DEFAULT_INSTRUCTORS),
        vehicles: readStorage(STORAGE_KEYS.VEHICLES, () => DEFAULT_VEHICLES),
        licenses: readStorage(STORAGE_KEYS.LICENSES, () => []),
        subaccounts: readStorage(STORAGE_KEYS.SUBACCOUNTS, () => []),
      });
      localStorage.setItem(CLOUD_SEEDED_KEY, '1');
      [records, instructors, vehicles, licenses, subaccounts] =
        await Promise.all([
          fetchTable(CLOUD_COLLECTIONS.records),
          fetchTable(CLOUD_COLLECTIONS.instructors),
          fetchTable(CLOUD_COLLECTIONS.vehicles),
          fetchTable(CLOUD_COLLECTIONS.licenses),
          fetchTable(CLOUD_COLLECTIONS.subaccounts),
        ]);
    }

    // La nube es la fuente de verdad al iniciar: hidrata la caché local.
    mergeCloudSnapshot('records', records);
    mergeCloudSnapshot('instructors', instructors);
    mergeCloudSnapshot('vehicles', vehicles);
    mergeCloudSnapshot('licenses', licenses);
    mergeCloudSnapshot('subaccounts', subaccounts);

    cloudReady = true;
    syncState = { ...syncState, error: null };
    notifySync();
  } catch (error) {
    cloudReady = false;
    syncState = {
      ...syncState,
      error: error?.message || 'No se pudo conectar con Supabase',
    };
    notifySync();
  }
}

/** Refresca una tabla desde Supabase tras un evento Realtime. */
async function refreshFromCloud(key) {
  if (!cloudReady || !supabase) return;
  try {
    const items = await fetchTable(CLOUD_COLLECTIONS[key]);
    mergeCloudSnapshot(key, items);
    syncState = { ...syncState, lastSyncedAt: new Date().toISOString() };
    notifySync();
  } catch (error) {
    syncState = {
      ...syncState,
      error: error?.message || 'Error al refrescar desde Supabase',
    };
    notifySync();
  }
}

/**
 * Siembra la nube la primera vez, abre el canal Realtime y reanuda la cola
 * pendiente. Devuelve una función de limpieza.
 */
export async function initCloudSync() {
  if (!isCloudConfigured || !supabase || typeof window === 'undefined') {
    syncState = { ...syncState, configured: false };
    notifySync();
    return () => {};
  }

  syncState = { ...syncState, configured: true };
  notifySync();

  await prepareCloud();

  const channel = supabase
    .channel('vialtrack-cea-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: CLOUD_COLLECTIONS.records },
      () => void refreshFromCloud('records')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: CLOUD_COLLECTIONS.instructors },
      () => void refreshFromCloud('instructors')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: CLOUD_COLLECTIONS.vehicles },
      () => void refreshFromCloud('vehicles')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: CLOUD_COLLECTIONS.licenses },
      () => void refreshFromCloud('licenses')
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: CLOUD_COLLECTIONS.subaccounts },
      () => void refreshFromCloud('subaccounts')
    )
    .subscribe();

  const handleOnline = () => {
    syncState = { ...syncState, online: true };
    notifySync();
    void prepareCloud().then(() => flushOutbox());
  };
  const handleOffline = () => {
    syncState = { ...syncState, online: false };
    notifySync();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  void flushOutbox();

  return () => {
    void supabase.removeChannel(channel);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ---------------------------------------------------------------------------
// API de datos usada por los componentes (sin cambios en su firma síncrona)
// ---------------------------------------------------------------------------

export const dataService = {
  /**
   * Obtiene todos los registros ordenados del más reciente al más antiguo.
   * @returns {import('../types/cea').ClassRecord[]}
   */
  getRecords() {
    const records = this.filterByLicense(
      readStorage(STORAGE_KEYS.RECORDS, () => [])
    );
    return [...records].sort((a, b) => {
      const dateCmp = `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  },

  /**
   * Guarda un nuevo registro: escribe en caché y encola su subida a Supabase.
   * @param {Omit<import('../types/cea').ClassRecord, 'id' | 'createdAt' | 'syncStatus'>} payload
   * @returns {import('../types/cea').ClassRecord}
   */
  saveRecord(payload) {
    const records = this.getRecords();
    const newRecord = {
      ...payload,
      id: `REG-${new Date().getFullYear()}-${String(1013 + records.length).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      syncStatus: isCloudConfigured ? 'pendiente_local' : 'sincronizado',
      licenseId: this.getCurrentLicenseId() || undefined,
    };

    const updated = [newRecord, ...records];
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
    enqueue({ collection: 'records', type: 'save', docId: newRecord.id, payload: newRecord });
    notifyDataChanged();
    return newRecord;
  },

  /**
   * Elimina un registro por ID (en caché y, al sincronizar, en la nube).
   * @param {string} id
   * @returns {import('../types/cea').ClassRecord[]}
   */
  deleteRecord(id) {
    const records = this.getRecords();
    const filtered = records.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(filtered));
    enqueue({ collection: 'records', type: 'delete', docId: id });
    notifyDataChanged();
    return filtered;
  },

  /**
   * Lista de instructores registrados.
   * @returns {import('../types/cea').Instructor[]}
   */
  getInstructors() {
    return this.filterByLicense(
      readStorage(STORAGE_KEYS.INSTRUCTORS, () => DEFAULT_INSTRUCTORS)
    );
  },

  /**
   * Agrega un nuevo instructor al catálogo persistente.
   * @param {{ name: string; documentId: string; specialties?: import('../types/cea').LicenseCategory[] }} input
   * @returns {import('../types/cea').Instructor}
   */
  addInstructor({ name, documentId, specialties }) {
    const list = this.getInstructors();
    const created = {
      id: `inst-${Date.now().toString(36)}`,
      name: name.trim(),
      documentId: documentId.trim(),
      specialties: specialties && specialties.length > 0 ? specialties : ['B1'],
      licenseId: this.getCurrentLicenseId() || undefined,
    };
    const updated = [...list, created];
    localStorage.setItem(STORAGE_KEYS.INSTRUCTORS, JSON.stringify(updated));
    enqueue({ collection: 'instructors', type: 'save', docId: created.id, payload: created });
    notifyDataChanged();
    return created;
  },

  /**
   * Elimina un instructor del catálogo por ID.
   * @param {string} id
   * @returns {import('../types/cea').Instructor[]}
   */
  deleteInstructor(id) {
    const filtered = this.getInstructors().filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INSTRUCTORS, JSON.stringify(filtered));
    enqueue({ collection: 'instructors', type: 'delete', docId: id });
    notifyDataChanged();
    return filtered;
  },

  /**
   * Catálogo de vehículos / placas registradas de la academia.
   * @returns {import('../types/cea').FleetVehicle[]}
   */
  getVehicles() {
    return this.filterByLicense(
      readStorage(STORAGE_KEYS.VEHICLES, () => DEFAULT_VEHICLES)
    );
  },

  /**
   * Registra una nueva placa en la flota de la academia.
   * @param {{ plate: string; model: string; category: import('../types/cea').LicenseCategory }} input
   * @returns {{ vehicle: import('../types/cea').FleetVehicle; vehicles: import('../types/cea').FleetVehicle[] }}
   */
  addVehicle({ plate, model, category }) {
    const cleanPlate = plate.trim().toUpperCase();
    const list = this.getVehicles();
    const existing = list.find((v) => v.plate.toUpperCase() === cleanPlate);
    if (existing) {
      return { vehicle: existing, vehicles: list };
    }
    const created = {
      plate: cleanPlate,
      model: model.trim() || `Vehículo Cat. ${category}`,
      category,
      licenseId: this.getCurrentLicenseId() || undefined,
    };
    const updated = [...list, created];
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    enqueue({ collection: 'vehicles', type: 'save', docId: created.plate, payload: created });
    notifyDataChanged();
    return { vehicle: created, vehicles: updated };
  },

  /**
   * Elimina una placa del catálogo de la academia.
   * @param {string} plate
   * @returns {import('../types/cea').FleetVehicle[]}
   */
  deleteVehicle(plate) {
    const cleanPlate = plate.trim().toUpperCase();
    const filtered = this.getVehicles().filter(
      (v) => v.plate.toUpperCase() !== cleanPlate
    );
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(filtered));
    enqueue({ collection: 'vehicles', type: 'delete', docId: cleanPlate });
    notifyDataChanged();
    return filtered;
  },

  /**
   * Estudiantes recientes para autocompletado rápido en móvil.
   */
  getRecentStudents() {
    const records = this.getRecords();
    const map = new Map();
    for (const r of records) {
      if (r.studentDocument && !map.has(r.studentDocument)) {
        map.set(r.studentDocument, {
          name: r.studentName,
          document: r.studentDocument,
        });
      }
    }
    return Array.from(map.values());
  },

  /**
   * Catálogo de licencias comerciales.
   * @returns {import('../types/cea').License[]}
   */
  getLicenses() {
    return readStorage(STORAGE_KEYS.LICENSES, () => []);
  },

  /** Subcuentas creadas desde la plataforma maestra. */
  getSubaccounts() {
    return readStorage(STORAGE_KEYS.SUBACCOUNTS, () => []);
  },

  /** Genera un código legible y único para una licencia. */
  generateLicenseCode() {
    const block = () =>
      Math.random().toString(36).slice(2, 6).toUpperCase().padStart(4, '0');
    return `RV-${block()}-${block()}`;
  },

  /**
   * Crea una licencia (desactivada por defecto).
   * @param {{ clientName: string; maxInstructors: number; maxVehicles: number; expiresAt: string }} input
   * @returns {import('../types/cea').License}
   */
  addLicense({ clientName, maxInstructors, maxVehicles, expiresAt }) {
    const list = this.getLicenses();
    const created = {
      id: `lic-${Date.now().toString(36)}`,
      code: this.generateLicenseCode(),
      clientName: clientName.trim() || 'Cliente',
      maxInstructors: Math.max(0, Number(maxInstructors) || 0),
      maxVehicles: Math.max(0, Number(maxVehicles) || 0),
      expiresAt: expiresAt || '2099-12-31',
      enabled: true,
      isActive: true,
      isMaster: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, created];
    localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(updated));
    enqueue({ collection: 'licenses', type: 'save', docId: created.id, payload: created });
    notifyDataChanged();
    return created;
  },

  /**
   * Actualiza una licencia existente.
   * @param {import('../types/cea').License} license
   */
  updateLicense(license) {
    const updated = this.getLicenses().map((l) =>
      l.id === license.id ? license : l
    );
    localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(updated));
    enqueue({ collection: 'licenses', type: 'save', docId: license.id, payload: license });
    notifyDataChanged();
    return updated;
  },

  /**
   * Habilita o pausa una licencia. Varias pueden estar activas a la vez.
   * @param {string} id
   * @param {boolean} enabled
   */
  setLicenseEnabled(id, enabled) {
    const updated = this.getLicenses().map((l) =>
      l.id === id ? { ...l, enabled, isActive: enabled } : l
    );
    localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(updated));
    const target = updated.find((l) => l.id === id);
    if (target) {
      enqueue({
        collection: 'licenses',
        type: 'save',
        docId: id,
        payload: target,
      });
    }
    notifyDataChanged();
    return target || null;
  },

  /** Designa una licencia como maestra (solo una puede serlo). */
  setMasterLicense(id) {
    const updated = this.getLicenses().map((l) => ({
      ...l,
      isMaster: l.id === id,
    }));
    localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(updated));
    for (const license of updated.filter((l) => l.isMaster)) {
      enqueue({
        collection: 'licenses',
        type: 'save',
        docId: license.id,
        payload: license,
      });
    }
    notifyDataChanged();
    return updated.find((l) => l.id === id) || null;
  },

  /** Compatibilidad: activar una licencia la habilita sin desactivar las demás. */
  activateLicense(id) {
    return this.setLicenseEnabled(id, true);
  },

  /**
   * Elimina una licencia del catálogo.
   * @param {string} id
   */
  deleteLicense(id) {
    const filtered = this.getLicenses().filter((l) => l.id !== id);
    localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(filtered));
    enqueue({ collection: 'licenses', type: 'delete', docId: id });
    notifyDataChanged();
    return filtered;
  },

  /** Licencia seleccionada en este dispositivo (null en modo administrador). */
  getActiveLicense() {
    const selected = this.validateLicenseCode(this.getSelectedLicenseCode());
    return selected && selected.id ? selected : null;
  },

  getCurrentLicenseId() {
    return this.getActiveLicense()?.id || null;
  },

  /** Licencia maestra: desde ella se generan y activan las demás. */
  getMasterLicense() {
    return this.getLicenses().find((l) => l.isMaster) || null;
  },

  /** ¿La licencia seleccionada es la maestra? */
  isMasterLicenseActive() {
    const master = this.getMasterLicense();
    const current = this.getActiveLicense();
    return Boolean(master && current && master.id === current.id);
  },

  /** Filtra un catálogo para que cada licencia vea solo sus datos. */
  filterByLicense(items) {
    const id = this.getCurrentLicenseId();
    if (!id) return items;
    return items.filter((item) => item.licenseId === id);
  },

  /** Valida un código para activar una licencia en este dispositivo. */
  validateLicenseCode(code) {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) return null;
    if (clean === ADMIN_LICENSE_CODE.toUpperCase()) {
      return { code: clean, clientName: 'Administración', isAdmin: true };
    }
    const today = formatDateOffset(0);
    return (
      this.getLicenses().find(
        (l) =>
          l.code.toUpperCase() === clean &&
          l.enabled &&
          l.expiresAt >= today
      ) || null
    );
  },

  /** Códigos de licencia activados en este dispositivo. */
  getActivatedLicenses() {
    try {
      const list = JSON.parse(
        localStorage.getItem(ACTIVATED_LICENSES_KEY) || '[]'
      );
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  /** Activa una licencia adicional en este dispositivo y la selecciona. */
  setActivatedLicense(code) {
    const clean = (code || '').trim().toUpperCase();
    if (!this.validateLicenseCode(clean)) return false;
    const list = this.getActivatedLicenses();
    if (!list.includes(clean)) {
      list.push(clean);
      try {
        localStorage.setItem(ACTIVATED_LICENSES_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }
    }
    try {
      localStorage.setItem(ACTIVATED_LICENSE_KEY, clean);
    } catch {
      // ignore
    }
    this.setSelectedLicenseCode(clean);
    return true;
  },

  /** Código de licencia actualmente seleccionado. */
  getSelectedLicenseCode() {
    try {
      const current = localStorage.getItem(SELECTED_LICENSE_KEY) || '';
      if (current && this.validateLicenseCode(current)) return current;
      const first = this.getActivatedLicenses().find((c) =>
        this.validateLicenseCode(c)
      );
      if (first) localStorage.setItem(SELECTED_LICENSE_KEY, first);
      return first || '';
    } catch {
      return '';
    }
  },

  /** Cambia la licencia activa en este dispositivo. */
  setSelectedLicenseCode(code) {
    try {
      localStorage.setItem(SELECTED_LICENSE_KEY, (code || '').trim().toUpperCase());
    } catch {
      // ignore
    }
    notifyDataChanged();
  },

  /** Compatibilidad con el activation anterior. */
  getActivatedCode() {
    return this.getSelectedLicenseCode();
  },

  setActivatedCode(code) {
    this.setActivatedLicense(code);
  },

  /** Cierra la sesión de licencias en este dispositivo. */
  logout() {
    try {
      localStorage.removeItem(ACTIVATED_LICENSE_KEY);
      localStorage.removeItem(ACTIVATED_LICENSES_KEY);
      localStorage.removeItem(SELECTED_LICENSE_KEY);
      localStorage.removeItem(INSTRUCTOR_SESSION_KEY);
    } catch {
      // ignore
    }
    notifyDataChanged();
  },

  /** Identificador estable de este equipo. */
  getDeviceId() {
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return 'unknown-device';
    }
  },

  /** ¿El Panel de Oficina de esta licencia puede usarse en este equipo? */
  canUseOffice(license) {
    if (!license || !license.id) return true; // modo administrador
    if (license.isMaster) return true; // la maestra abre en cualquier equipo
    return !license.officeDeviceId || license.officeDeviceId === this.getDeviceId();
  },

  /** Vincula el Panel de Oficina de una licencia al primer equipo que lo abre. */
  bindOfficeDevice(license) {
    if (!license || !license.id || license.isMaster || license.officeDeviceId) {
      return license;
    }
    const updated = { ...license, officeDeviceId: this.getDeviceId() };
    this.updateLicense(updated);
    return updated;
  },

  /** ¿Este dispositivo tiene una licencia válida activada? */
  isDeviceLicensed() {
    return Boolean(this.validateLicenseCode(this.getSelectedLicenseCode()));
  },

  /** Sesión del instructor activado en este dispositivo. */
  getInstructorSession() {
    try {
      return JSON.parse(localStorage.getItem(INSTRUCTOR_SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  },

  /** Guarda la sesión del instructor en este dispositivo (activación única). */
  setInstructorSession(session) {
    try {
      localStorage.setItem(INSTRUCTOR_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
    notifyDataChanged();
  },

  /** Verifica nombre + cédula contra los instructores registrados en oficina. */
  validateInstructor(name, documentId) {
    const cleanName = (name || '').trim().toLowerCase();
    const cleanDoc = (documentId || '').trim();
    if (!cleanName || !cleanDoc) return null;
    return (
      this.getInstructors().find(
        (i) =>
          i.documentId.trim() === cleanDoc &&
          i.name.trim().toLowerCase() === cleanName
      ) || null
    );
  },

  /** ¿La sesión guardada sigue correspondiendo a un instructor registrado? */
  isInstructorSessionValid() {
    const session = this.getInstructorSession();
    return Boolean(
      session && this.validateInstructor(session.name, session.documentId)
    );
  },

  /**
   * Vacía por completo los datos locales y de la nube para empezar de cero.
   * @returns {import('../types/cea').ClassRecord[]}
   */
  clearAllData() {
    const empty = {
      records: [],
      instructors: [],
      vehicles: [],
      licenses: [],
      subaccounts: [],
    };
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INSTRUCTORS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SUBACCOUNTS, JSON.stringify([]));
    localStorage.removeItem(ACTIVATED_LICENSE_KEY);
    localStorage.removeItem(ACTIVATED_LICENSES_KEY);
    localStorage.removeItem(SELECTED_LICENSE_KEY);
    localStorage.removeItem(INSTRUCTOR_SESSION_KEY);
    localStorage.setItem(CLOUD_SEEDED_KEY, '1');
    enqueue({ collection: 'all', type: 'reset_demo', docId: 'empty', payload: empty });
    notifyDataChanged();
    return [];
  },
};

/**
 * Exporta registros filtrados a CSV con BOM UTF-8 compatible con Excel en español.
 * @param {import('../types/cea').ClassRecord[]} records
 * @param {string} [filenamePrefix]
 */
export function exportRecordsToCSV(records, filenamePrefix = 'vialtrack_cea_registros') {
  const headers = [
    'ID Registro',
    'Fecha',
    'Hora Inicio',
    'Hora Fin',
    'Horas Dictadas',
    'Instructor',
    'Documento Instructor',
    'Categoría Licencia',
    'Placa Vehículo',
    'Estudiante',
    'Documento Estudiante',
    'Estado Asistencia',
    'Firma Estudiante',
    'Firma Instructor',
  ];

  const escapeCell = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = records.map((r) => {
    return [
      r.id,
      r.date,
      r.startTime,
      r.endTime,
      r.totalHours.toFixed(2).replace('.', ','),
      r.instructorName,
      r.instructorDocument,
      r.licenseCategory,
      r.vehiclePlate || 'N/A',
      r.studentName,
      r.studentDocument,
      r.attendanceStatus,
      r.studentSignature ? 'Capturada' : 'Sin firma',
      r.instructorSignature ? 'Capturada' : 'Sin firma',
    ]
      .map(escapeCell)
      .join(';');
  });

  // BOM UTF-8 + separador ';' para apertura directa con tildes en Microsoft Excel (configuración regional ES)
  const csvContent = '\uFEFF' + [headers.map(escapeCell).join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = formatDateOffset(0);
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
