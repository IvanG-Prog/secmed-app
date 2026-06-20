import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, ScrollView, Switch, Alert, ActivityIndicator,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listPatients, createPatient, PatientSummary, NewPatient } from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { BLOOD_TYPES, FAMILY_HISTORY_OPTIONS } from '../utils/constants';
import { SettingsButton } from '../components/SettingsButton';

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({
  label, value, onChangeText, keyboardType = 'default', placeholder,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  keyboardType?: any; placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value} onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder ?? ''}
        placeholderTextColor={colors.inkSoft}
        autoCorrect={false}
      />
    </View>
  );
}

function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary }} thumbColor={colors.white} />
    </View>
  );
}

// ─── Modal: Nuevo paciente ────────────────────────────────────────────────────

const BLANK: NewPatient = {
  id: '', name: '', blood_type: 'O+', organ_donor: false,
  vaccination_complete: false, last_visit_days: 30,
  age: 35, sex: 'M', bmi: 25, waist_cm: 88,
  systolic_bp: 120, total_cholesterol: 180, hdl_cholesterol: 50,
  smoker: false, physically_active: true, daily_fruit_veg: true,
  bp_medication: false, history_high_glucose: false,
  family_history_diabetes: 'none', diabetes_diagnosed: false,
};

function AddPatientModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState<NewPatient>(BLANK);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof NewPatient>(k: K, v: NewPatient[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      Alert.alert('Campos requeridos', 'El ID y el nombre son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      await createPatient({
        ...form,
        age:             Number(form.age) || 35,
        bmi:             Number(form.bmi) || 25,
        waist_cm:        Number(form.waist_cm) || 88,
        systolic_bp:     Number(form.systolic_bp) || 120,
        total_cholesterol: Number(form.total_cholesterol) || 180,
        hdl_cholesterol: Number(form.hdl_cholesterol) || 50,
        last_visit_days: Number(form.last_visit_days) || 30,
      });
      setForm(BLANK);
      onCreated();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Nuevo paciente</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Identificación */}
          <Text style={styles.sectionLabel}>IDENTIFICACIÓN</Text>
          <Field label="ID del paciente *" value={form.id} onChangeText={v => set('id', v)} placeholder="p-001" />
          <Field label="Nombre completo *" value={form.name} onChangeText={v => set('name', v)} placeholder="Ana García" />

          {/* Tipo de sangre */}
          <Text style={styles.fieldLabel}>Tipo de sangre</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {BLOOD_TYPES.map(bt => (
              <Chip key={bt} label={bt} active={form.blood_type === bt} onPress={() => set('blood_type', bt)} />
            ))}
          </ScrollView>

          {/* Sexo */}
          <Text style={styles.fieldLabel}>Sexo</Text>
          <View style={styles.chipRow}>
            <Chip label="Masculino" active={form.sex === 'M'} onPress={() => set('sex', 'M')} />
            <Chip label="Femenino"  active={form.sex === 'F'} onPress={() => set('sex', 'F')} />
          </View>

          {/* Datos básicos */}
          <Text style={styles.sectionLabel}>DATOS CLÍNICOS</Text>
          <Field label="Edad (años)"                  value={String(form.age)}               onChangeText={v => set('age', v as any)}               keyboardType="numeric" />
          <Field label="IMC (kg/m²)"                  value={String(form.bmi)}               onChangeText={v => set('bmi', v as any)}               keyboardType="decimal-pad" />
          <Field label="Perímetro abdominal (cm)"     value={String(form.waist_cm)}          onChangeText={v => set('waist_cm', v as any)}          keyboardType="numeric" />
          <Field label="PA sistólica (mmHg)"          value={String(form.systolic_bp)}       onChangeText={v => set('systolic_bp', v as any)}       keyboardType="numeric" />
          <Field label="Colesterol total (mg/dL)"     value={String(form.total_cholesterol)} onChangeText={v => set('total_cholesterol', v as any)} keyboardType="numeric" />
          <Field label="HDL (mg/dL)"                  value={String(form.hdl_cholesterol)}   onChangeText={v => set('hdl_cholesterol', v as any)}   keyboardType="numeric" />
          <Field label="Días desde última visita"     value={String(form.last_visit_days)}   onChangeText={v => set('last_visit_days', v as any)}   keyboardType="numeric" />

          {/* Antecedente familiar DM */}
          <Text style={styles.fieldLabel}>Antecedente familiar de diabetes</Text>
          <View style={styles.chipRow}>
            {FAMILY_HISTORY_OPTIONS.map(o => (
              <Chip key={o.value} label={o.label} active={form.family_history_diabetes === o.value} onPress={() => set('family_history_diabetes', o.value)} />
            ))}
          </View>

          {/* Switches */}
          <Text style={styles.sectionLabel}>FACTORES</Text>
          <SwitchRow label="Donante de órganos"        value={form.organ_donor}            onValueChange={v => set('organ_donor', v)} />
          <SwitchRow label="Vacunación completa"        value={form.vaccination_complete}   onValueChange={v => set('vaccination_complete', v)} />
          <SwitchRow label="Fumador"                    value={form.smoker}                 onValueChange={v => set('smoker', v)} />
          <SwitchRow label="Físicamente activo"         value={form.physically_active}      onValueChange={v => set('physically_active', v)} />
          <SwitchRow label="Fruta/verdura diaria"       value={form.daily_fruit_veg}        onValueChange={v => set('daily_fruit_veg', v)} />
          <SwitchRow label="Medicación para TA"         value={form.bp_medication}          onValueChange={v => set('bp_medication', v)} />
          <SwitchRow label="Glucosa elevada previa"     value={form.history_high_glucose}   onValueChange={v => set('history_high_glucose', v)} />
          <SwitchRow label="Diabetes diagnosticada"     value={form.diabetes_diagnosed}     onValueChange={v => set('diabetes_diagnosed', v)} />

          <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving} activeOpacity={0.8}>
            {saving
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.saveBtnText}>Guardar paciente</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function PatientsScreen({ navigation }: any) {
  const [patients,    setPatients]    = useState<PatientSummary[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [showAdd,     setShowAdd]     = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listPatients();
      setPatients(data);
    } catch (e: any) {
      Alert.alert('Error de conexión', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SECMED</Text>
          <Text style={styles.title}>Pacientes</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Nuevo</Text>
          </TouchableOpacity>
          <SettingsButton />
        </View>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search} onChangeText={setSearch}
          placeholder={`Buscar entre ${patients.length} pacientes…`}
          placeholderTextColor={colors.inkSoft}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: colors.inkSoft, fontSize: 16, padding: 4 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={styles.emptyTitle}>
              {search ? 'Sin resultados' : 'Sin pacientes'}
            </Text>
            <Text style={styles.emptyBody}>
              {search ? 'Intenta con otro nombre o ID.' : 'Agrega tu primer paciente con el botón "+ Nuevo".'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, shadow.card]}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('PatientDetail', { patientId: item.id, patientName: item.name })}
          >
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{initials(item.name)}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardId}>{item.id}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      <AddPatientModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={load}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.md },
  headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow:        { fontSize: 10, color: colors.primary, letterSpacing: 2, marginBottom: 2, fontFamily: 'Courier' },
  title:          { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
  addBtn:         { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 9 },
  addBtnText:     { color: colors.white, fontSize: 13, fontWeight: '600' },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSoft, borderRadius: radius.md, marginHorizontal: spacing.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4, gap: 8 },
  searchIcon:     { fontSize: 15 },
  searchInput:    { flex: 1, fontSize: 15, color: colors.ink },
  // card
  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, gap: 12 },
  avatarWrap:     { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.bgSoft, borderWidth: 2, borderColor: colors.secondarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 16, fontWeight: '600', color: colors.secondary },
  cardInfo:       { flex: 1 },
  cardName:       { fontSize: 16, fontWeight: '600', color: colors.ink },
  cardId:         { fontSize: 11, color: colors.inkSoft, marginTop: 2, fontFamily: 'Courier' },
  chevron:        { fontSize: 22, color: colors.inkSoft, fontWeight: '300' },
  // empty
  empty:          { alignItems: 'center', paddingTop: spacing.xxl },
  emptyIcon:      { fontSize: 42, marginBottom: spacing.md },
  emptyTitle:     { fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  emptyBody:      { fontSize: 14, color: colors.inkSoft, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  // modal
  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalTitle:     { fontSize: 20, fontWeight: '700', color: colors.ink },
  modalClose:     { fontSize: 20, color: colors.inkSoft },
  modalBody:      { padding: spacing.lg, paddingBottom: 80 },
  sectionLabel:   { fontSize: 10, fontWeight: '600', color: colors.primary, letterSpacing: 1.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  fieldWrap:      { marginBottom: spacing.md },
  fieldLabel:     { fontSize: 13, fontWeight: '500', color: colors.inkSoft, marginBottom: 6 },
  fieldInput:     { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.ink, backgroundColor: colors.bgSoft },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  chipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:       { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  chipTextActive: { color: colors.white },
  switchRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  switchLabel:    { fontSize: 14, color: colors.ink, flex: 1 },
  saveBtn:        { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText:    { color: colors.white, fontSize: 16, fontWeight: '600' },
});