import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, radius } from '../theme/tokens';
import { SecMedMark } from '../components/SecMedMark';
import { useSession } from '../hooks/useSession';
import { getBiometricKind, getStoredDoctor, isBiometricEnabled, BiometricKind } from '../utils/auth/localAuth';

const BIOMETRIC_LABEL: Record<BiometricKind, string> = {
  face:        'Entrar con Face ID',
  fingerprint: 'Entrar con huella',
  none:        '',
};
const BIOMETRIC_ICON: Record<BiometricKind, string> = {
  face: '🙂', fingerprint: '🫆', none: '',
};

export default function LoginScreen({ navigation }: any) {
  const { login, loginBiometric } = useSession();

  const [password,  setPassword]  = useState('');
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioKind,   setBioKind]   = useState<BiometricKind>('none');

  useEffect(() => {
    getStoredDoctor().then(d => setDoctorName(d?.name ?? null));
    (async () => {
      const [kind, enabled] = await Promise.all([getBiometricKind(), isBiometricEnabled()]);
      setBioKind(enabled ? kind : 'none');
    })();
  }, []);

  const handlePasswordLogin = async () => {
    if (!password) { Alert.alert('Ingresa tu clave'); return; }
    setLoading(true);
    try {
      await login(password);
      // La navegación al stack autenticado ocurre automáticamente:
      // RootNavigator observa useSession().status y cambia de stack.
    } catch (e: any) {
      Alert.alert('No se pudo iniciar sesión', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBioLoading(true);
    try {
      await loginBiometric();
    } catch (e: any) {
      Alert.alert('Verificación fallida', e.message);
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <SecMedMark size={56} />
        <Text style={styles.title}>Bienvenido de nuevo</Text>
        {doctorName && <Text style={styles.subtitle}>{doctorName}</Text>}
      </View>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>Clave</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.inkSoft}
          secureTextEntry
          autoCapitalize="none"
          onSubmitEditing={handlePasswordLogin}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={handlePasswordLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.primaryBtnText}>Entrar</Text>}
        </TouchableOpacity>

        {bioKind !== 'none' && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerLabel}>o</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.bioBtn}
              activeOpacity={0.8}
              onPress={handleBiometricLogin}
              disabled={bioLoading}
            >
              {bioLoading
                ? <ActivityIndicator color={colors.primary} />
                : (
                  <>
                    <Text style={styles.bioIcon}>{BIOMETRIC_ICON[bioKind]}</Text>
                    <Text style={styles.bioBtnText}>{BIOMETRIC_LABEL[bioKind]}</Text>
                  </>
                )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  backBtn:        { marginTop: 56, marginBottom: spacing.md },
  backText:       { fontSize: 14, fontWeight: '500', color: colors.primary },
  hero:           { alignItems: 'center', marginBottom: spacing.xxl },
  title:          { fontSize: 22, fontWeight: '700', color: colors.ink, marginTop: spacing.md },
  subtitle:       { fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  form:           { gap: spacing.sm },
  fieldLabel:     { fontSize: 13, fontWeight: '500', color: colors.inkSoft, marginBottom: 6 },
  input:          { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 14, fontSize: 16, color: colors.ink, backgroundColor: colors.bgSoft, marginBottom: spacing.md },
  primaryBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  divider:        { flex: 1, height: 1, backgroundColor: colors.line },
  dividerLabel:   { fontSize: 12, color: colors.inkSoft },
  bioBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 14 },
  bioIcon:        { fontSize: 20 },
  bioBtnText:     { color: colors.primary, fontSize: 15, fontWeight: '600' },
});