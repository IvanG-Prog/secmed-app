import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import {
  scribe, diagnose, generateReport, suggestPrescription,
  createDocument, transcribeAudio,
  SoapNote, DiagnoseResponse, ReportContent, Medication,
} from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';

type RecordingState = 'idle' | 'recording' | 'transcribing';

// ── Hook de grabación con expo-audio (reemplaza expo-av deprecado) ────────────
function useVoice(onResult: (text: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) { setError('Permiso de micrófono denegado.'); return; }
      await recorder.record();
      setState('recording');
    } catch {
      setError('No se pudo iniciar la grabación.');
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    setState('transcribing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) { setState('idle'); return; }
      const { text } = await transcribeAudio(uri);
      onResult(text);
    } catch (e: any) {
      setError('Error al transcribir: ' + e.message);
    } finally {
      setState('idle');
    }
  }, [recorder, onResult]);

  const toggle = useCallback(() => {
    state === 'recording' ? stop() : start();
  }, [state, start, stop]);

  return { state, error, toggle };
}

type Step = 'nota' | 'soap' | 'consideraciones' | 'receta' | 'informe';

export default function ConsultationScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;

  const [step,      setStep]      = useState<Step>('nota');
  const [rawNote,   setRawNote]   = useState('');
  const [soap,      setSoap]      = useState<SoapNote | null>(null);
  const [soaps,     setSoaps]     = useState<SoapNote[]>([]);
  const [dx,        setDx]        = useState<DiagnoseResponse | null>(null);
  const [report,    setReport]    = useState<ReportContent | null>(null);
  const [meds,      setMeds]      = useState<Medication[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleTranscript = useCallback((text: string) => {
    setRawNote(prev => prev.trim() ? `${prev.trim()} ${text}` : text);
  }, []);
  const voice = useVoice(handleTranscript);

  // ── Emitir nota directa (sin SOAP ni IA) ─────────────────────────────────
  const handleEmitDirect = async () => {
    if (!rawNote.trim()) {
      Alert.alert('Nota vacía', 'Escribe o dicta la nota antes de emitir.');
      return;
    }
    setSavingDoc(true);
    try {
      await createDocument({
        patient_id: patientId,
        doc_type: 'informe',
        title: `Nota de consulta — ${patientName}`,
        content: { nota: rawNote },
      });
      setShowSaved(true);
    } catch (e: any) {
      Alert.alert('Error al guardar', e.message);
    } finally {
      setSavingDoc(false);
    }
  };

  // ── Estructurar SOAP ──────────────────────────────────────────────────────
  const handleScribe = async () => {
    if (!rawNote.trim()) { Alert.alert('Nota vacía', 'Escribe o dicta la nota primero.'); return; }
    setLoading(true);
    try {
      const res = await scribe(patientId, rawNote);
      setSoap(res.soap);
      setStep('soap');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Consultar IA ──────────────────────────────────────────────────────────
  const handleDiagnose = async () => {
    const all = soap ? [...soaps, soap] : soaps;
    if (!all.length) {
      Alert.alert('Sin notas SOAP', 'Estructura al menos una nota antes de consultar la IA.');
      return;
    }
    setSoaps(all);
    setLoading(true);
    try {
      const res = await diagnose(patientId, all);
      setDx(res);
      setStep('consideraciones');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Receta ────────────────────────────────────────────────────────────────
  const handleSuggestRx = async () => {
    const plan = soap?.plan ?? '';
    if (!plan.trim()) { Alert.alert('Sin plan', 'No hay plan terapéutico en la nota.'); return; }
    setLoading(true);
    try {
      const res = await suggestPrescription(plan);
      setMeds(res.medicamentos);
      setStep('receta');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Informe ───────────────────────────────────────────────────────────────
  const handleReport = async () => {
    const all = soap ? [...soaps, soap] : soaps;
    setLoading(true);
    try {
      const res = await generateReport(patientId, all);
      setReport(res);
      setStep('informe');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Guardar documento ─────────────────────────────────────────────────────
  const saveDocument = async (type: 'receta' | 'informe', content: any, title: string) => {
    setSavingDoc(true);
    try {
      await createDocument({ patient_id: patientId, doc_type: type, title, content });
      setShowSaved(true);
    } catch (e: any) { Alert.alert('Error al guardar', e.message); }
    finally { setSavingDoc(false); }
  };

  // ── Estilos dinámicos del botón de voz ───────────────────────────────────
  const voiceActive   = voice.state === 'recording';
  const voiceLoading  = voice.state === 'transcribing';
  const voiceBtnStyle = [
    styles.voiceBtn,
    voiceActive && styles.voiceBtnActive,
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consulta</Text>
        <Text style={styles.headerSub}>{patientName}</Text>
      </View>

      {/* Barra de progreso */}
      <View style={styles.progressBar}>
        {(['nota','soap','consideraciones','receta'] as Step[]).map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              soaps.length > 0 && s === 'nota' && styles.progressDotDone,
            ]} />
            {i < 3 && <View style={[
              styles.progressLine,
              soaps.length > 0 && i === 0 && styles.progressLineDone,
            ]} />}
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── PASO 1: Nota libre ── */}
        {step === 'nota' && (
          <>
            <Text style={styles.stepTitle}>Nota de consulta</Text>
            <Text style={styles.stepHint}>
              Escribe o dicta en lenguaje libre. Puedes estructurar en SOAP, consultar la IA, o emitir la nota directamente.
            </Text>

            <TextInput
              style={styles.noteInput}
              value={rawNote}
              onChangeText={setRawNote}
              placeholder="Paciente femenina 45 años, cefalea tensional bilateral de 3 días, TA 130/85…"
              placeholderTextColor={colors.inkSoft}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            {/* Botón de voz */}
            <TouchableOpacity
              style={voiceBtnStyle}
              onPress={voice.toggle}
              disabled={voiceLoading}
              activeOpacity={0.8}
            >
              {voiceLoading
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={[styles.voiceBtnText, voiceActive && styles.voiceBtnTextActive]}>
                    {voiceActive ? 'Detener dictado' : 'Dictar nota por voz'}
                  </Text>}
            </TouchableOpacity>
            {voice.error && <Text style={styles.voiceError}>{voice.error}</Text>}

            {/* Herramientas — opcionales */}
            <Text style={styles.toolsLabel}>Herramientas opcionales</Text>
            <View style={styles.toolRow}>
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleScribe}
                disabled={loading}
                activeOpacity={0.82}
              >
                {loading
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <>
                      <Text style={styles.toolBtnTitle}>Estructurar SOAP</Text>
                      <Text style={styles.toolBtnHint}>Convierte la nota a formato clínico con CIE-10</Text>
                    </>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolBtn, styles.toolBtnDark]}
                onPress={() => {
                  if (!soap && !soaps.length) {
                    Alert.alert('Primero estructura la nota', 'Usa "Estructurar SOAP" antes de consultar la IA.');
                    return;
                  }
                  handleDiagnose();
                }}
                disabled={loading}
                activeOpacity={0.82}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <>
                      <Text style={[styles.toolBtnTitle, { color: colors.white }]}>Consultar IA</Text>
                      <Text style={[styles.toolBtnHint, { color: 'rgba(255,255,255,0.65)' }]}>Consideraciones y diagnóstico diferencial</Text>
                    </>}
              </TouchableOpacity>
            </View>

            {/* Emitir nota directa */}
            <TouchableOpacity
              style={styles.emitBtn}
              onPress={handleEmitDirect}
              disabled={savingDoc}
              activeOpacity={0.85}
            >
              {savingDoc
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.emitBtnText}>Emitir nota de consulta</Text>}
            </TouchableOpacity>
            <Text style={styles.emitHint}>
              Guarda la nota tal como está, sin estructurar ni analizar.
            </Text>
          </>
        )}

        {/* ── PASO 2: SOAP ── */}
        {step === 'soap' && soap && (
          <>
            <Text style={styles.stepTitle}>Nota SOAP estructurada</Text>

            {[
              ['MOTIVO', soap.motivo],
              ['S — SUBJETIVO', soap.subjetivo],
              ['O — OBJETIVO', soap.objetivo],
              ['P — PLAN', soap.plan],
            ].filter(([, v]) => v).map(([label, value]) => (
              <View key={label} style={[styles.card, shadow.card]}>
                <Text style={styles.cardTag}>{label}</Text>
                <Text style={styles.cardText}>{value}</Text>
              </View>
            ))}

            {soap.evaluacion?.length > 0 && (
              <View style={[styles.card, shadow.card]}>
                <Text style={styles.cardTag}>A — EVALUACIÓN / CIE-10</Text>
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

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.secBtn, { flex: 1 }]} onPress={handleSuggestRx} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secBtnText}>Generar receta</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secBtn, { flex: 1 }]} onPress={handleReport} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secBtnText}>Generar informe</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.vademecumBtn}
              onPress={() => navigation.navigate('Vademecum', { initialQuery: soap.plan?.split(/[ ,]/)[0] ?? '' })}
              activeOpacity={0.8}
            >
              <Text style={styles.vademecumBtnText}>Consultar vadémecum</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleDiagnose} disabled={loading} activeOpacity={0.8}>
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.primaryBtnText}>Consultar IA (opcional)</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.ghostBtn} onPress={() => { setSoap(null); setStep('nota'); }} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>Editar nota</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── PASO 3: Consideraciones IA ── */}
        {step === 'consideraciones' && dx && (
          <>
            <Text style={styles.stepTitle}>Análisis clínico</Text>
            <Text style={styles.disclaimerText}>{dx.disclaimer}</Text>

            {dx.consideraciones.map((c, i) => (
              <View key={i} style={[styles.card, shadow.card]}>
                <Text style={styles.considTitle}>{i + 1}. {c.direccion}</Text>
                <Text style={styles.considRazon}>{c.razonamiento}</Text>
                <View style={styles.accionWrap}>
                  <Text style={styles.accionLabel}>ACCIÓN SUGERIDA</Text>
                  <Text style={styles.cardText}>{c.accion_sugerida}</Text>
                </View>
              </View>
            ))}

            {dx.preguntas_seguimiento.length > 0 && (
              <View style={[styles.card, shadow.card]}>
                <Text style={styles.cardTag}>PREGUNTAS DE SEGUIMIENTO</Text>
                {dx.preguntas_seguimiento.map((q, i) => (
                  <Text key={i} style={[styles.cardText, { marginTop: 4 }]}>· {q}</Text>
                ))}
              </View>
            )}

            {dx.derivacion && (
              <View style={[styles.card, shadow.card, { borderLeftWidth: 3, borderLeftColor: colors.warning }]}>
                <Text style={styles.cardTag}>DERIVACIÓN SUGERIDA</Text>
                <Text style={styles.cardText}>{dx.derivacion.especialidad} · {dx.derivacion.urgencia}</Text>
                <Text style={[styles.cardText, { marginTop: 4 }]}>{dx.derivacion.motivo}</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.secBtn, { flex: 1 }]} onPress={handleSuggestRx} disabled={loading} activeOpacity={0.8}>
                <Text style={styles.secBtnText}>Generar receta</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secBtn, { flex: 1 }]} onPress={handleReport} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secBtnText}>Generar informe</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('soap')} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>Volver a nota SOAP</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Receta ── */}
        {step === 'receta' && (
          <>
            <Text style={styles.stepTitle}>Receta sugerida</Text>
            {meds.length === 0
              ? <Text style={styles.stepHint}>No se detectaron medicamentos en el plan.</Text>
              : meds.map((m, i) => (
                <View key={i} style={[styles.card, shadow.card]}>
                  <Text style={styles.medName}>{m.nombre}</Text>
                  <Text style={styles.medDetail}>{m.presentacion} · {m.cantidad}</Text>
                  <Text style={styles.cardText}>{m.indicaciones}</Text>
                  <TouchableOpacity
                    style={styles.inlineLink}
                    onPress={() => navigation.navigate('Vademecum', { initialQuery: m.nombre })}
                  >
                    <Text style={styles.inlineLinkText}>Ver en vadémecum</Text>
                  </TouchableOpacity>
                </View>
              ))}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => saveDocument('receta', { medicamentos: meds }, `Receta — ${patientName}`)}
              disabled={savingDoc}
              activeOpacity={0.8}
            >
              {savingDoc ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>Guardar receta</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('soap')} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>Volver</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Informe ── */}
        {step === 'informe' && report && (
          <>
            <Text style={styles.stepTitle}>{report.titulo}</Text>
            {[
              ['RESUMEN', report.resumen],
              ['ANTECEDENTES', report.antecedentes],
              ['HALLAZGOS', report.hallazgos],
              ['PLAN', report.plan],
              ['RECOMENDACIONES', report.recomendaciones],
            ].filter(([, v]) => v).map(([label, value]) => (
              <View key={label} style={[styles.card, shadow.card]}>
                <Text style={styles.cardTag}>{label}</Text>
                <Text style={styles.cardText}>{value}</Text>
              </View>
            ))}
            {report.evaluacion?.map((e, i) => (
              <View key={i} style={styles.evalRow}>
                <Text style={styles.evalCode}>{e.codigo_cie10}</Text>
                <Text style={styles.evalDesc}>{e.descripcion}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => saveDocument('informe', report, `${report.titulo} — ${patientName}`)}
              disabled={savingDoc}
              activeOpacity={0.8}
            >
              {savingDoc ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>Guardar informe</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('soap')} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>Volver</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal confirmación */}
      <Modal visible={showSaved} transparent animationType="fade">
        <View style={styles.savedOverlay}>
          <View style={styles.savedBox}>
            <Text style={styles.savedTitle}>Documento guardado</Text>
            <Text style={styles.savedSub}>Puedes verlo en la pestaña Documentos.</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { setShowSaved(false); navigation.navigate('Docs'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Ver documentos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSaved(false)} style={{ marginTop: 12 }}>
              <Text style={styles.ghostBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  backText:         { fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 6 },
  headerTitle:      { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  headerSub:        { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  progressBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  progressItem:     { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  progressDotActive:{ backgroundColor: colors.primary, width: 10, height: 10, borderRadius: 5 },
  progressDotDone:  { backgroundColor: colors.secondary },
  progressLine:     { flex: 1, height: 1.5, backgroundColor: colors.line },
  progressLineDone: { backgroundColor: colors.secondary },
  body:             { padding: spacing.md },
  stepTitle:        { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 6, letterSpacing: -0.2 },
  stepHint:         { fontSize: 13, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing.md },
  noteInput:        { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 14, fontSize: 14, color: colors.ink, backgroundColor: colors.bgSoft, minHeight: 160, marginBottom: spacing.sm, textAlignVertical: 'top' },
  // Voz
  voiceBtn:         { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 14, alignItems: 'center', marginBottom: 4, backgroundColor: colors.white },
  voiceBtnActive:   { borderColor: colors.danger, backgroundColor: '#FFF5F5' },
  voiceBtnText:     { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  voiceBtnTextActive:{ color: colors.danger },
  voiceError:       { fontSize: 12, color: colors.danger, textAlign: 'center', marginBottom: spacing.sm },
  // Herramientas opcionales
  toolsLabel:       { fontSize: 12, fontWeight: '600', color: colors.inkSoft, letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  toolRow:          { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  toolBtn:          { flex: 1, backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, justifyContent: 'center', minHeight: 80, elevation: 2, shadowColor: '#1C2B36', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  toolBtnDark:      { backgroundColor: '#0C2438' },
  toolBtnTitle:     { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  toolBtnHint:      { fontSize: 11, color: colors.inkSoft, lineHeight: 16 },
  // Emitir directo
  emitBtn:          { backgroundColor: colors.secondary, borderRadius: radius.md, padding: 15, alignItems: 'center', marginTop: spacing.sm },
  emitBtnText:      { color: colors.white, fontSize: 15, fontWeight: '600' },
  emitHint:         { fontSize: 11, color: colors.inkSoft, textAlign: 'center', marginTop: 6, marginBottom: spacing.md },
  // Acciones SOAP
  actionRow:        { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  primaryBtn:       { backgroundColor: colors.primary, borderRadius: radius.md, padding: 15, alignItems: 'center', marginBottom: spacing.sm },
  primaryBtnText:   { color: colors.white, fontSize: 15, fontWeight: '600' },
  secBtn:           { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  secBtnText:       { color: colors.primary, fontSize: 13, fontWeight: '600' },
  ghostBtn:         { alignItems: 'center', padding: 12 },
  ghostBtnText:     { color: colors.inkSoft, fontSize: 14 },
  vademecumBtn:     { borderWidth: 1.5, borderColor: colors.secondary, borderRadius: radius.md, padding: 12, alignItems: 'center', marginBottom: spacing.sm },
  vademecumBtnText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  // Tarjetas
  card:             { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  cardTag:          { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.5, marginBottom: 8 },
  cardText:         { fontSize: 14, color: colors.ink, lineHeight: 21 },
  evalRow:          { marginBottom: 10 },
  evalCode:         { fontFamily: 'Courier', fontSize: 12, color: colors.primary, fontWeight: '700', marginBottom: 2 },
  evalDesc:         { fontSize: 13, fontWeight: '600', color: colors.ink },
  evalName:         { fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  // IA
  disclaimerText:   { fontSize: 11, color: colors.inkSoft, fontStyle: 'italic', marginBottom: spacing.md, lineHeight: 17 },
  considTitle:      { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 5 },
  considRazon:      { fontSize: 13, color: colors.inkSoft, lineHeight: 19, marginBottom: 10 },
  accionWrap:       { backgroundColor: colors.bgSoft, borderRadius: radius.sm, padding: 10 },
  accionLabel:      { fontSize: 9, fontWeight: '700', color: colors.secondary, letterSpacing: 1.2, marginBottom: 4 },
  // Receta
  medName:          { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 3 },
  medDetail:        { fontFamily: 'Courier', fontSize: 12, color: colors.primary, marginBottom: 6 },
  inlineLink:       { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  inlineLinkText:   { fontSize: 12, fontWeight: '600', color: colors.secondary },
  // Modal
  savedOverlay:     { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  savedBox:         { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, width: '100%' },
  savedTitle:       { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  savedSub:         { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.lg },
});