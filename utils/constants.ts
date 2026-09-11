export const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const;

export const FAMILY_HISTORY_OPTIONS = [
  { value: 'none',    label: 'Ninguno' },
  { value: 'distant', label: 'Pariente lejano' },
  { value: 'close',   label: 'Pariente directo' },
] as const;

export const APPT_STATUS_LABELS: Record<string, string> = {
  solicitada: 'Solicitada',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada:  'Cancelada',
};

export const APPT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmada: { bg: '#DCF0EA', text: '#1A7A5E' },
  solicitada: { bg: '#FEF3C7', text: '#92400E' },
  completada: { bg: '#DBEAFE', text: '#1E40AF' },
  cancelada:  { bg: '#FEE2E2', text: '#991B1B' },
};

export const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  Bajo:      { bg: '#DCF0EA', text: '#1A7A5E' },
  Moderado:  { bg: '#FEF3C7', text: '#92400E' },
  Alto:      { bg: '#FFEDD5', text: '#9A3412' },
  'Muy alto':{ bg: '#FEE2E2', text: '#991B1B' },
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  receta:  'Receta',
  informe: 'Informe',
};

export const DOC_TYPE_ICONS: Record<string, string> = {
  receta:  'medkit-outline',
  informe: 'document-text-outline',
};

export const VADEMECUM_MIN_QUERY_LENGTH = 2;