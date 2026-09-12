import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPatient, getPatientRisk, deletePatient, Patient, PatientRisk } from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { RISK_COLORS } from '../utils/constants';
import { HomeLogo } from '../components/HomeLogo';

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function Row({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && { fontFamily: 'Courier', fontSize: 12 }]}>
        {String(value)}
      </Text>
    </View>
  );
}

function RiskBadge({ category }: { category: string }) {
  const col = RISK_COLORS[category] ?? { bg: colors.line, text: colors.inkSoft };
  return (
    <View style={[styles.badge, { backgroundColor: col.bg }]}>
      <Text style={[styles.badgeText, { color: col.text }]}>{category}</Text>
    </View>
  );
}

function RiskGauge({ label, score, maxScore, category, color }: {
  label: string; score: number; maxScore: number; category: string; color: string;
}) {
  const pct = Math.min(score / maxScore, 1) * 100;
  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <RiskBadge category={category} />
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${Math.round(pct)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.gaugeScore}>{score} / {maxScore} pts</Text>
    </View>
  );
}

type Tab = 'info' | 'lab' | 'riesgo' | 'zk';

export default function PatientDetailScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;
  const [patient,  setPatient]  = useState<Patient | null>(null);
  const [risk,     setRisk]     = useState<PatientRisk | null>(null);
  const [tab,      setTab]      = useState<Tab>('info');
  const [loading,  setLoading]  = useState(true);
  const [showFactors, setShowFactors] = useState<{ cv: boolean; dm: boolean }>({ cv: false, dm: false });

  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([getPatient(patientId), getPatientRisk(patientId)]);
        setPatient(p); setRisk(r);
      } catch (e: any) { Alert.alert('Error', e.message); }
      finally { setLoading(false); }
    })();
  }, [patientId]);

  if (loading || !patient) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  const handleDelete = () => {
    Alert.alert('Eliminar paciente', `¿Seguro que deseas eliminar a ${patient.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deletePatient(patientId); navigation.goBack(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info',   label: 'Expediente' },
    { key: 'lab',    label: 'Laboratorio' },
    { key: 'riesgo', label: 'Riesgo' },
    { key: 'zk',     label: 'ZK' },
  ];

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Volver</Text>
          </TouchableOpacity>
          <HomeLogo size={22} />
        </View>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerName}>{patient.name}</Text>
            <Text style={styles.headerId}>{patient.id}</Text>
          </View>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Accesos rápidos */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn}
            onPress={() => navigation.navigate('Consultation', { patientId, patientName })}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLabel}>Consulta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn}
            onPress={() => navigation.navigate('Docs', { patientId, patientName })}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLabel}>Documentos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn}
            onPress={() => navigation.navigate('Agenda')}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLabel}>Agenda</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Info ── */}
        {tab === 'info' && (
          <View style={[styles.card, shadow.card]}>
            <Row label="Tipo de sangre"       value={patient.blood_type} />
            <Row label="Edad"                  value={`${patient.age} años`} />
            <Row label="Sexo"                  value={patient.sex === 'M' ? 'Masculino' : 'Femenino'} />
            <Row label="Donante de órganos"   value={patient.organ_donor ? 'Sí' : 'No'} />
            <Row label="Vacunación completa"  value={patient.vaccination_complete ? 'Sí' : 'No'} />
            <Row label="Última visita"         value={`Hace ${patient.last_visit_days} días`} />
            <Row label="Fumador"               value={patient.smoker ? 'Sí' : 'No'} />
            <Row label="Actividad física"     value={patient.physically_active ? 'Sí' : 'No'} />
            <Row label="Fruta/verdura diaria" value={patient.daily_fruit_veg ? 'Sí' : 'No'} />
            <Row label="Medicación para TA"   value={patient.bp_medication ? 'Sí' : 'No'} />
            <Row label="Glucosa elevada previa" value={patient.history_high_glucose ? 'Sí' : 'No'} />
            <Row label="Antecedente DM familiar"
              value={{ none: 'Ninguno', distant: 'Pariente lejano', close: 'Pariente directo' }[patient.family_history_diabetes] ?? '-'} />
            <Row label="DM diagnosticada"     value={patient.diabetes_diagnosed ? 'Sí' : 'No'} />
          </View>
        )}

        {/* ── Laboratorio ── */}
        {tab === 'lab' && (
          <View style={[styles.card, shadow.card]}>
            <Row label="IMC"                    value={`${patient.bmi.toFixed(1)} kg/m²`} />
            <Row label="Perímetro abdominal"   value={`${patient.waist_cm} cm`} />
            <Row label="PA sistólica"           value={`${patient.systolic_bp} mmHg`} />
            <Row label="Colesterol total"       value={`${patient.total_cholesterol} mg/dL`} />
            <Row label="HDL"                    value={`${patient.hdl_cholesterol} mg/dL`} />
          </View>
        )}

        {/* ── Riesgo ── */}
        {tab === 'riesgo' && risk && (
          <>
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.subTitle}>Riesgo cardiovascular</Text>
              <RiskGauge
                label="Cardiovascular"
                score={risk.cardiovascular.score}
                maxScore={risk.cardiovascular.max_score}
                category={risk.cardiovascular.category}
                color={risk.cardiovascular.color}
              />
              <TouchableOpacity onPress={() => setShowFactors(s => ({ ...s, cv: !s.cv }))} style={styles.factorToggle}>
                <Text style={styles.factorToggleText}>{showFactors.cv ? '▲ Ocultar factores' : '▼ Ver factores'}</Text>
              </TouchableOpacity>
              {showFactors.cv && risk.cardiovascular.factors.map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text style={styles.factorVal}>{String(f.value)}</Text>
                  <Text style={[styles.factorPts, { color: f.points > 0 ? colors.danger : colors.secondary }]}>
                    {f.points > 0 ? `+${f.points}` : f.points}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, shadow.card]}>
              <Text style={styles.subTitle}>Riesgo de diabetes tipo 2</Text>
              <Text style={styles.refNote}>FINDRISC · Lindström & Tuomilehto, 2003</Text>
              <RiskGauge
                label="Diabetes tipo 2"
                score={risk.diabetes.score}
                maxScore={risk.diabetes.max_score}
                category={risk.diabetes.category}
                color={risk.diabetes.color}
              />
              <TouchableOpacity onPress={() => setShowFactors(s => ({ ...s, dm: !s.dm }))} style={styles.factorToggle}>
                <Text style={styles.factorToggleText}>{showFactors.dm ? '▲ Ocultar factores' : '▼ Ver factores'}</Text>
              </TouchableOpacity>
              {showFactors.dm && risk.diabetes.factors.map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text style={styles.factorVal}>{String(f.value)}</Text>
                  <Text style={[styles.factorPts, { color: f.points > 0 ? colors.danger : colors.secondary }]}>
                    {f.points > 0 ? `+${f.points}` : f.points}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── ZK ── */}
        {tab === 'zk' && (
          <>
            <TouchableOpacity
              style={[styles.card, styles.zkCard, shadow.card]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('Portal', { patientId, premode: 'blood_type' })}
            >
              <Ionicons name="water-outline" size={22} color={colors.secondary} style={styles.zkIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.zkTitle}>Certificado de tipo de sangre</Text>
                <Text style={styles.zkDesc}>Prueba ZK sin revelar el expediente, va al Portal</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, styles.zkCard, shadow.card]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('Portal', { patientId, premode: 'last_visit' })}
            >
              <Ionicons name="calendar-outline" size={22} color={colors.secondary} style={styles.zkIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.zkTitle}>Certificado de visita reciente</Text>
                <Text style={styles.zkDesc}>Prueba de última consulta sin revelar fecha exacta</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={[styles.card, { backgroundColor: colors.bgSoft }]}>
              <Text style={styles.commitLabel}>Compromiso del expediente (Merkle/Poseidon)</Text>
              <Text style={styles.commitHash} selectable>{patient.record_commitment}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  backBtn:          {},
  backRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backText:         { fontSize: 14, fontWeight: '500', color: colors.primary },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  headerName:       { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  headerId:         { fontFamily: 'Courier', fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  quickRow:         { flexDirection: 'row', gap: 8 },
  quickBtn:         { flex: 1, alignItems: 'center', backgroundColor: colors.bgSoft, borderRadius: radius.md, paddingVertical: 10 },
  quickIcon:        { fontSize: 20, marginBottom: 3 },
  quickLabel:       { fontSize: 11, color: colors.inkSoft },
  tabBar:           { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  tabBtn:           { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive:        { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText:          { fontSize: 12, fontWeight: '500', color: colors.inkSoft },
  tabTextActive:    { color: colors.primary, fontWeight: '600' },
  body:             { padding: spacing.md, paddingBottom: 80 },
  card:             { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  row:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel:         { fontSize: 13, color: colors.inkSoft, flex: 1 },
  rowValue:         { fontSize: 13, fontWeight: '500', color: colors.ink, textAlign: 'right', maxWidth: '55%' },
  badge:            { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:        { fontSize: 11, fontWeight: '600' },
  gauge:            { marginBottom: spacing.md },
  gaugeHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gaugeLabel:       { fontSize: 14, fontWeight: '500', color: colors.ink },
  gaugeTrack:       { height: 8, backgroundColor: colors.line, borderRadius: radius.full, overflow: 'hidden' },
  gaugeFill:        { height: '100%', borderRadius: radius.full },
  gaugeScore:       { fontFamily: 'Courier', fontSize: 11, color: colors.inkSoft, marginTop: 4, textAlign: 'right' },
  subTitle:         { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  refNote:          { fontSize: 11, color: colors.inkSoft, marginBottom: spacing.md, fontStyle: 'italic' },
  factorToggle:     { alignItems: 'center', paddingVertical: 8 },
  factorToggleText: { fontSize: 12, fontWeight: '500', color: colors.primary },
  factorRow:        { flexDirection: 'row', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.line },
  factorLabel:      { flex: 2, fontSize: 12, color: colors.inkSoft },
  factorVal:        { flex: 1, fontSize: 12, fontWeight: '500', color: colors.ink, textAlign: 'center' },
  factorPts:        { flex: 0.6, fontFamily: 'Courier', fontSize: 12, fontWeight: '600', textAlign: 'right' },
  zkCard:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zkIcon:           {},
  zkTitle:          { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 3 },
  zkDesc:           { fontSize: 12, color: colors.inkSoft },
  chevron:          { fontSize: 22, color: colors.inkSoft },
  commitLabel:      { fontSize: 11, fontWeight: '500', color: colors.inkSoft, marginBottom: 8 },
  commitHash:       { fontFamily: 'Courier', fontSize: 10, color: colors.primary, lineHeight: 16 },
});