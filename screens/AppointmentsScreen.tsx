import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ScrollView, Alert, ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  listAppointments, createAppointment, updateAppointment,
  deleteAppointment, listPatients, Appointment, PatientSummary,
} from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { APPT_STATUS_COLORS, APPT_STATUS_LABELS } from '../utils/constants';
import { SettingsButton } from '../components/SettingsButton';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return iso; }
}
function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function StatusBadge({ status }: { status: string }) {
  const col = APPT_STATUS_COLORS[status] ?? { bg: colors.line, text: colors.inkSoft };
  return (
    <View style={[styles.badge, { backgroundColor: col.bg }]}>
      <Text style={[styles.badgeText, { color: col.text }]}>{APPT_STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}

// ─── Modal nueva cita ─────────────────────────────────────────────────────────

function NewApptModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [patients,    setPatients]    = useState<PatientSummary[]>([]);
  const [patientId,   setPatientId]   = useState('');
  const [patientQ,    setPatientQ]    = useState('');
  const [date,        setDate]        = useState('');  // YYYY-MM-DD
  const [time,        setTime]        = useState('');  // HH:MM
  const [duration,    setDuration]    = useState('30');
  const [reason,      setReason]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [loadingPts,  setLoadingPts]  = useState(false);

  useFocusEffect(useCallback(() => {
    if (!visible) return;
    setLoadingPts(true);
    listPatients().then(setPatients).finally(() => setLoadingPts(false));
  }, [visible]));

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(patientQ.toLowerCase()) || p.id.includes(patientQ)
  );

  const submit = async () => {
    if (!patientId) { Alert.alert('Selecciona un paciente'); return; }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !time.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Formato inválido', 'Fecha: YYYY-MM-DD  Hora: HH:MM'); return;
    }
    setLoading(true);
    try {
      await createAppointment({
        patient_id: patientId,
        starts_at: `${date}T${time}`,
        duration_min: Number(duration) || 30,
        reason,
        created_by: 'medico',
      });
      setPatientId(''); setPatientQ(''); setDate(''); setTime(''); setReason('');
      onCreated(); onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalCont}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Nueva cita</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Paciente *</Text>
          <TextInput style={styles.fieldInput} value={patientQ} onChangeText={setPatientQ}
            placeholder="Buscar por nombre o ID…" placeholderTextColor={colors.inkSoft} />
          {loadingPts && <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.sm }} />}
          {patientQ.length > 0 && !patientId && filtered.slice(0, 5).map(p => (
            <TouchableOpacity key={p.id} style={styles.patientOption}
              onPress={() => { setPatientId(p.id); setPatientQ(p.name); }}>
              <Text style={styles.patientOptName}>{p.name}</Text>
              <Text style={styles.patientOptId}>{p.id}</Text>
            </TouchableOpacity>
          ))}
          {patientId && (
            <TouchableOpacity onPress={() => { setPatientId(''); setPatientQ(''); }} style={styles.clearPt}>
              <Text style={{ color: colors.danger, fontSize: 12 }}>✕ Cambiar paciente</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.fieldLabel}>Fecha * (YYYY-MM-DD)</Text>
          <TextInput style={styles.fieldInput} value={date} onChangeText={setDate}
            placeholder="2026-06-20" placeholderTextColor={colors.inkSoft} keyboardType="numeric" />

          <Text style={styles.fieldLabel}>Hora * (HH:MM)</Text>
          <TextInput style={styles.fieldInput} value={time} onChangeText={setTime}
            placeholder="09:00" placeholderTextColor={colors.inkSoft} keyboardType="numeric" />

          <Text style={styles.fieldLabel}>Duración (min)</Text>
          <TextInput style={styles.fieldInput} value={duration} onChangeText={setDuration}
            keyboardType="numeric" placeholderTextColor={colors.inkSoft} />

          <Text style={styles.fieldLabel}>Motivo</Text>
          <TextInput style={[styles.fieldInput, { minHeight: 70 }]} value={reason} onChangeText={setReason}
            placeholder="Control de presión arterial…" placeholderTextColor={colors.inkSoft} multiline />

          <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Guardar cita</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Modal editar estado ──────────────────────────────────────────────────────

function EditStatusModal({ appt, onClose, onUpdated }: {
  appt: Appointment | null; onClose: () => void; onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const statuses = ['confirmada', 'completada', 'cancelada', 'solicitada'] as const;

  if (!appt) return null;

  const change = async (status: string) => {
    setLoading(true);
    try { await updateAppointment(appt.id, { status: status as any }); onUpdated(); onClose(); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const remove = () => {
    Alert.alert('Eliminar cita', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteAppointment(appt.id); onUpdated(); onClose(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet">
      <View style={styles.modalCont}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{fmtDate(appt.starts_at)} {fmtTime(appt.starts_at)}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <View style={{ padding: spacing.lg }}>
          <Text style={styles.editPatient}>{appt.patient_name}</Text>
          <Text style={styles.editReason}>{appt.reason}</Text>
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Cambiar estado</Text>
          {loading
            ? <ActivityIndicator color={colors.primary} />
            : statuses.map(s => (
              <TouchableOpacity key={s} style={[styles.statusOption, appt.status === s && styles.statusOptionActive]}
                onPress={() => change(s)}>
                <StatusBadge status={s} />
                {appt.status === s && <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 8 }}>✓ actual</Text>}
              </TouchableOpacity>
            ))
          }
          <TouchableOpacity style={styles.deleteBtn} onPress={remove}>
            <Text style={styles.deleteBtnText}>🗑️ Eliminar cita</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AppointmentsScreen() {
  const [appts,      setAppts]      = useState<Appointment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [editing,    setEditing]    = useState<Appointment | null>(null);
  const [filter,     setFilter]     = useState<'todas' | 'confirmada' | 'solicitada' | 'completada'>('todas');

  const load = useCallback(async () => {
    try { setAppts(await listAppointments()); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'todas' ? appts : appts.filter(a => a.status === filter);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const filters: ('todas' | 'confirmada' | 'solicitada' | 'completada')[] = ['todas', 'confirmada', 'solicitada', 'completada'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SECMED</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Agenda</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowNew(true)} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>+ Cita</Text>
            </TouchableOpacity>
            <SettingsButton />
          </View>
        </View>
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}>
        {filters.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'todas' ? 'Todas' : APPT_STATUS_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={a => a.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
            <Text style={{ fontSize: 36, marginBottom: spacing.md }}>📅</Text>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>Sin citas</Text>
            <Text style={{ color: colors.inkSoft, textAlign: 'center', marginTop: 6 }}>Agrega una con el botón "+ Cita".</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.apptCard, shadow.card]} activeOpacity={0.82} onPress={() => setEditing(item)}>
            <View style={styles.apptTime}>
              <Text style={styles.apptDate}>{fmtDate(item.starts_at)}</Text>
              <Text style={styles.apptHour}>{fmtTime(item.starts_at)}</Text>
              <Text style={styles.apptDur}>{item.duration_min} min</Text>
            </View>
            <View style={styles.apptInfo}>
              <Text style={styles.apptPatient}>{item.patient_name}</Text>
              <Text style={styles.apptReason} numberOfLines={1}>{item.reason || 'Sin motivo especificado'}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      <NewApptModal visible={showNew} onClose={() => setShowNew(false)} onCreated={load} />
      <EditStatusModal appt={editing} onClose={() => setEditing(null)} onUpdated={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  header:             { paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  eyebrow:            { fontSize: 10, color: colors.primary, letterSpacing: 2, marginBottom: 2, fontFamily: 'Courier' },
  headerRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.sm },
  title:              { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
  addBtn:             { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 9 },
  addBtnText:         { color: colors.white, fontSize: 13, fontWeight: '600' },
  headerActions:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filtersRow:         { backgroundColor: colors.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  filterChip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  filterChipActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:         { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  filterTextActive:   { color: colors.white },
  apptCard:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, gap: 12 },
  apptTime:           { width: 70, alignItems: 'center' },
  apptDate:           { fontSize: 11, color: colors.inkSoft, textTransform: 'capitalize', textAlign: 'center' },
  apptHour:           { fontSize: 18, fontWeight: '700', color: colors.primary, marginVertical: 2 },
  apptDur:            { fontSize: 10, color: colors.inkSoft },
  apptInfo:           { flex: 1, gap: 4 },
  apptPatient:        { fontSize: 15, fontWeight: '600', color: colors.ink },
  apptReason:         { fontSize: 12, color: colors.inkSoft },
  chevron:            { fontSize: 22, color: colors.inkSoft },
  badge:              { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText:          { fontSize: 11, fontWeight: '600' },
  // modal
  modalCont:          { flex: 1, backgroundColor: colors.bg },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: colors.ink },
  modalClose:         { fontSize: 20, color: colors.inkSoft },
  fieldLabel:         { fontSize: 13, fontWeight: '500', color: colors.inkSoft, marginBottom: 6, marginTop: spacing.md },
  fieldInput:         { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.ink, backgroundColor: colors.bgSoft },
  patientOption:      { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  patientOptName:     { fontSize: 14, fontWeight: '600', color: colors.ink },
  patientOptId:       { fontSize: 11, color: colors.inkSoft, fontFamily: 'Courier' },
  clearPt:            { padding: 8 },
  saveBtn:            { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText:        { color: colors.white, fontSize: 16, fontWeight: '600' },
  editPatient:        { fontSize: 18, fontWeight: '700', color: colors.ink },
  editReason:         { fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  statusOption:       { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, marginBottom: 8 },
  statusOptionActive: { borderColor: colors.primary, backgroundColor: colors.bgSoft },
  deleteBtn:          { alignItems: 'center', padding: 14, marginTop: spacing.md },
  deleteBtnText:      { color: colors.danger, fontSize: 14, fontWeight: '600' },
});