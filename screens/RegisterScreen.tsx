import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, radius } from '../theme/tokens';
import { SecMedMark } from '../components/SecMedMark';
import { useSession } from '../hooks/useSession';

function Field({ label, value, onChangeText, placeholder, secure = false, keyboardType = 'default', autoCapitalize = 'sentences' }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; secure?: boolean; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={colors.inkSoft}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

export default function RegisterScreen({ navigation }: any) {
  const { register } = useSession();

  const [name,      setName]     = useState('');
  const [license,   setLicense]  = useState('');
  const [email,     setEmail]    = useState('');
  const [password,  setPassword] = useState('');
  const [confirm,   setConfirm]  = useState('');
  const [loading,   setLoading]  = useState(false);

  const submit = async () => {
    if (!name.trim() || !license.trim() || !email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Completa todos los campos para continuar.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Clave muy corta', 'Usa al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Las claves no coinciden', 'Verifica que ambas claves sean iguales.');
      return;
    }
    setLoading(true);
    try {
      await register({ name: name.trim(), license: license.trim(), email: email.trim(), password });
      // El cambio de stack (a Tabs) ocurre solo, vía useSession().status en RootNavigator.
    } catch (e: any) {
      Alert.alert('No se pudo registrar', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <SecMedMark size={52} />
          <Text style={styles.title}>Crear cuenta de médico</Text>
          <Text style={styles.subtitle}>Tus datos se guardan cifrados en este dispositivo</Text>
        </View>

        <Field label="Nombre completo *" value={name} onChangeText={setName} placeholder="Dra. Ana García" />
        <Field label="Cédula profesional / colegiatura *" value={license} onChangeText={setLicense} placeholder="MPPS-12345" autoCapitalize="characters" />
        <Field label="Correo electrónico *" value={email} onChangeText={setEmail} placeholder="ana.garcia@clinica.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Clave * (mínimo 6 caracteres)" value={password} onChangeText={setPassword} placeholder="••••••••" secure />
        <Field label="Confirmar clave *" value={confirm} onChangeText={setConfirm} placeholder="••••••••" secure />

        <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.primaryBtnText}>Crear cuenta</Text>}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Después de crear tu cuenta podrás activar el acceso con huella o Face ID desde la pantalla de inicio de sesión.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  backBtn:        { marginTop: 56, marginBottom: spacing.sm },
  backText:       { fontSize: 14, fontWeight: '500', color: colors.primary },
  scroll:         { paddingBottom: spacing.xxl },
  hero:           { alignItems: 'center', marginBottom: spacing.xl },
  title:          { fontSize: 21, fontWeight: '700', color: colors.ink, marginTop: spacing.md, textAlign: 'center' },
  subtitle:       { fontSize: 13, color: colors.inkSoft, marginTop: 4, textAlign: 'center' },
  fieldLabel:     { fontSize: 13, fontWeight: '500', color: colors.inkSoft, marginBottom: 6 },
  input:          { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.ink, backgroundColor: colors.bgSoft },
  primaryBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  footnote:       { fontSize: 12, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
});