// ─────────────────────────────────────────────────────────────────────────────
// SecMed API — apunta al backend Railway
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = 'https://secmed-demo-production.up.railway.app/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type PatientSummary = { id: string; name: string };

export type Patient = {
  id: string; name: string; blood_type: string;
  organ_donor: boolean; vaccination_complete: boolean; last_visit_days: number;
  age: number; sex: string; bmi: number; waist_cm: number;
  systolic_bp: number; total_cholesterol: number; hdl_cholesterol: number;
  smoker: boolean; physically_active: boolean; daily_fruit_veg: boolean;
  bp_medication: boolean; history_high_glucose: boolean;
  family_history_diabetes: 'none' | 'distant' | 'close';
  diabetes_diagnosed: boolean; record_commitment: string;
};

export type NewPatient = Omit<Patient, 'record_commitment'>;

export type RiskFactor   = { label: string; value: string | number; points: number };
export type RiskResult   = {
  score: number; max_score: number; category: string;
  category_index: number; color: string; factors: RiskFactor[];
};
export type PatientRisk  = { cardiovascular: RiskResult; diabetes: RiskResult };

// SOAP / IA
export type Evaluation = { descripcion: string; codigo_cie10: string; nombre_cie10: string };
export type SoapNote   = {
  motivo: string; subjetivo: string; objetivo: string;
  evaluacion: Evaluation[]; plan: string;
};
export type ScribeResponse = { soap: SoapNote; raw_note: string };

export type ClinicalConsideration = {
  direccion: string; razonamiento: string; accion_sugerida: string;
};
export type ReferralConsideration = {
  especialidad: string; motivo: string; urgencia: string;
};
export type DiagnoseResponse = {
  consideraciones: ClinicalConsideration[];
  preguntas_seguimiento: string[];
  derivacion: ReferralConsideration | null;
  disclaimer: string;
};

export type Medication = {
  nombre: string; presentacion: string; cantidad: string; indicaciones: string;
};

export type ReportContent = {
  titulo: string; resumen: string; antecedentes: string;
  hallazgos: string;
  evaluacion: Evaluation[];
  plan: string; recomendaciones: string;
};

// Citas
export type AppointmentStatus = 'solicitada' | 'confirmada' | 'completada' | 'cancelada';
export type Appointment = {
  id: string; patient_id: string; patient_name: string;
  starts_at: string; duration_min: number;
  reason: string; status: AppointmentStatus; created_by: string;
};

// Documentos
export type DocType = 'receta' | 'informe' | 'orden_lab' | 'resultado_lab' | 'resultado_externo' | 'informe_externo' | 'factura';
export type DocumentSummary = {
  id: string; patient_id: string; patient_name: string;
  doc_type: DocType; title: string; issued_at: number; delivered: boolean;
  lab_status?: string | null;
  source?: string | null;
  file_hash?: string | null;
  review_status?: string | null;
  amount?: number | null;
  currency?: string | null;
};
export type DocumentDetail = DocumentSummary & {
  content: any; content_hash: string;
  issuer: string; verify_path: string;
};

// Documento tiene un escaneo/foto original guardado (viene del flujo de
// "documento externo": resultado o informe subido como foto/PDF).
export const hasOriginalFile = (doc: { doc_type: DocType; file_hash?: string | null }) =>
  !!doc.file_hash && (doc.doc_type === 'resultado_externo' || doc.doc_type === 'informe_externo');

export const documentFileUrl = (id: string) => `${BASE_URL}/documents/${id}/file`;

// ZK
export type AttestResponse  = { attestation_id: string; verify_path: string; claim: string; issued_at: number };
export type VerifyResponse  = { valid: boolean; claim: string; issuer: string; issued_at: number; patient_name: string };

// ─── Pacientes ───────────────────────────────────────────────────────────────
export const listPatients   = ()                    => req<PatientSummary[]>('/patients');
export const getPatient     = (id: string)          => req<Patient>(`/patients/${id}`);
export const createPatient  = (body: NewPatient)    => req<PatientSummary>('/patients', { method: 'POST', body: JSON.stringify(body) });
export const deletePatient  = (id: string)          => req<void>(`/patients/${id}`, { method: 'DELETE' });
export const getPatientRisk = (id: string)          => req<PatientRisk>(`/patients/${id}/risk`);

// ─── IA / Consulta ───────────────────────────────────────────────────────────
export const scribe              = (patient_id: string, note: string)       => req<ScribeResponse>('/scribe', { method: 'POST', body: JSON.stringify({ patient_id, note }) });
export const diagnose            = (patient_id: string, notes: SoapNote[])  => req<DiagnoseResponse>('/diagnose', { method: 'POST', body: JSON.stringify({ patient_id, notes }) });
export const generateReport      = (patient_id: string, notes: SoapNote[])  => req<ReportContent>('/report', { method: 'POST', body: JSON.stringify({ patient_id, notes }) });
export const suggestPrescription = (text: string)                            => req<{ medicamentos: Medication[] }>('/prescription/suggest', { method: 'POST', body: JSON.stringify({ text }) });

