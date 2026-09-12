import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import {
  changePassword, getBiometricKind, isBiometricEnabled, setBiometricEnabled,
  BiometricKind,
} from '../utils/auth/localAuth';
import { HomeLogo } from '../components/HomeLogo';

const BIOMETRIC_LABEL: Record<BiometricKind, string> = {
  face: 'Face ID', fingerprint: 'Huella digital', none: 'No disponible en este dispositivo',
};

function Field({ label, value, onChangeText, placeholder }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={colors.inkSoft}
        secureTextEntry autoCapitalize="none"
      />
    </View>
  );
}

export default function SecuritySettingsScreen({ navigation }: any) {
  const [bioKind,      setBioKind]      = useState<BiometricKind>('none');
  const [bioEnabled,   setBioEnabled]   = useState(false);
  const [bioLoading,   setBioLoading]   = useState(false);

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    Promise.all([getBiometricKind(), isBiometricEnabled()]).then(([kind, enabled]) => {
      setBioKind(kind);
      setBioEnabled(enabled);
    });
  }, []);

  const toggleBiometric = async (value: boolean) => {
    setBioLoading(true);
    try {
      await setBiometricEnabled(value);
      setBioEnabled(value);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBioLoading(false);
    }
  };

  const submitPasswordChange = async () => {
    if (!current || !next || !confirm) { Alert.alert('Completa todos los campos'); return; }
    if (next.length < 6) { Alert.alert('Clave muy corta', 'Usa al menos 6 caracteres.'); return; }
    if (next !== confirm) { Alert.alert('Las claves no coinciden'); return; }
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      Alert.alert('Clave actualizada', 'Tu clave se cambió correctamente.');
    } catch (e: any) {
      Alert.alert('No se pudo cambiar la clave', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Configuración</Text>
          </TouchableOpacity>
          <HomeLogo size={22} />
        </View>
        <Text style={styles.headerTitle}>Seguridad y acceso</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Biometría */}
        <Text style={styles.sectionLabel}>ACCESO BIOMÉTRICO</Text>
        <View style={[styles.card, shadow.card]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{BIOMETRIC_LABEL[bioKind]}</Text>
              <Text style={styles.switchSub}>
                {bioKind === 'none'
                  ? 'Configura huella o Face ID en los ajustes de tu teléfono primero.'
                  : 'Permite entrar a SecMed sin escribir tu clave cada vez.'}
              </Text>
            </View>
            {bioLoading
              ? <ActivityIndicator color={colors.primary} />
              : (
                <Switch
                  value={bioEnabled}
                  onValueChange={toggleBiometric}
                  disabled={bioKind === 'none'}
                  trackColor={{ true: colors.primary }}
                  thumbColor={colors.white}
                />
              )}
          </View>
        </View>

        {/* Cambio de clave */}
        <Text style={styles.sectionLabel}>CAMBIAR CLAVE</Text>
        <View style={[styles.card, shadow.card]}>
          <Field label="Clave actual" value={current} onChangeText={setCurrent} placeholder="••••••••" />
          <Field label="Nueva clave (mínimo 6 caracteres)" value={next} onChangeText={setNext} placeholder="••••••••" />
          <Field label="Confirmar nueva clave" value={confirm} onChangeText={setConfirm} placeholder="••••••••" />

          <TouchableOpacity style={styles.primaryBtn} onPress={submitPasswordChange} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.primaryBtnText}>Actualizar clave</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>
          Tu clave se almacena cifrada (hash SHA-256) y nunca se transmite en texto plano fuera de este dispositivo.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  backText:       { fontSize: 14, fontWeight: '500', color: colors.primary },
  backRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle:    { fontSize: 21, fontWeight: '700', color: colors.ink },
  body:           { padding: spacing.md, paddingBottom: 80 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  card:           { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  switchRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel:    { fontSize: 14, fontWeight: '600', color: colors.ink },
  switchSub:      { fontSize: 12, color: colors.inkSoft, marginTop: 3, lineHeight: 17 },
  fieldLabel:     { fontSize: 12, fontWeight: '500', color: colors.inkSoft, marginBottom: 6 },
  input:          { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 14, color: colors.ink, backgroundColor: colors.bgSoft },
  primaryBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, padding: 15, alignItems: 'center', marginTop: spacing.sm },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  footnote:       { fontSize: 12, color: colors.inkSoft, textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.md },
});