import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { useSession } from '../hooks/useSession';
import { getBiometricKind, BiometricKind } from '../utils/auth/localAuth';

function Row({ icon, label, sublabel, onPress, danger = false, rightText }: {
  icon: string; label: string; sublabel?: string; onPress: () => void;
  danger?: boolean; rightText?: string;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.rowIconWrap}>
        <Text style={styles.rowIcon}>{icon}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      {rightText && <Text style={styles.rowRightText}>{rightText}</Text>}
      <Text style={[styles.chevron, danger && { color: colors.danger }]}>›</Text>
    </TouchableOpacity>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

export default function SettingsScreen({ navigation }: any) {
  const { doctor, logout } = useSession();
  const [bioKind, setBioKind] = useState<BiometricKind>('none');

  useEffect(() => { getBiometricKind().then(setBioKind); }, []);

  const bioLabel = bioKind === 'face' ? 'Face ID' : bioKind === 'fingerprint' ? 'Huella' : 'No disponible';

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = (doctor?.name ?? '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Tarjeta de perfil */}
        <TouchableOpacity
          style={[styles.profileCard, shadow.card]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AccountSettings')}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '👤'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{doctor?.name ?? 'Médico'}</Text>
            <Text style={styles.profileEmail}>{doctor?.email}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <SectionLabel label="CUENTA" />
        <View style={[styles.group, shadow.card]}>
          <Row icon="🩺" label="Datos profesionales" sublabel="Nombre, colegiatura, correo"
            onPress={() => navigation.navigate('AccountSettings')} />
        </View>

        <SectionLabel label="SEGURIDAD" />
        <View style={[styles.group, shadow.card]}>
          <Row icon="🔒" label="Seguridad y acceso" sublabel={`Clave, ${bioLabel.toLowerCase()}`}
            onPress={() => navigation.navigate('SecuritySettings')} />
        </View>

        <SectionLabel label="PRIVACIDAD" />
        <View style={[styles.group, shadow.card]}>
          <Row icon="🛡️" label="Privacidad y certificados ZK" sublabel="Qué se comparte y cómo"
            onPress={() => navigation.navigate('PrivacySettings')} />
        </View>

        <SectionLabel label="DATOS" />
        <View style={[styles.group, shadow.card]}>
          <Row icon="🗄️" label="Mis datos" sublabel="Exportar, servidor, almacenamiento local"
            onPress={() => navigation.navigate('DataSettings')} />
        </View>

        <SectionLabel label="SESIÓN" />
        <View style={[styles.group, shadow.card]}>
          <Row icon="🚪" label="Cerrar sesión" onPress={handleLogout} danger />
        </View>

        <Text style={styles.versionText}>SecMed Mobile · Demo</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  backText:       { fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 8 },
  headerTitle:    { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  body:           { padding: spacing.md, paddingBottom: 80 },
  profileCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, gap: 12 },
  avatar:         { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bgSoft, borderWidth: 2, borderColor: colors.secondarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 18, fontWeight: '700', color: colors.secondary },
  profileName:    { fontSize: 16, fontWeight: '700', color: colors.ink },
  profileEmail:   { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  group:          { backgroundColor: colors.cardBg, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden' },
  row:            { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowIconWrap:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center' },
  rowIcon:        { fontSize: 16 },
  rowInfo:        { flex: 1 },
  rowLabel:       { fontSize: 14, fontWeight: '600', color: colors.ink },
  rowSublabel:    { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  rowRightText:   { fontSize: 13, color: colors.inkSoft, marginRight: 4 },
  chevron:        { fontSize: 20, color: colors.inkSoft },
  versionText:    { textAlign: 'center', fontSize: 12, color: colors.inkSoft, marginTop: spacing.md },
});