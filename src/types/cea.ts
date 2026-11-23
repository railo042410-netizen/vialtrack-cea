export type ClassType = 'Teórica' | 'Práctica' | 'Taller';

export type LicenseCategory = 'A2' | 'B1' | 'C1' | 'C2' | 'C3';

export type AttendanceStatus = 'Asistió' | 'No asistió' | 'Cancelada';

export interface Instructor {
  id: string;
  name: string;
  documentId: string;
  specialties: LicenseCategory[];
}

export interface FleetVehicle {
  plate: string;
  model: string;
  /** Categorías de licencia que puede atender este vehículo. */
  categories: LicenseCategory[];
  /** Compatibilidad con registros anteriores de una sola categoría. */
  category?: LicenseCategory;
  licenseId?: string;
  lastOdometer?: number;
}

export interface License {
  id: string;
  code: string;
  clientName: string;
  maxInstructors: number;
  maxVehicles: number;
  expiresAt: string; // YYYY-MM-DD
  enabled: boolean;
  isActive: boolean;
  createdAt: string;
  officeDeviceId?: string;
  isMaster?: boolean;
}

export interface ClassRecord {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  totalHours: number;
  instructorId: string;
  instructorName: string;
  instructorDocument: string;
  classType: ClassType;
  licenseCategory: LicenseCategory;
  vehiclePlate?: string;
  kmStart?: number;
  kmEnd?: number;
  studentName: string;
  studentDocument: string;
  topic?: string;
  attendanceStatus: AttendanceStatus;
  studentSignature?: string; // Data URL PNG/SVG
  instructorSignature?: string; // Data URL PNG/SVG
  createdAt: string; // ISO timestamp
  syncStatus: 'sincronizado' | 'pendiente_local';
}

export const LICENSE_CATEGORIES: { code: LicenseCategory; label: string }[] = [
  { code: 'A2', label: 'Motocicletas > 125cc' },
  { code: 'B1', label: 'Automóviles particulares' },
  { code: 'C1', label: 'Servicio público liviano' },
  { code: 'C2', label: 'Camiones rígidos / Buses' },
  { code: 'C3', label: 'Vehículos articulados' },
];

export const CLASS_TYPES: ClassType[] = ['Práctica', 'Teórica', 'Taller'];

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'Asistió',
  'No asistió',
  'Cancelada',
];
