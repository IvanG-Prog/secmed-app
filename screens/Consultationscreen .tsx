// ═══════════════════════════════════════════════════════════════
//  ConsultationScreen
//
//  Todo es opcional — el médico decide qué usar:
//
//  [Dictar] → graba audio → Whisper transcribe → texto en el campo
//  [Estructurar SOAP] → POST /api/scribe → nota SOAP con CIE-10
//  [Consultar IA] → POST /api/diagnose → consideraciones clínicas
//  [Generar receta] → POST /api/prescription/suggest
//  [Generar informe] → POST /api/report
//  [Guardar] → POST /api/documents
//
//  El médico puede simplemente escribir una nota y guardar un
//  documento sin pasar por ninguno de los pasos de IA.
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  scribe, diagnose, generateReport, suggestPrescription,
  createDocument, SoapNote, DiagnoseResponse, ReportContent, Medication,
  BASE_URL,
} from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';

type RecordState = 'idle' | 'recording' | 'transcribing';

// ─── Hook de grabación de voz ────────────────────────────────────────────────
function useVoiceRecorder(onTranscript: (text: string) => void) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [state, setState] = useState<RecordState>('idle');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { setError('Permiso de micrófono denegado.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState('recording');
    } catch (e: any) {
      setError('No se pudo iniciar la grabación.');
    }
  }, []);

  const stop = useCallback(async () => {
    if (!recordingRef.current) return;
    setState('transcribing');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) { setState('idle'); return; }
      const form = new FormData();
      form.append('audio', { uri, name: 'nota.m4a', type: 'audio/m4a' } as any);
      const res = await fetch(`${BASE_URL}/transcribe`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onTranscript(data.text ?? '');
    } catch (e: any) {
      setError('Error al transcribir: ' + e.message);
    } finally {
      setState('idle');
    }
  }, [onTranscript]);

  const toggle = useCallback(() => {
    state === 'recording' ? stop() : start();
  }, [state, start, stop]);

  return { state, error, toggle };
}

