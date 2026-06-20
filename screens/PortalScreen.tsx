import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  listPatients, attestBloodType, attestLastVisit, verifyAttestation,
  PatientSummary, AttestResponse, VerifyResponse,
} from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { BLOOD_TYPES } from '../utils/constants';
import { SettingsButton } from '../components/SettingsButton';

type Mode = 'blood_type' | 'last_visit';

export default function PortalScreen({ route }: any) {
  const prePatientId = route?.params?.patientId as string | undefined;
  const preMode      = route?.params?.premode   as Mode    | undefined;

  const [patients,    setPatients]    = useState<PatientSummary[]>([]);
  const [loadingPts,  setLoadingPts]  = useState(true);
  const [patientId,   setPatientId]   = useState(prePatientId ?? '');
  const [patientQ,    setPatientQ]    = useState('');
  const [mode,        setMode]        = useState<Mode>(preMode ?? 'blood_type');
  const [bloodType,   setBloodType]   = useState('O+');
  const [threshold,   setThreshold]   = useState('90');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<AttestResponse | null>(null);
  // verify
  const [verifyId,    setVerifyId]    = useState('');
  const [verifying,   setVerifying]   = useState(false);
  const [vResult,     setVResult]     = useState<VerifyResponse | null>(null);
  const [showVerify,  setShowVerify]  = useState(false);

  useFocusEffect(useCallback(() => {
    listPatients()
      .then(setPatients)
      .finally(() => setLoadingPts(false));
  }, []));

  const selectedPatient = patients.find(p => p.id === patientId);
  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientQ.toLowerCase()) || p.id.includes(patientQ)
  );

  const handleAttest = async () => {
    if (!patientId) { Alert.alert('Selecciona un paciente primero'); return; }
    setLoading(true); setResult(null);
    try {
      const res = mode === 'blood_type'
        ? await attestBloodType(patientId, bloodType)
        : await attestLastVisit(patientId, Number(threshold) || 90);
      setResult(res);
    } catch (e: any) {
      if (e.message.includes('afirmacion no coincide')) {
        Alert.alert('Afirmación falsa', 'Los datos del paciente no satisfacen la condición declarada. No se puede emitir el certificado.');
      } else {
        Alert.alert('Error', e.message);
      }
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    const id = verifyId.trim();
    if (!id) { Alert.alert('Ingresa un ID de atestación'); return; }
    setVerifying(true); setVResult(null);
    try { setVResult(await verifyAttestation(id)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setVerifying(false); }
  };

  const fmtTs = (ts: number) => new Date(ts * 1000).toLocaleString('es');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SECMED</Text>
            <Text style={styles.title}>ZK Portal</Text>
          </View>
          <SettingsButton />
        </View>
        <Text style={styles.subtitle}>Emite y verifica certificados sin revelar el expediente</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── EMITIR ── */}
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.cardTitle}>🔏 Emitir certificado</Text>
          <Text style={styles.cardDesc}>Genera una prueba Zero-Knowledge sobre un campo del expediente sin revelar ningún otro dato.</Text>

          {/* Paciente */}
          <Text style={styles.fieldLabel}>Paciente</Text>
          {selectedPatient
            ? (
              <View style={styles.selectedPt}>
                <Text style={styles.selectedPtName}>{selectedPatient.name}</Text>
                <TouchableOpacity onPress={() => { setPatientId(''); setPatientQ(''); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Text style={{ color: colors.danger, fontSize: 12 }}>✕ Cambiar</Text>
                </TouchableOpacity>
              </View>
            )
            : (
              <>
                <TextInput
                  style={styles.fieldInput} value={patientQ} onChangeText={setPatientQ}
                  placeholder="Buscar paciente…" placeholderTextColor={colors.inkSoft}
                />
                {loadingPts && <ActivityIndicator color={colors.primary} />}
                {patientQ.length > 0 && filteredPatients.slice(0, 4).map(p => (
                  <TouchableOpacity key={p.id} style={styles.ptOption}
                    onPress={() => { setPatientId(p.id); setPatientQ(''); }}>
                    <Text style={styles.ptOptName}>{p.name}</Text>
                    <Text style={styles.ptOptId}>{p.id}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )
          }

          {/* Tipo de certificado */}
          <Text style={styles.fieldLabel}>Tipo de certificado</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'blood_type' && styles.modeBtnActive]}
              onPress={() => setMode('blood_type')}>
              <Text style={[styles.modeBtnText, mode === 'blood_type' && styles.modeBtnTextActive]}>🩸 Tipo de sangre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'last_visit' && styles.modeBtnActive]}
              onPress={() => setMode('last_visit')}>
              <Text style={[styles.modeBtnText, mode === 'last_visit' && styles.modeBtnTextActive]}>📆 Visita reciente</Text>
            </TouchableOpacity>
          </View>

          {/* Parámetros según modo */}
          {mode === 'blood_type' && (
            <>
              <Text style={styles.fieldLabel}>Tipo de sangre a certificar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {BLOOD_TYPES.map(bt => (
                  <TouchableOpacity key={bt} onPress={() => setBloodType(bt)}
                    style={[styles.chip, bloodType === bt && styles.chipActive]}>
                    <Text style={[styles.chipText, bloodType === bt && styles.chipTextActive]}>{bt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
          {mode === 'last_visit' && (
            <>
              <Text style={styles.fieldLabel}>Consulta en los últimos N días</Text>
              <TextInput
                style={[styles.fieldInput, { marginBottom: spacing.md }]}
                value={threshold} onChangeText={setThreshold}
                keyboardType="numeric" placeholderTextColor={colors.inkSoft}
              />
            </>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAttest} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>Emitir certificado ZK →</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Resultado ── */}
        {result && (
          <View style={[styles.card, shadow.card, { borderLeftWidth: 3, borderLeftColor: colors.secondary }]}>
            <Text style={styles.resultTitle}>✅ Certificado emitido</Text>
            <Text style={styles.resultClaim}>{result.claim}</Text>

            <View style={styles.attRow}>
              <Text style={styles.attLabel}>ID del certificado</Text>
              <Text style={styles.attValue} selectable>{result.attestation_id}</Text>
            </View>
            <View style={styles.attRow}>
              <Text style={styles.attLabel}>Ruta de verificación</Text>
              <Text style={styles.attValue} selectable>{result.verify_path}</Text>
            </View>
            <View style={styles.attRow}>
              <Text style={styles.attLabel}>Emitido</Text>
              <Text style={styles.attValue}>{fmtTs(result.issued_at)}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Comparte el ID del certificado con el tercero que necesita verificar. 
                Ellos pueden verificarlo desde la sección "Verificar" sin acceder al expediente.
              </Text>
            </View>
          </View>
        )}

        {/* ── VERIFICAR ── */}
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.cardTitle}>🔍 Verificar certificado</Text>
          <Text style={styles.cardDesc}>Cualquier tercero puede verificar la validez de un certificado introduciendo su ID.</Text>

          <Text style={styles.fieldLabel}>ID del certificado (ATT-XXXX)</Text>
          <TextInput
            style={styles.fieldInput} value={verifyId} onChangeText={setVerifyId}
            placeholder="ATT-0001" placeholderTextColor={colors.inkSoft}
            autoCapitalize="characters"
          />
          {result && (
            <TouchableOpacity onPress={() => setVerifyId(result.attestation_id)} style={styles.autoFill}>
              <Text style={styles.autoFillText}>↑ Usar el certificado recién emitido</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secBtn} onPress={handleVerify} disabled={verifying} activeOpacity={0.8}>
            {verifying ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secBtnText}>Verificar →</Text>}
          </TouchableOpacity>

          {vResult && (
            <View style={[styles.verifyBox, { borderColor: vResult.valid ? colors.secondary : colors.danger }]}>
              <Text style={[styles.verifyStatus, { color: vResult.valid ? colors.secondary : colors.danger }]}>
                {vResult.valid ? '✅ Certificado válido' : '❌ Certificado inválido'}
              </Text>
              <Text style={styles.verifyClaim}>{vResult.claim}</Text>
              <View style={styles.attRow}>
                <Text style={styles.attLabel}>Paciente</Text>
                <Text style={styles.attValue}>{vResult.patient_name}</Text>
              </View>
              <View style={styles.attRow}>
                <Text style={styles.attLabel}>Emisor</Text>
                <Text style={styles.attValue}>{vResult.issuer}</Text>
              </View>
              <View style={styles.attRow}>
                <Text style={styles.attLabel}>Emitido</Text>
                <Text style={styles.attValue}>{fmtTs(vResult.issued_at)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Explicación técnica ── */}
        <View style={[styles.card, { backgroundColor: colors.bgSoft }]}>
          <Text style={styles.techTitle}>¿Cómo funciona?</Text>
          <Text style={styles.techText}>
            El expediente se convierte en un árbol Merkle de 8 hojas usando el hash Poseidon. 
            El circuito Plonky2 genera una prueba ZK que demuestra que un campo específico satisface 
            la condición declarada, sin revelar ningún otro valor del expediente.{'\n\n'}
            El verificador solo recibe: la afirmación (ej. "tipo de sangre B+") y la prueba criptográfica. 
            El expediente completo permanece privado.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow:          { fontSize: 10, color: colors.primary, letterSpacing: 2, marginBottom: 2, fontFamily: 'Courier' },
  title:            { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
  subtitle:         { fontSize: 13, color: colors.inkSoft, marginTop: 3 },
  body:             { padding: spacing.md, paddingBottom: 100 },
  card:             { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  cardTitle:        { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  cardDesc:         { fontSize: 13, color: colors.inkSoft, lineHeight: 19, marginBottom: spacing.md },
  fieldLabel:       { fontSize: 13, fontWeight: '500', color: colors.inkSoft, marginBottom: 6, marginTop: 4 },
  fieldInput:       { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.ink, backgroundColor: colors.bgSoft },
  selectedPt:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgSoft, borderRadius: radius.md, padding: 12, marginBottom: spacing.md },
  selectedPtName:   { fontSize: 15, fontWeight: '600', color: colors.ink },
  ptOption:         { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  ptOptName:        { fontSize: 14, fontWeight: '600', color: colors.ink },
  ptOptId:          { fontSize: 11, color: colors.inkSoft, fontFamily: 'Courier' },
  modeRow:          { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  modeBtn:          { flex: 1, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' },
  modeBtnActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText:      { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
  modeBtnTextActive:{ color: colors.white },
  chip:             { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line, marginRight: 8, backgroundColor: colors.white },
  chipActive:       { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:         { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  chipTextActive:   { color: colors.white },
  primaryBtn:       { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: spacing.sm },
  primaryBtnText:   { color: colors.white, fontSize: 15, fontWeight: '600' },
  secBtn:           { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: spacing.sm },
  secBtnText:       { color: colors.primary, fontSize: 14, fontWeight: '600' },
  resultTitle:      { fontSize: 16, fontWeight: '700', color: colors.secondary, marginBottom: 6 },
  resultClaim:      { fontSize: 14, color: colors.ink, marginBottom: spacing.md, lineHeight: 21 },
  attRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  attLabel:         { fontSize: 12, color: colors.inkSoft, flex: 1 },
  attValue:         { fontSize: 12, fontFamily: 'Courier', color: colors.ink, textAlign: 'right', flex: 1 },
  infoBox:          { backgroundColor: colors.bgSoft, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.md },
  infoBoxText:      { fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  autoFill:         { alignItems: 'center', padding: 8 },
  autoFillText:     { fontSize: 12, color: colors.primary, fontWeight: '500' },
  verifyBox:        { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  verifyStatus:     { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  verifyClaim:      { fontSize: 14, color: colors.ink, marginBottom: spacing.md, lineHeight: 20 },
  techTitle:        { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  techText:         { fontSize: 13, color: colors.inkSoft, lineHeight: 20 },
});