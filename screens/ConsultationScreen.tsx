import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import {
  scribe, diagnose, generateReport, suggestPrescription,
  createDocument, SoapNote, DiagnoseResponse, ReportContent, Medication,
} from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';

type Step = 'nota' | 'soap' | 'consideraciones' | 'receta' | 'informe';

export default function ConsultationScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;

  const [step,          setStep]           = useState<Step>('nota');
  const [rawNote,       setRawNote]        = useState('');
  const [soap,          setSoap]           = useState<SoapNote | null>(null);
  const [soaps,         setSoaps]          = useState<SoapNote[]>([]);
  const [dx,            setDx]             = useState<DiagnoseResponse | null>(null);
  const [report,        setReport]         = useState<ReportContent | null>(null);
  const [meds,          setMeds]           = useState<Medication[]>([]);
  const [loading,       setLoading]        = useState(false);
  const [savingDoc,     setSavingDoc]      = useState(false);
  const [showSaved,     setShowSaved]      = useState(false);

  // ── Paso 1: nota libre → SOAP ──────────────────────────────────────────────
  const handleScribe = async () => {
    if (!rawNote.trim()) { Alert.alert('Nota vacía', 'Escribe la nota clínica antes de estructurar.'); return; }
    setLoading(true);
    try {
      const res = await scribe(patientId, rawNote);
      setSoap(res.soap);
      setStep('soap');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Paso 2: acumular nota y pedir consideraciones ──────────────────────────
  const handleDiagnose = async () => {
    const all = soap ? [...soaps, soap] : soaps;
    setSoaps(all);
    setLoading(true);
    try {
      const res = await diagnose(patientId, all);
      setDx(res);
      setStep('consideraciones');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Paso 3a: sugerir receta desde el plan ─────────────────────────────────
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

  // ── Paso 3b: generar informe ───────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consulta — {patientName}</Text>
        <Text style={styles.headerSub}>Asistente clínico IA</Text>
      </View>

      {/* Pasos visuales */}
      <View style={styles.stepsRow}>
        {(['nota','soap','consideraciones','receta'] as Step[]).map((s, i) => (
          <View key={s} style={styles.stepDot}>
            <View style={[styles.dot, step === s && styles.dotActive, (soaps.length > 0 && s === 'nota') && styles.dotDone]} />
            {i < 3 && <View style={styles.stepLine} />}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Paso 1: Nota libre ── */}
        {step === 'nota' && (
          <>
            <Text style={styles.stepTitle}>📝 Nota de consulta</Text>
            <Text style={styles.stepHint}>Escribe la nota en lenguaje libre. La IA la estructurará en formato SOAP con códigos CIE-10.</Text>
            <TextInput
              style={styles.noteInput}
              value={rawNote} onChangeText={setRawNote}
              placeholder="Ej: Paciente femenina 45 años, cefalea tensional bilateral de 3 días, TA 130/85, se indica ibuprofeno 400mg c/8h…"
              placeholderTextColor={colors.inkSoft}
              multiline numberOfLines={10}
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleScribe} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>Estructurar nota con IA →</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── Paso 2: SOAP ── */}
        {step === 'soap' && soap && (
          <>
            <Text style={styles.stepTitle}>📋 Nota SOAP estructurada</Text>

            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>MOTIVO</Text>
              <Text style={styles.soapText}>{soap.motivo}</Text>
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>S — SUBJETIVO</Text>
              <Text style={styles.soapText}>{soap.subjetivo}</Text>
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>O — OBJETIVO</Text>
              <Text style={styles.soapText}>{soap.objetivo}</Text>
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>A — EVALUACIÓN</Text>
              {soap.evaluacion.map((e, i) => (
                <View key={i} style={styles.evalRow}>
                  <Text style={styles.evalDesc}>{e.descripcion}</Text>
                  <Text style={styles.evalCode}>{e.codigo_cie10}</Text>
                  <Text style={styles.evalName}>{e.nombre_cie10}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>P — PLAN</Text>
              <Text style={styles.soapText}>{soap.plan}</Text>
            </View>

            {/* Acciones */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.secBtn, { flex: 1 }]} onPress={handleSuggestRx} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secBtnText}>💊 Receta</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secBtn, { flex: 1 }]} onPress={handleReport} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secBtnText}>📋 Informe</Text>}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.vademecumBtn}
              onPress={() => navigation.navigate('Vademecum', { initialQuery: soap.plan?.split(/[ ,]/)[0] ?? '' })}
              activeOpacity={0.8}
            >
              <Text style={styles.vademecumBtnText}>📖 Consultar vadémecum</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleDiagnose} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>🧠 Consideraciones clínicas →</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => { setSoap(null); setStep('nota'); }} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>← Editar nota</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Paso 3: Consideraciones ── */}
        {step === 'consideraciones' && dx && (
          <>
            <Text style={styles.stepTitle}>🧠 Consideraciones clínicas</Text>
            <Text style={styles.disclaimerText}>{dx.disclaimer}</Text>

            {dx.consideraciones.map((c, i) => (
              <View key={i} style={[styles.card, shadow.card]}>
                <Text style={styles.considTitle}>{i + 1}. {c.direccion}</Text>
                <Text style={styles.considRazon}>{c.razonamiento}</Text>
                <View style={styles.accionWrap}>
                  <Text style={styles.accionLabel}>Acción sugerida</Text>
                  <Text style={styles.accionText}>{c.accion_sugerida}</Text>
                </View>
              </View>
            ))}

            {dx.preguntas_seguimiento.length > 0 && (
              <View style={[styles.card, shadow.card]}>
                <Text style={styles.soapLabel}>PREGUNTAS DE SEGUIMIENTO</Text>
                {dx.preguntas_seguimiento.map((q, i) => (
                  <Text key={i} style={styles.pregunta}>• {q}</Text>
                ))}
              </View>
            )}

            {dx.derivacion && (
              <View style={[styles.card, shadow.card, { borderLeftWidth: 3, borderLeftColor: colors.warning }]}>
                <Text style={styles.soapLabel}>DERIVACIÓN SUGERIDA</Text>
                <Text style={styles.soapText}>Especialidad: {dx.derivacion.especialidad}</Text>
                <Text style={styles.soapText}>Motivo: {dx.derivacion.motivo}</Text>
                <Text style={[styles.soapText, { color: dx.derivacion.urgencia === 'Urgente' ? colors.danger : colors.ink }]}>
                  Urgencia: {dx.derivacion.urgencia}
                </Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.secBtn, { flex: 1 }]} onPress={handleSuggestRx} disabled={loading} activeOpacity={0.8}>
                <Text style={styles.secBtnText}>💊 Receta</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secBtn, { flex: 1 }]} onPress={handleReport} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secBtnText}>📋 Informe</Text>}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('soap')} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>← Nota SOAP</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Receta ── */}
        {step === 'receta' && (
          <>
            <Text style={styles.stepTitle}>💊 Receta sugerida</Text>
            {meds.length === 0
              ? <Text style={styles.stepHint}>No se detectaron medicamentos en el plan. Agrega uno manualmente.</Text>
              : meds.map((m, i) => (
                <View key={i} style={[styles.card, shadow.card]}>
                  <Text style={styles.medName}>{m.nombre}</Text>
                  <Text style={styles.medDetail}>{m.presentacion} · {m.cantidad}</Text>
                  <Text style={styles.medIndic}>{m.indicaciones}</Text>
                  <TouchableOpacity
                    style={styles.medVademecumLink}
                    onPress={() => navigation.navigate('Vademecum', { initialQuery: m.nombre })}
                  >
                    <Text style={styles.medVademecumLinkText}>📖 Ver en vadémecum</Text>
                  </TouchableOpacity>
                </View>
              ))
            }
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => saveDocument('receta', { medicamentos: meds }, `Receta — ${patientName}`)}
              disabled={savingDoc} activeOpacity={0.8}
            >
              {savingDoc ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>💾 Guardar receta</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('soap')} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>← Nota SOAP</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Informe ── */}
        {step === 'informe' && report && (
          <>
            <Text style={styles.stepTitle}>📋 {report.titulo}</Text>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>RESUMEN</Text>
              <Text style={styles.soapText}>{report.resumen}</Text>
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>ANTECEDENTES</Text>
              <Text style={styles.soapText}>{report.antecedentes}</Text>
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>HALLAZGOS</Text>
              <Text style={styles.soapText}>{report.hallazgos}</Text>
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>EVALUACIÓN</Text>
              {report.evaluacion.map((e, i) => (
                <View key={i} style={styles.evalRow}>
                  <Text style={styles.evalDesc}>{e.descripcion}</Text>
                  <Text style={styles.evalCode}>{e.codigo_cie10}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>PLAN</Text>
              <Text style={styles.soapText}>{report.plan}</Text>
            </View>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.soapLabel}>RECOMENDACIONES AL PACIENTE</Text>
              <Text style={styles.soapText}>{report.recomendaciones}</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => saveDocument('informe', report, `${report.titulo} — ${patientName}`)}
              disabled={savingDoc} activeOpacity={0.8}
            >
              {savingDoc ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>💾 Guardar informe</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('soap')} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>← Nota SOAP</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Confirmación guardado */}
      <Modal visible={showSaved} transparent animationType="fade">
        <View style={styles.savedOverlay}>
          <View style={styles.savedBox}>
            <Text style={styles.savedIcon}>✅</Text>
            <Text style={styles.savedTitle}>Documento guardado</Text>
            <Text style={styles.savedSub}>Puedes verlo en la pestaña Documentos.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setShowSaved(false); navigation.navigate('Docs'); }} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Ver documentos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSaved(false)} style={{ marginTop: 12 }}>
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
  backText:       { fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 6 },
  headerTitle:    { fontSize: 18, fontWeight: '700', color: colors.ink },
  headerSub:      { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  stepsRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  stepDot:        { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot:            { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.line },
  dotActive:      { backgroundColor: colors.primary, width: 12, height: 12, borderRadius: 6 },
  dotDone:        { backgroundColor: colors.secondary },
  stepLine:       { flex: 1, height: 2, backgroundColor: colors.line },
  body:           { padding: spacing.md, paddingBottom: 80 },
  stepTitle:      { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  stepHint:       { fontSize: 13, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing.md },
  noteInput:      { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 14, fontSize: 14, color: colors.ink, backgroundColor: colors.bgSoft, minHeight: 180, marginBottom: spacing.md },
  primaryBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginBottom: spacing.sm },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  secBtn:         { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: 13, alignItems: 'center' },
  secBtnText:     { color: colors.primary, fontSize: 14, fontWeight: '600' },
  ghostBtn:       { alignItems: 'center', padding: 12 },
  ghostBtnText:   { color: colors.inkSoft, fontSize: 14, fontWeight: '500' },
  vademecumBtn:      { borderWidth: 1.5, borderColor: colors.secondary, borderRadius: radius.md, padding: 13, alignItems: 'center', marginBottom: spacing.sm },
  vademecumBtnText:  { color: colors.secondary, fontSize: 14, fontWeight: '600' },
  medVademecumLink:     { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  medVademecumLinkText: { fontSize: 12, fontWeight: '600', color: colors.secondary },
  actionRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  card:           { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  soapLabel:      { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.5, marginBottom: 8 },
  soapText:       { fontSize: 14, color: colors.ink, lineHeight: 21 },
  evalRow:        { marginBottom: 10 },
  evalDesc:       { fontSize: 14, fontWeight: '600', color: colors.ink },
  evalCode:       { fontFamily: 'Courier', fontSize: 12, color: colors.primary, marginTop: 2 },
  evalName:       { fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  considTitle:    { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  considRazon:    { fontSize: 13, color: colors.inkSoft, lineHeight: 19, marginBottom: 10 },
  accionWrap:     { backgroundColor: colors.bgSoft, borderRadius: radius.sm, padding: 10 },
  accionLabel:    { fontSize: 10, fontWeight: '700', color: colors.secondary, letterSpacing: 1, marginBottom: 4 },
  accionText:     { fontSize: 13, color: colors.ink },
  pregunta:       { fontSize: 13, color: colors.ink, lineHeight: 22 },
  disclaimerText: { fontSize: 11, color: colors.inkSoft, fontStyle: 'italic', marginBottom: spacing.md, lineHeight: 17 },
  medName:        { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  medDetail:      { fontFamily: 'Courier', fontSize: 12, color: colors.primary, marginBottom: 4 },
  medIndic:       { fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
  savedOverlay:   { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  savedBox:       { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, width: '100%', alignItems: 'center' },
  savedIcon:      { fontSize: 40, marginBottom: spacing.md },
  savedTitle:     { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  savedSub:       { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.lg, textAlign: 'center' },
  overlay:        'rgba(14,28,40,0.55)',
});