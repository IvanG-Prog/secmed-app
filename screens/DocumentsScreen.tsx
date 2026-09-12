import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  ScrollView, Alert, ActivityIndicator, StyleSheet, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  listDocuments, getDocument, deliverDocument, verifyDocument,
  documentFileUrl, hasOriginalFile,
  DocumentSummary, DocumentDetail,
} from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../utils/constants';
import { SettingsButton } from '../components/SettingsButton';
import { HomeLogo } from '../components/HomeLogo';

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtMoney(n: number | undefined, currency?: string) {
  if (n == null) return '';
  return `${currency === 'VES' ? 'Bs.' : '$'} ${n.toFixed(2)}`;
}

// Etiquetas legibles para las claves técnicas que a veces aparecen en el
// contenido (p. ej. de un tipo de documento nuevo que la app todavía no
// conoce con un renderizador dedicado) — así el respaldo genérico nunca
// muestra JSON crudo, siempre pares etiqueta/valor.
const FIELD_LABELS: Record<string, string> = {
  paciente: 'Paciente', fecha: 'Fecha', laboratorio: 'Laboratorio',
  observaciones: 'Observaciones', medico: 'Médico', institucion: 'Institución',
  titulo: 'Título', resumen: 'Resumen', hallazgos: 'Hallazgos',
  diagnostico: 'Diagnóstico', plan: 'Plan', estado: 'Estado',
};
const HIDDEN_FIELDS = new Set(['fuente', 'archivo_sello', 'recibido_ts', 'resultados', 'items', 'pago', 'emisor', 'factura', 'moneda', 'subtotal', 'descuento', 'total']);

function GenericFields({ content }: { content: Record<string, any> }) {
  const entries = Object.entries(content).filter(([k, v]) => !HIDDEN_FIELDS.has(k) && v !== '' && v != null);
  if (entries.length === 0) return null;
  return (
    <>
      {entries.map(([k, v]) => (
        <View key={k} style={styles.infoBlock}>
          <Text style={styles.infoLabel}>{(FIELD_LABELS[k] ?? k).toUpperCase()}</Text>
          <Text style={styles.infoText}>{String(v)}</Text>
        </View>
      ))}
    </>
  );
}

