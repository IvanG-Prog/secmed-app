import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { useSession } from '../hooks/useSession';

// Nota: el backend de la demo no expone un endpoint para editar el perfil
// del médico (el registro es 100% local, ver utils/auth/localAuth.ts).
// Esta pantalla muestra los datos reales de la cuenta local; la edición
// queda deshabilitada con una nota explicativa en vez de simular un guardado
// que no persistiría realmente.

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        editable={false}
        placeholderTextColor={colors.inkSoft}
      />
    </View>
  );
}

export default function AccountSettingsScreen({ navigation }: any) {
  const { doctor, resetAccount } = useSession();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta de este dispositivo',
      'Esto borrará tu registro local (nombre, colegiatura, clave) de este dispositivo. No afecta los datos clínicos en el servidor. Tendrás que registrarte de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: resetAccount },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Configuración</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Datos profesionales</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card]}>
          <Field label="Nombre completo" value={doctor?.name ?? ''} />
          <Field label="Cédula profesional / colegiatura" value={doctor?.license ?? ''} />
          <Field label="Correo electrónico" value={doctor?.email ?? ''} />
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Estos datos se guardan únicamente en este dispositivo (no hay un servidor de
            perfiles aún). Para editarlos, elimina la cuenta local y regístrate de nuevo.
          </Text>
        </View>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
          <Text style={styles.dangerBtnText}>Eliminar cuenta de este dispositivo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  backText:       { fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 8 },
  headerTitle:    { fontSize: 21, fontWeight: '700', color: colors.ink },
  body:           { padding: spacing.md, paddingBottom: 80 },
  card:           { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  fieldLabel:     { fontSize: 12, fontWeight: '500', color: colors.inkSoft, marginBottom: 6 },
  input:          { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 14, color: colors.ink, backgroundColor: colors.bgSoft },
  noteBox:        { backgroundColor: colors.bgSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  noteText:       { fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  dangerBtn:      { alignItems: 'center', padding: 14, borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md },
  dangerBtnText:  { color: colors.danger, fontSize: 14, fontWeight: '600' },
});