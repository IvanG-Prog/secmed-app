import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image,
} from 'react-native';
import { colors, spacing, radius } from '../theme/tokens';
import { SecMedMark } from '../components/SecMedMark';
import { useSession } from '../hooks/useSession';

export default function HomeScreen({ navigation }: any) {
  const { status, hasRegistered } = useSession();

  // Mientras useSession resuelve el bootstrap inicial (lectura de SecureStore),
  // mostramos un loader breve en vez de parpadear entre pantallas.
  if (status === 'loading') {
    return (
      <View style={styles.loaderContainer}>
        <SecMedMark size={72} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SecMedMark size={88} />
        <Text style={styles.title}>SecMed</Text>
        <Text style={styles.subtitle}>
          Historia clínica asistida por IA{'\n'}con privacidad verificable
        </Text>
      </View>

      <View style={styles.footer}>
        {hasRegistered ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.primaryBtnText}>Crear cuenta de médico</Text>
            </TouchableOpacity>
            <Text style={styles.footnote}>
              Tu cuenta y tu clave se guardan cifradas en este dispositivo.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between' },
  loaderContainer: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  hero:            { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  title:           { fontSize: 34, fontWeight: '700', color: colors.ink, letterSpacing: -0.8, marginTop: spacing.lg },
  subtitle:        { fontSize: 15, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  footer:          { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  primaryBtn:      { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText:  { color: colors.white, fontSize: 16, fontWeight: '600' },
  ghostBtn:        { alignItems: 'center', paddingVertical: 14 },
  ghostBtnText:    { color: colors.inkSoft, fontSize: 13, fontWeight: '500' },
  footnote:        { textAlign: 'center', fontSize: 12, color: colors.inkSoft, marginTop: spacing.md, lineHeight: 18 },
});