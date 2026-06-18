import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  ScrollView, Alert, ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  listDocuments, getDocument, deliverDocument, verifyDocument,
  DocumentSummary, DocumentDetail,
} from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { DOC_TYPE_LABELS } from '../utils/constants';

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Modal detalle de documento ───────────────────────────────────────────────

function DocDetailModal({ docId, onClose }: { docId: string | null; onClose: () => void }) {
  const [doc,       setDoc]       = useState<DocumentDetail | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified,  setVerified]  = useState<{ valid: boolean; content_hash: string; recomputed_hash: string } | null>(null);
  const [delivering, setDelivering] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!docId) return;
    setLoading(true);
    getDocument(docId)
      .then(setDoc)
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
    return () => { setDoc(null); setVerified(null); };
  }, [docId]));

  if (!docId) return null;

  const handleVerify = async () => {
    if (!docId) return;
    setVerifying(true);
    try {
      const res = await verifyDocument(docId);
      setVerified({ valid: res.valid, content_hash: res.content_hash, recomputed_hash: res.recomputed_hash });
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setVerifying(false); }
  };

  const handleDeliver = async () => {
    if (!docId) return;
    setDelivering(true);
    try {
      await deliverDocument(docId);
      setDoc(d => d ? { ...d, delivered: true } : null);
      Alert.alert('Entregado', 'El documento fue marcado como entregado.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setDelivering(false); }
  };

  const renderContent = (content: any, docType: string) => {
    if (!content) return null;
    if (docType === 'receta' && content.medicamentos) {
      return content.medicamentos.map((m: any, i: number) => (
        <View key={i} style={styles.medCard}>
          <Text style={styles.medName}>{m.nombre}</Text>
          <Text style={styles.medDetail}>{m.presentacion} · {m.cantidad}</Text>
          <Text style={styles.medIndic}>{m.indicaciones}</Text>
        </View>
      ));
    }
    if (docType === 'informe') {
      const fields = [
        { label: 'RESUMEN', value: content.resumen },
        { label: 'ANTECEDENTES', value: content.antecedentes },
        { label: 'HALLAZGOS', value: content.hallazgos },
        { label: 'PLAN', value: content.plan },
        { label: 'RECOMENDACIONES', value: content.recomendaciones },
      ];
      return fields.filter(f => f.value).map((f, i) => (
        <View key={i} style={styles.infoBlock}>
          <Text style={styles.infoLabel}>{f.label}</Text>
          <Text style={styles.infoText}>{f.value}</Text>
        </View>
      ));
    }
    return <Text style={{ fontFamily: 'Courier', fontSize: 11, color: colors.inkSoft }}>{JSON.stringify(content, null, 2)}</Text>;
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalCont}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={2}>{doc?.title ?? '…'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        {loading
          ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          : doc && (
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
              {/* Meta */}
              <View style={styles.metaRow}>
                <Text style={styles.metaTag}>{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</Text>
                {doc.delivered && <Text style={styles.deliveredTag}>✓ Entregado</Text>}
              </View>
              <Text style={styles.metaPatient}>{doc.patient_name}</Text>
              <Text style={styles.metaDate}>{fmtDate(doc.issued_at)}</Text>

              {/* Contenido */}
              {renderContent(doc.content, doc.doc_type)}

              {/* Acciones */}
              {!doc.delivered && (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleDeliver} disabled={delivering} activeOpacity={0.8}>
                  {delivering ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>✓ Marcar como entregado</Text>}
                </TouchableOpacity>
              )}

              {/* Verificación de integridad */}
              <TouchableOpacity style={styles.secBtn} onPress={handleVerify} disabled={verifying} activeOpacity={0.8}>
                {verifying ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secBtnText}>🔐 Verificar integridad (Poseidon)</Text>}
              </TouchableOpacity>

              {verified && (
                <View style={[styles.verifyResult, { borderColor: verified.valid ? colors.secondary : colors.danger }]}>
                  <Text style={[styles.verifyStatus, { color: verified.valid ? colors.secondary : colors.danger }]}>
                    {verified.valid ? '✓ Documento íntegro' : '✗ Hash no coincide'}
                  </Text>
                  <Text style={styles.verifyHash}>Hash almacenado: {verified.content_hash.slice(0, 16)}…</Text>
                  <Text style={styles.verifyHash}>Hash recalculado: {verified.recomputed_hash.slice(0, 16)}…</Text>
                </View>
              )}

              {/* ID doc */}
              <View style={styles.docIdRow}>
                <Text style={styles.docIdLabel}>ID del documento</Text>
                <Text style={styles.docIdValue} selectable>{doc.id}</Text>
              </View>
            </ScrollView>
          )
        }
      </View>
    </Modal>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function DocumentsScreen({ route }: any) {
  const patientId   = route?.params?.patientId;
  const patientName = route?.params?.patientName;

  const [docs,       setDocs]       = useState<DocumentSummary[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openDocId,  setOpenDocId]  = useState<string | null>(null);
  const [filter,     setFilter]     = useState<'todos' | 'receta' | 'informe'>('todos');

  const load = useCallback(async () => {
    try { setDocs(await listDocuments(patientId)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [patientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'todos' ? docs : docs.filter(d => d.doc_type === filter);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SECMED</Text>
        <Text style={styles.title}>{patientName ? `Docs · ${patientName}` : 'Documentos'}</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filterRow}>
        {(['todos', 'receta', 'informe'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'todos' ? 'Todos' : DOC_TYPE_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: spacing.md }}>📄</Text>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>Sin documentos</Text>
            <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: 6, maxWidth: 260 }}>
              Los documentos se generan desde la pantalla de Consulta.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.docCard, shadow.card]} activeOpacity={0.82} onPress={() => setOpenDocId(item.id)}>
            <Text style={styles.docIcon}>{item.doc_type === 'receta' ? '💊' : '📋'}</Text>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.docPatient}>{item.patient_name}</Text>
              <Text style={styles.docDate}>{fmtDate(item.issued_at)}</Text>
            </View>
            <View style={styles.docMeta}>
              {item.delivered && <Text style={styles.deliveredMini}>✓</Text>}
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <DocDetailModal docId={openDocId} onClose={() => setOpenDocId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  eyebrow:          { fontSize: 10, color: colors.primary, letterSpacing: 2, marginBottom: 2, fontFamily: 'Courier' },
  title:            { fontSize: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  filterRow:        { flexDirection: 'row', gap: 8, padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  filterChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:       { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  filterTextActive: { color: colors.white },
  docCard:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, gap: 12 },
  docIcon:          { fontSize: 28 },
  docInfo:          { flex: 1 },
  docTitle:         { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 3 },
  docPatient:       { fontSize: 12, color: colors.inkSoft },
  docDate:          { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  docMeta:          { alignItems: 'center', gap: 4 },
  deliveredMini:    { fontSize: 14, color: colors.secondary, fontWeight: '700' },
  chevron:          { fontSize: 22, color: colors.inkSoft },
  // modal
  modalCont:        { flex: 1, backgroundColor: colors.bg },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.lg, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  modalTitle:       { flex: 1, fontSize: 18, fontWeight: '700', color: colors.ink },
  modalClose:       { fontSize: 20, color: colors.inkSoft },
  metaRow:          { flexDirection: 'row', gap: 8, marginBottom: 6 },
  metaTag:          { backgroundColor: colors.bgSoft, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, color: colors.primary, fontWeight: '600' },
  deliveredTag:     { backgroundColor: colors.secondarySoft, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, color: colors.secondary, fontWeight: '600' },
  metaPatient:      { fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  metaDate:         { fontSize: 12, color: colors.inkSoft, marginBottom: spacing.md },
  medCard:          { backgroundColor: colors.bgSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: 10 },
  medName:          { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 3 },
  medDetail:        { fontFamily: 'Courier', fontSize: 12, color: colors.primary, marginBottom: 4 },
  medIndic:         { fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
  infoBlock:        { marginBottom: spacing.md },
  infoLabel:        { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.5, marginBottom: 6 },
  infoText:         { fontSize: 14, color: colors.ink, lineHeight: 21 },
  primaryBtn:       { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.md },
  primaryBtnText:   { color: colors.white, fontSize: 15, fontWeight: '600' },
  secBtn:           { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', marginBottom: spacing.md },
  secBtnText:       { color: colors.primary, fontSize: 14, fontWeight: '600' },
  verifyResult:     { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  verifyStatus:     { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  verifyHash:       { fontFamily: 'Courier', fontSize: 10, color: colors.inkSoft, marginBottom: 3 },
  docIdRow:         { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.bgSoft, borderRadius: radius.md },
  docIdLabel:       { fontSize: 11, color: colors.inkSoft, marginBottom: 4 },
  docIdValue:       { fontFamily: 'Courier', fontSize: 12, color: colors.primary },
});