// ─── Resultados de laboratorio (internos y externos comparten forma) ─────────
function LabResultsView({ content }: { content: any }) {
  const results: any[] = Array.isArray(content?.resultados) ? content.resultados : [];
  return (
    <>
      <GenericFields content={content} />
      {results.length > 0 && (
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>RESULTADOS</Text>
          <View style={styles.labTable}>
            <View style={[styles.labRow, styles.labHeaderRow]}>
              <Text style={[styles.labCellTest, styles.labHeaderText]}>Prueba</Text>
              <Text style={[styles.labCellValue, styles.labHeaderText]}>Valor</Text>
              <Text style={[styles.labCellRef, styles.labHeaderText]}>Referencia</Text>
            </View>
            {results.map((r, i) => (
              <View key={i} style={styles.labRow}>
                <Text style={styles.labCellTest}>{r.prueba}</Text>
                <Text style={styles.labCellValue}>{r.valor}{r.unidad ? ` ${r.unidad}` : ''}</Text>
                <Text style={styles.labCellRef}>{r.referencia || '—'}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

// ─── Factura ──────────────────────────────────────────────────────────────────
function InvoiceView({ content }: { content: any }) {
  const items: any[] = Array.isArray(content?.items) ? content.items : [];
  const moneda = content?.moneda;
  return (
    <>
      {content?.medico && (
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>MÉDICO</Text>
          <Text style={styles.infoText}>{content.medico}</Text>
        </View>
      )}
      {items.length > 0 && (
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>CONCEPTOS</Text>
          <View style={styles.labTable}>
            {items.map((it, i) => (
              <View key={i} style={styles.invoiceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labCellTest}>{it.concepto}</Text>
                  <Text style={styles.invoiceQty}>{it.cantidad} × {fmtMoney(it.precio_unit, moneda)}</Text>
                </View>
                <Text style={styles.invoiceLineTotal}>{fmtMoney(it.subtotal, moneda)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={styles.invoiceTotals}>
        {content?.subtotal != null && (
          <View style={styles.invoiceTotalRow}>
            <Text style={styles.invoiceTotalLabel}>Subtotal</Text>
            <Text style={styles.invoiceTotalValue}>{fmtMoney(content.subtotal, moneda)}</Text>
          </View>
        )}
        {!!content?.descuento && (
          <View style={styles.invoiceTotalRow}>
            <Text style={styles.invoiceTotalLabel}>Descuento</Text>
            <Text style={styles.invoiceTotalValue}>-{fmtMoney(content.descuento, moneda)}</Text>
          </View>
        )}
        <View style={styles.invoiceTotalRow}>
          <Text style={styles.invoiceTotalLabelBig}>Total</Text>
          <Text style={styles.invoiceTotalValueBig}>{fmtMoney(content?.total, moneda)}</Text>
        </View>
      </View>
      {content?.pago?.metodo && (
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>MÉTODO DE PAGO</Text>
          <Text style={styles.infoText}>{content.pago.metodo}{content.estado ? ` · ${content.estado}` : ''}</Text>
        </View>
      )}
    </>
  );
}

// ─── Visor de la foto/escaneo original a pantalla completa ───────────────────
function OriginalFileViewer({ docId, onClose }: { docId: string; onClose: () => void }) {
  return (
    <Modal visible animationType="fade" transparent>
      <View style={styles.imageViewerBackdrop}>
        <TouchableOpacity style={styles.imageViewerClose} onPress={onClose} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
          <Ionicons name="close" size={26} color={colors.white} />
        </TouchableOpacity>
        <Image
          source={{ uri: documentFileUrl(docId) }}
          style={styles.imageViewerImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
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

  const [showOriginal, setShowOriginal] = useState(false);

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
    if (docType === 'informe' || docType === 'informe_externo') {
      const fields = docType === 'informe_externo'
        ? [
            { label: 'INSTITUCIÓN', value: content.institucion },
            { label: 'MÉDICO', value: content.medico },
            { label: 'RESUMEN', value: content.resumen },
            { label: 'HALLAZGOS', value: content.hallazgos },
            { label: 'DIAGNÓSTICO', value: content.diagnostico },
            { label: 'PLAN', value: content.plan },
          ]
        : [
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
    if (docType === 'resultado_lab' || docType === 'resultado_externo') {
      return <LabResultsView content={content} />;
    }
    if (docType === 'factura') {
      return <InvoiceView content={content} />;
    }
    // Cualquier otro tipo (p. ej. orden_lab, o uno nuevo que el backend
    // agregue más adelante): pares etiqueta/valor legibles, nunca JSON crudo.
    return <GenericFields content={content} />;
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalCont}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={2}>{doc?.title ?? '…'}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color={colors.inkSoft} /></TouchableOpacity>
        </View>

        {loading
          ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          : doc && (
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
              {/* Meta */}
              <View style={styles.metaRow}>
                <View style={styles.metaTag}>
                  <Ionicons name={(DOC_TYPE_ICONS[doc.doc_type] ?? 'document-outline') as any} size={13} color={colors.primary} />
                  <Text style={styles.metaTagText}>{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</Text>
                </View>
                {doc.delivered && <Text style={styles.deliveredTag}>✓ Entregado</Text>}
              </View>
              <Text style={styles.metaPatient}>{doc.patient_name}</Text>
              <Text style={styles.metaDate}>{fmtDate(doc.issued_at)}</Text>

              {/* Contenido */}
              {renderContent(doc.content, doc.doc_type)}

              {/* Foto/escaneo original (solo documentos externos) */}
              {hasOriginalFile(doc) && (
                <TouchableOpacity style={styles.secBtn} onPress={() => setShowOriginal(true)} activeOpacity={0.8}>
                  <View style={styles.secBtnRow}>
                    <Ionicons name="image-outline" size={16} color={colors.primary} />
                    <Text style={styles.secBtnText}>Ver imagen original</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Acciones */}
              {!doc.delivered && (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleDeliver} disabled={delivering} activeOpacity={0.8}>
                  {delivering ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>✓ Marcar como entregado</Text>}
                </TouchableOpacity>
              )}

              {/* Verificación de integridad */}
              <TouchableOpacity style={styles.secBtn} onPress={handleVerify} disabled={verifying} activeOpacity={0.8}>
                {verifying ? <ActivityIndicator color={colors.primary} size="small" /> : (
                  <View style={styles.secBtnRow}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                    <Text style={styles.secBtnText}>Verificar integridad (Poseidon)</Text>
                  </View>
                )}
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

        {showOriginal && doc && (
          <OriginalFileViewer docId={doc.id} onClose={() => setShowOriginal(false)} />
        )}
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
        <View style={styles.eyebrowRow}>
          <HomeLogo size={14} />
          <Text style={styles.eyebrow}>SECMED</Text>
        </View>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{patientName ? `Docs · ${patientName}` : 'Documentos'}</Text>
          <SettingsButton />
        </View>
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
            <Ionicons name="document-text-outline" size={36} color={colors.inkSoft} style={{ marginBottom: spacing.md }} />
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>Sin documentos</Text>
            <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: 6, maxWidth: 260 }}>
              Los documentos se generan desde la pantalla de Consulta.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.docCard, shadow.card]} activeOpacity={0.82} onPress={() => setOpenDocId(item.id)}>
            <View style={styles.docIconWrap}>
              <Ionicons
                name={(DOC_TYPE_ICONS[item.doc_type] ?? 'document-outline') as any}
                size={18}
                color={colors.primary}
              />
            </View>
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
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow:          { fontSize: 10, color: colors.primary, letterSpacing: 2, fontFamily: 'Courier' },
  eyebrowRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title:            { fontSize: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  filterRow:        { flexDirection: 'row', gap: 8, padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  filterChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:       { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  filterTextActive: { color: colors.white },
  docCard:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, gap: 12 },
  docIconWrap:      { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center' },
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
  metaTag:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bgSoft, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  metaTagText:      { fontSize: 12, color: colors.primary, fontWeight: '600' },
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

  // Tabla de resultados de laboratorio
  labTable:         { backgroundColor: colors.bgSoft, borderRadius: radius.md, overflow: 'hidden' },
  labRow:           { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  labHeaderRow:     { backgroundColor: colors.cardBg },
  labHeaderText:    { fontSize: 10, fontWeight: '700', color: colors.inkSoft, letterSpacing: 0.5 },
  labCellTest:      { flex: 1.4, fontSize: 13, color: colors.ink, fontWeight: '600' },
  labCellValue:     { flex: 1, fontSize: 13, color: colors.ink },
  labCellRef:       { flex: 1, fontSize: 12, color: colors.inkSoft },

  // Factura
  invoiceRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  invoiceQty:       { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  invoiceLineTotal: { fontSize: 13, fontWeight: '600', color: colors.ink },
  invoiceTotals:    { marginTop: 4, marginBottom: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  invoiceTotalRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  invoiceTotalLabel:     { fontSize: 13, color: colors.inkSoft },
  invoiceTotalValue:     { fontSize: 13, color: colors.ink },
  invoiceTotalLabelBig:  { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 4 },
  invoiceTotalValueBig:  { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 4 },

  // Visor de imagen original
  imageViewerBackdrop:  { flex: 1, backgroundColor: 'rgba(10,14,20,0.95)', alignItems: 'center', justifyContent: 'center' },
  imageViewerClose:     { position: 'absolute', top: 56, right: spacing.md, zIndex: 1, padding: 6 },
  imageViewerImage:     { width: '100%', height: '80%' },
  primaryBtn:       { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.md },
  primaryBtnText:   { color: colors.white, fontSize: 15, fontWeight: '600' },
  secBtn:           { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', marginBottom: spacing.md },
  secBtnText:       { color: colors.primary, fontSize: 14, fontWeight: '600' },
  secBtnRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifyResult:     { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  verifyStatus:     { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  verifyHash:       { fontFamily: 'Courier', fontSize: 10, color: colors.inkSoft, marginBottom: 3 },
  docIdRow:         { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.bgSoft, borderRadius: radius.md },
  docIdLabel:       { fontSize: 11, color: colors.inkSoft, marginBottom: 4 },
  docIdValue:       { fontFamily: 'Courier', fontSize: 12, color: colors.primary },
});