// ─── Tarjeta SOAP colapsable ────────────────────────────────────────────────
function SoapCard({ note, index, onRemove }: {
  note: SoapNote; index: number; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.soapCard, shadow.card]}>
      <TouchableOpacity style={styles.soapCardHead} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <Text style={styles.soapCardTitle} numberOfLines={1}>
          Nota {index + 1}{note.motivo ? ` — ${note.motivo}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Text style={{ color: colors.inkSoft, fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 14 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      {open && (
        <View style={styles.soapCardBody}>
          {[['S', note.subjetivo], ['O', note.objetivo], ['P', note.plan]]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <Text key={k} style={styles.soapLine}>
                <Text style={{ fontWeight: '700', color: colors.ink }}>{k}: </Text>
                {v}
              </Text>
            ))}
          {(note.evaluacion ?? []).map((e, i) => (
            <Text key={i} style={styles.soapCode}>{e.codigo_cie10} — {e.descripcion}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Bloque SOAP expandido (pantalla completa de la nota actual) ─────────────
function SoapBlock({ soap }: { soap: SoapNote }) {
  return (
    <>
      {[
        ['MOTIVO', soap.motivo],
        ['S — SUBJETIVO', soap.subjetivo],
        ['O — OBJETIVO', soap.objetivo],
        ['P — PLAN', soap.plan],
      ].filter(([, v]) => v).map(([label, value]) => (
        <View key={label} style={[styles.block, shadow.card]}>
          <Text style={styles.blockTag}>{label}</Text>
          <Text style={styles.blockText}>{value}</Text>
        </View>
      ))}
      {(soap.evaluacion ?? []).length > 0 && (
        <View style={[styles.block, shadow.card]}>
          <Text style={styles.blockTag}>A — EVALUACIÓN / CIE-10</Text>
          {soap.evaluacion.map((e, i) => (
            <View key={i} style={styles.evalRow}>
              <Text style={styles.evalCode}>{e.codigo_cie10}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.evalDesc}>{e.descripcion}</Text>
                <Text style={styles.evalName}>{e.nombre_cie10}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

// ─── Pantalla principal ──────────────────────────────────────────────────────
export default function ConsultationScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;

  // Texto libre
  const [rawNote, setRawNote] = useState('');

  // SOAP: nota actual y notas acumuladas de la consulta
  const [currentSoap, setCurrentSoap] = useState<SoapNote | null>(null);
  const [soaps,       setSoaps]       = useState<SoapNote[]>([]);

  // Resultados de IA
  const [dx,     setDx]     = useState<DiagnoseResponse | null>(null);
  const [report, setReport] = useState<ReportContent | null>(null);
  const [meds,   setMeds]   = useState<Medication[]>([]);

  // UI
  const [loadingScribe,   setLoadingScribe]   = useState(false);
  const [loadingDiagnose, setLoadingDiagnose] = useState(false);
  const [loadingReport,   setLoadingReport]   = useState(false);
  const [loadingRx,       setLoadingRx]       = useState(false);
  const [savingDoc,       setSavingDoc]       = useState(false);
  const [savedDocId,      setSavedDocId]      = useState<string | null>(null);

  // Qué secciones de resultado están visibles
  const [showSoap,    setShowSoap]    = useState(false);
  const [showDx,      setShowDx]      = useState(false);
  const [showReport,  setShowReport]  = useState(false);
  const [showRx,      setShowRx]      = useState(false);

  const handleTranscript = useCallback((text: string) => {
    setRawNote(prev => prev.trim() ? prev.trim() + ' ' + text : text);
  }, []);
  const voice = useVoiceRecorder(handleTranscript);

  // ── Acciones ──────────────────────────────────────────────────────────────

  const handleScribe = async () => {
    if (!rawNote.trim()) { Alert.alert('Nota vacía', 'Escribe o dicta algo primero.'); return; }
    setLoadingScribe(true);
    try {
      const res = await scribe(patientId, rawNote);
      setCurrentSoap(res.soap);
      setShowSoap(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoadingScribe(false); }
  };

  const addSoapToList = () => {
    if (!currentSoap) return;
    setSoaps(prev => [...prev, currentSoap]);
    setCurrentSoap(null);
    setRawNote('');
    setShowSoap(false);
    Alert.alert('Nota guardada', 'La nota SOAP se agregó a la consulta. Puedes dictar otra o continuar.');
  };

  const handleDiagnose = async () => {
    const all = currentSoap ? [...soaps, currentSoap] : soaps;
    if (!all.length && !rawNote.trim()) {
      Alert.alert('Sin notas', 'Agrega al menos una nota antes de consultar la IA.');
      return;
    }
    setLoadingDiagnose(true);
    try {
      const notesForDx = all.length ? all : [];
      if (!notesForDx.length && rawNote.trim()) {
        // Si solo hay nota libre, la estructura primero silenciosamente
        const r = await scribe(patientId, rawNote);
        notesForDx.push(r.soap);
      }
      const res = await diagnose(patientId, notesForDx);
      setDx(res);
      setShowDx(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoadingDiagnose(false); }
  };

  const handleRx = async () => {
    const plan = currentSoap?.plan ?? soaps.map(s => s.plan).filter(Boolean).join(' ') ?? rawNote;
    setLoadingRx(true);
    try {
      const res = await suggestPrescription(plan);
      setMeds(res.medicamentos);
      setShowRx(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoadingRx(false); }
  };

  const handleReport = async () => {
    const all = currentSoap ? [...soaps, currentSoap] : soaps;
    if (!all.length) { Alert.alert('Sin notas SOAP', 'Estructura al menos una nota primero.'); return; }
    setLoadingReport(true);
    try {
      const res = await generateReport(patientId, all);
      setReport(res);
      setShowReport(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoadingReport(false); }
  };

  const saveDoc = async (type: 'receta' | 'informe', content: any, title: string) => {
    setSavingDoc(true);
    try {
      const doc = await createDocument({ patient_id: patientId, doc_type: type, title, content });
      setSavedDocId(doc.id);
    } catch (e: any) { Alert.alert('Error al guardar', e.message); }
    finally { setSavingDoc(false); }
  };

  const voiceColors: Record<RecordState, string> = {
    idle: colors.secondary, recording: colors.danger, transcribing: colors.warning,
  };
  const voiceLabel: Record<RecordState, string> = {
    idle: '🎙  Dictar nota', recording: '⏹  Detener', transcribing: 'Transcribiendo…',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consulta</Text>
        <Text style={styles.headerSub}>{patientName}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. NOTA LIBRE ── */}
        <Text style={styles.sectionTitle}>Nota clínica</Text>
        <Text style={styles.sectionHint}>
          Escribe o dicta en lenguaje libre. Puedes estructurar en SOAP, consultar la IA, o simplemente guardar la nota directamente.
        </Text>

        <TextInput
          style={styles.noteInput}
          value={rawNote} onChangeText={setRawNote}
          placeholder="Paciente femenina 48 años, cefalea pulsátil 3 días, TA 140/90…"
          placeholderTextColor={colors.inkSoft}
          multiline numberOfLines={6} textAlignVertical="top"
        />

        {/* Botón de voz */}
        <TouchableOpacity
          style={[styles.voiceBtn, { borderColor: voiceColors[voice.state] }]}
          onPress={voice.toggle}
          disabled={voice.state === 'transcribing'}
          activeOpacity={0.8}
        >
          {voice.state === 'transcribing'
            ? <ActivityIndicator color={colors.warning} size="small" />
            : <Text style={[styles.voiceBtnText, { color: voiceColors[voice.state] }]}>{voiceLabel[voice.state]}</Text>}
        </TouchableOpacity>
        {voice.error && <Text style={styles.voiceError}>{voice.error}</Text>}

        {/* ── 2. ACCIONES — cada una es opcional ── */}
        <Text style={styles.sectionTitle}>Herramientas</Text>

        <View style={styles.toolGrid}>
          {/* Estructurar SOAP */}
          <TouchableOpacity
            style={styles.toolCard}
            onPress={handleScribe}
            disabled={loadingScribe}
            activeOpacity={0.82}
          >
            {loadingScribe
              ? <ActivityIndicator color={colors.primary} />
              : <>
                  <Text style={styles.toolIcon}>📋</Text>
                  <Text style={styles.toolLabel}>Estructurar{'\n'}SOAP</Text>
                  <Text style={styles.toolHint}>Opcional</Text>
                </>}
          </TouchableOpacity>

          {/* Consultar IA */}
          <TouchableOpacity
            style={[styles.toolCard, styles.toolCardIA]}
            onPress={handleDiagnose}
            disabled={loadingDiagnose}
            activeOpacity={0.82}
          >
            {loadingDiagnose
              ? <ActivityIndicator color={colors.white} />
              : <>
                  <Text style={styles.toolIcon}>🧠</Text>
                  <Text style={[styles.toolLabel, { color: colors.white }]}>Consultar{'\n'}IA</Text>
                  <Text style={[styles.toolHint, { color: 'rgba(255,255,255,0.75)' }]}>Opcional</Text>
                </>}
          </TouchableOpacity>

          {/* Sugerir receta */}
          <TouchableOpacity
            style={styles.toolCard}
            onPress={handleRx}
            disabled={loadingRx}
            activeOpacity={0.82}
          >
            {loadingRx
              ? <ActivityIndicator color={colors.primary} />
              : <>
                  <Text style={styles.toolIcon}>💊</Text>
                  <Text style={styles.toolLabel}>Sugerir{'\n'}receta</Text>
                  <Text style={styles.toolHint}>Opcional</Text>
                </>}
          </TouchableOpacity>

          {/* Generar informe */}
          <TouchableOpacity
            style={styles.toolCard}
            onPress={handleReport}
            disabled={loadingReport}
            activeOpacity={0.82}
          >
            {loadingReport
              ? <ActivityIndicator color={colors.primary} />
              : <>
                  <Text style={styles.toolIcon}>📄</Text>
                  <Text style={styles.toolLabel}>Generar{'\n'}informe</Text>
                  <Text style={styles.toolHint}>Opcional</Text>
                </>}
          </TouchableOpacity>
        </View>

        {/* ── 3. RESULTADO SOAP (si el médico lo pidió) ── */}
        {showSoap && currentSoap && (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>Nota SOAP</Text>
              <TouchableOpacity onPress={() => setShowSoap(false)}>
                <Text style={styles.collapseBtn}>Ocultar ▲</Text>
              </TouchableOpacity>
            </View>
            <SoapBlock soap={currentSoap} />
            <TouchableOpacity style={styles.addNoteBtn} onPress={addSoapToList} activeOpacity={0.8}>
              <Text style={styles.addNoteBtnText}>+ Acumular nota y dictar otra</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Notas acumuladas */}
        {soaps.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
              Notas acumuladas ({soaps.length})
            </Text>
            {soaps.map((n, i) => (
              <SoapCard
                key={i} note={n} index={i}
                onRemove={() => setSoaps(s => s.filter((_, j) => j !== i))}
              />
            ))}
          </>
        )}

        {/* ── 4. RESULTADO IA (si el médico lo pidió) ── */}
        {showDx && dx && (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>Análisis clínico IA</Text>
              <TouchableOpacity onPress={() => setShowDx(false)}>
                <Text style={styles.collapseBtn}>Ocultar ▲</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>{dx.disclaimer}</Text>
            {dx.consideraciones.map((c, i) => (
              <View key={i} style={[styles.block, shadow.card]}>
                <Text style={styles.considTitle}>{i + 1}. {c.direccion}</Text>
                <Text style={styles.considRazon}>{c.razonamiento}</Text>
                <View style={styles.accionBox}>
                  <Text style={styles.accionTag}>ACCIÓN SUGERIDA</Text>
                  <Text style={styles.blockText}>{c.accion_sugerida}</Text>
                </View>
              </View>
            ))}
            {dx.preguntas_seguimiento.length > 0 && (
              <View style={[styles.block, shadow.card]}>
                <Text style={styles.blockTag}>SEGUIMIENTO</Text>
                {dx.preguntas_seguimiento.map((q, i) => (
                  <Text key={i} style={[styles.blockText, { marginTop: 4 }]}>· {q}</Text>
                ))}
              </View>
            )}
            {dx.derivacion && (
              <View style={[styles.block, shadow.card, { borderLeftWidth: 3, borderLeftColor: colors.warning }]}>
                <Text style={styles.blockTag}>DERIVACIÓN SUGERIDA</Text>
                <Text style={styles.blockText}>{dx.derivacion.especialidad} · {dx.derivacion.urgencia}</Text>
                <Text style={[styles.blockText, { marginTop: 4 }]}>{dx.derivacion.motivo}</Text>
              </View>
            )}
          </>
        )}

        {/* ── 5. RECETA (si el médico la pidió) ── */}
        {showRx && meds.length > 0 && (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>Receta sugerida</Text>
              <TouchableOpacity onPress={() => setShowRx(false)}>
                <Text style={styles.collapseBtn}>Ocultar ▲</Text>
              </TouchableOpacity>
            </View>
            {meds.map((m, i) => (
              <View key={i} style={[styles.block, shadow.card]}>
                <Text style={styles.medName}>{m.nombre}</Text>
                <Text style={styles.medDetail}>{m.presentacion} · {m.cantidad}</Text>
                <Text style={styles.blockText}>{m.indicaciones}</Text>
                <TouchableOpacity style={styles.vademecumLink}
                  onPress={() => navigation.navigate('Vademecum', { initialQuery: m.nombre })}>
                  <Text style={styles.vademecumLinkText}>📖 Ver en vadémecum →</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.saveBtn} disabled={savingDoc} activeOpacity={0.8}
              onPress={() => saveDoc('receta', { medicamentos: meds }, `Receta — ${patientName}`)}
            >
              {savingDoc ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>💾 Guardar receta</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── 6. INFORME (si el médico lo pidió) ── */}
        {showReport && report && (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>{report.titulo}</Text>
              <TouchableOpacity onPress={() => setShowReport(false)}>
                <Text style={styles.collapseBtn}>Ocultar ▲</Text>
              </TouchableOpacity>
            </View>
            {[
              ['RESUMEN', report.resumen],
              ['ANTECEDENTES', report.antecedentes],
              ['HALLAZGOS', report.hallazgos],
              ['PLAN', report.plan],
              ['RECOMENDACIONES', report.recomendaciones],
            ].filter(([, v]) => v).map(([label, value]) => (
              <View key={label} style={[styles.block, shadow.card]}>
                <Text style={styles.blockTag}>{label}</Text>
                <Text style={styles.blockText}>{value}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.saveBtn} disabled={savingDoc} activeOpacity={0.8}
              onPress={() => saveDoc('informe', report, `${report.titulo} — ${patientName}`)}
            >
              {savingDoc ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>💾 Guardar informe</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* Espacio al fondo */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal: documento guardado */}
      <Modal visible={!!savedDocId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>Documento guardado</Text>
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8}
              onPress={() => { setSavedDocId(null); navigation.navigate('Docs'); }}>
              <Text style={styles.saveBtnText}>Ver documentos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSavedDocId(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.inkSoft, textAlign: 'center' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  backText:       { fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 4 },
  headerTitle:    { fontSize: 20, fontWeight: '700', color: colors.ink },
  headerSub:      { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  body:           { padding: spacing.md },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 4, marginTop: spacing.md },
  sectionHint:    { fontSize: 12, color: colors.inkSoft, lineHeight: 18, marginBottom: spacing.md },
  noteInput:      { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 14, fontSize: 14, color: colors.ink, backgroundColor: colors.bgSoft, minHeight: 140, marginBottom: spacing.sm, textAlignVertical: 'top' },
  voiceBtn:       { borderWidth: 1.5, borderRadius: radius.md, padding: 13, alignItems: 'center', marginBottom: 4, backgroundColor: colors.white },
  voiceBtnText:   { fontSize: 14, fontWeight: '600' },
  voiceError:     { fontSize: 12, color: colors.danger, textAlign: 'center', marginBottom: spacing.sm },
  // Grid de herramientas
  toolGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm, marginBottom: spacing.md },
  toolCard:       { flex: 1, flexBasis: '45%', backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', minHeight: 90, justifyContent: 'center', ...({ shadowColor: '#1C2B36', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 } as any) },
  toolCardIA:     { backgroundColor: '#0C2438' },
  toolIcon:       { fontSize: 24, marginBottom: 4 },
  toolLabel:      { fontSize: 12, fontWeight: '700', color: colors.ink, textAlign: 'center', lineHeight: 17 },
  toolHint:       { fontSize: 10, color: colors.inkSoft, marginTop: 3 },
  // Resultados
  resultHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  collapseBtn:    { fontSize: 12, color: colors.primary, fontWeight: '500' },
  block:          { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  blockTag:       { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, marginBottom: 8 },
  blockText:      { fontSize: 13, color: colors.ink, lineHeight: 20 },
  evalRow:        { flexDirection: 'row', gap: 10, marginBottom: 6, alignItems: 'flex-start' },
  evalCode:       { fontFamily: 'Courier', fontSize: 12, color: colors.primary, fontWeight: '700', paddingTop: 1 },
  evalDesc:       { fontSize: 13, fontWeight: '600', color: colors.ink },
  evalName:       { fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  // SOAP card colapsable
  soapCard:       { backgroundColor: colors.cardBg, borderRadius: radius.md, marginBottom: 8, overflow: 'hidden' },
  soapCardHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  soapCardTitle:  { fontSize: 13, fontWeight: '600', color: colors.ink, flex: 1 },
  soapCardBody:   { padding: spacing.md, paddingTop: 0, borderTopWidth: 1, borderTopColor: colors.line },
  soapLine:       { fontSize: 12, color: colors.inkSoft, lineHeight: 19, marginBottom: 2 },
  soapCode:       { fontFamily: 'Courier', fontSize: 11, color: colors.primary, marginTop: 4 },
  addNoteBtn:     { borderWidth: 1.5, borderColor: colors.secondary, borderRadius: radius.md, padding: 12, alignItems: 'center', marginBottom: spacing.sm },
  addNoteBtnText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  // IA
  disclaimer:     { fontSize: 11, color: colors.inkSoft, fontStyle: 'italic', marginBottom: spacing.sm, lineHeight: 17 },
  considTitle:    { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  considRazon:    { fontSize: 12, color: colors.inkSoft, lineHeight: 18, marginBottom: 8 },
  accionBox:      { backgroundColor: colors.bgSoft, borderRadius: radius.sm, padding: 10 },
  accionTag:      { fontSize: 9, fontWeight: '700', color: colors.secondary, letterSpacing: 1, marginBottom: 4 },
  // Receta
  medName:        { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 3 },
  medDetail:      { fontFamily: 'Courier', fontSize: 12, color: colors.primary, marginBottom: 4 },
  vademecumLink:  { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
  vademecumLinkText: { fontSize: 12, fontWeight: '600', color: colors.secondary },
  // Guardar
  saveBtn:        { backgroundColor: colors.primary, borderRadius: radius.md, padding: 15, alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.sm },
  saveBtnText:    { color: colors.white, fontSize: 14, fontWeight: '600' },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(14,28,40,0.55)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalBox:       { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, width: '100%', alignItems: 'center' },
  modalIcon:      { fontSize: 40, marginBottom: spacing.md },
  modalTitle:     { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: spacing.lg },
});