import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { HomeLogo } from '../components/HomeLogo';

export default function PrivacySettingsScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Configuración</Text>
          </TouchableOpacity>
          <HomeLogo size={22} />
        </View>
        <Text style={styles.headerTitle}>Privacidad y certificados ZK</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.text}>
            SecMed utiliza un modelo de privacidad basado en **Zero-Knowledge Proofs (ZK)**. 
            Esto significa que puedes demostrar la validez de tus certificados clínicos sin 
            revelar información sensible.{"\n\n"}
            Desde aquí puedes acceder al portal de atestación para ver y compartir tus certificados.
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Portal')}>
          <Text style={styles.primaryBtnText}>Ir al Portal ZK</Text>
        </TouchableOpacity>
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
  card:           { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  text:           { fontSize: 14, color: colors.ink, lineHeight: 20 },
  primaryBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, padding: 15, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
