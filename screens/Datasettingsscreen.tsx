import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { useSession } from '../hooks/useSession';

export default function DataSettingsScreen({ navigation }: any) {
  const { resetAccount } = useSession();

  const handleExport = () => {
    Alert.alert('Exportar datos', 'Funcionalidad de exportación pendiente en esta demo.');
  };

  const handleClear = () => {
    Alert.alert(
      'Borrar datos locales',
      'Esto eliminará tu registro local (cuenta, clave y preferencias) de este dispositivo. No afecta los datos clínicos en el servidor. Tendrás que registrarte de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: resetAccount },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Configuración</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis datos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.text}>
            Aquí puedes gestionar tus datos clínicos locales.{"\n\n"}
            - Exportar datos para respaldo{"\n"}
            - Revisar sincronización con servidor{"\n"}
            - Borrar almacenamiento local
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleExport}>
          <Text style={styles.primaryBtnText}>Exportar datos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.danger }]} activeOpacity={0.85} onPress={handleClear}>
          <Text style={styles.primaryBtnText}>Borrar datos locales</Text>
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
  card:           { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  text:           { fontSize: 14, color: colors.ink, lineHeight: 20 },
  primaryBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, padding: 15, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