// ─── Transcripción de audio ──────────────────────────────────────────────────
export const transcribeAudio = async (audioUri: string): Promise<{ text: string }> => {
  const form = new FormData();
  form.append('audio', { uri: audioUri, name: 'audio.m4a', type: 'audio/m4a' } as any);
  const res = await fetch(`${BASE_URL}/transcribe`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Error transcribiendo audio');
  return res.json();
};

// ─── Citas ───────────────────────────────────────────────────────────────────
export const listAppointments   = (patient_id?: string) => req<Appointment[]>(patient_id ? `/appointments?patient_id=${patient_id}` : '/appointments');
export const createAppointment  = (body: { patient_id: string; starts_at: string; duration_min?: number; reason?: string; created_by?: string }) => req<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(body) });
export const updateAppointment  = (id: string, body: Partial<Pick<Appointment, 'starts_at' | 'duration_min' | 'reason' | 'status'>>) => req<Appointment>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteAppointment  = (id: string) => req<void>(`/appointments/${id}`, { method: 'DELETE' });

// ─── Documentos ──────────────────────────────────────────────────────────────
export const listDocuments    = (patient_id?: string) => req<DocumentSummary[]>(patient_id ? `/documents?patient_id=${patient_id}` : '/documents');
export const getDocument      = (id: string)          => req<DocumentDetail>(`/documents/${id}`);
export const createDocument   = (body: { patient_id: string; doc_type: DocType; title: string; content: any }) => req<DocumentDetail>('/documents', { method: 'POST', body: JSON.stringify(body) });
export const deliverDocument  = (id: string)          => req<void>(`/documents/${id}/deliver`, { method: 'POST' });
export const verifyDocument   = (id: string)          => req<{ valid: boolean; content_hash: string; recomputed_hash: string; content: any; title: string; patient_name: string; issued_at: number }>(`/documents/${id}/verify`);

// ─── ZK Atestaciones ─────────────────────────────────────────────────────────
export const attestBloodType  = (patient_id: string, value: string)              => req<AttestResponse>('/attest', { method: 'POST', body: JSON.stringify({ predicate: 'blood_type', patient_id, value }) });
export const attestLastVisit  = (patient_id: string, threshold_days: number)    => req<AttestResponse>('/attest', { method: 'POST', body: JSON.stringify({ predicate: 'last_visit_within', patient_id, threshold_days }) });
export const verifyAttestation = (id: string)                                    => req<VerifyResponse>(`/verify/${id}`);

// ─── Vadémecum ───────────────────────────────────────────────────────────────
export type DrugProduct = {
  ef: string; nombre: string; principio_activo: string;
  pa_key: string | null; representante: string | null;
  fecha_vigencia: string | null; fecha_cancelado: string | null;
  is_active: boolean;
};

export type DrugMonograph = {
  id: string; dci: string; atc: string | null; via: string | null;
  indicaciones: string | null; posologia: string | null;
  contraindicaciones: string | null; interacciones: string | null;
  advertencias: string | null; embarazo: string | null;
  reacciones: string | null; sobredosis: string | null;
  source_url: string | null; fecha_actualizacion: string | null;
};

export type VademecumSearchResult = { products: DrugProduct[]; monographs: DrugMonograph[] };
export type ProductDetail = { product: DrugProduct; monograph: DrugMonograph | null };

export const searchVademecum   = (q: string)        => req<VademecumSearchResult>(`/vademecum/search?q=${encodeURIComponent(q)}`);
export const getVademecumProduct   = (ef: string)    => req<ProductDetail>(`/vademecum/product/${encodeURIComponent(ef)}`);
export const getVademecumMonograph = (id: string)    => req<DrugMonograph>(`/vademecum/monograph/${encodeURIComponent(id)}`);

// ─── Dashboard — estadísticas agregadas ──────────────────────────────────────
// El backend no expone un endpoint /stats propio; estas cifras se calculan
// en el cliente combinando los endpoints existentes. Si el backend crece,
// esto se puede reemplazar por una sola llamada a /api/dashboard.
export type DashboardStats = {
  totalPatients: number;
  appointmentsToday: number;
  confirmedAppointments: number;
  documentsThisMonth: number;
  // Tendencia de consultas: últimos 6 meses, incluyendo el actual.
  // Cada punto es el conteo de citas cuyo starts_at cae en ese mes.
  monthlyTrend: { label: string; count: number }[];
  monthOverMonthChange: number; // % de cambio del mes actual vs el anterior
};

const MONTH_LABELS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export async function getDashboardStats(): Promise<DashboardStats> {
  const [patients, appointments, documents] = await Promise.all([
    listPatients(), listAppointments(), listDocuments(),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const appointmentsToday = appointments.filter(a => a.starts_at.slice(0, 10) === todayStr).length;
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmada').length;

  const now = new Date();
  const documentsThisMonth = documents.filter(d => {
    const issued = new Date(d.issued_at * 1000);
    return issued.getMonth() === now.getMonth() && issued.getFullYear() === now.getFullYear();
  }).length;

  // Construye los últimos 6 meses (incluyendo el actual) y cuenta citas por mes.
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS_ES[d.getMonth()] });
  }
  const monthlyTrend = months.map(({ year, month, label }) => {
    const count = appointments.filter(a => {
      const d = new Date(a.starts_at);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;
    return { label, count };
  });

  const current  = monthlyTrend[monthlyTrend.length - 1]?.count ?? 0;
  const previous = monthlyTrend[monthlyTrend.length - 2]?.count ?? 0;
  const monthOverMonthChange = previous === 0
    ? (current > 0 ? 100 : 0)
    : Math.round(((current - previous) / previous) * 100);

  return {
    totalPatients: patients.length,
    appointmentsToday,
    confirmedAppointments,
    documentsThisMonth,
    monthlyTrend,
    monthOverMonthChange,
  };
}