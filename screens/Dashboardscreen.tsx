import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { useSession } from '../hooks/useSession';
import { getDashboardStats, DashboardStats } from '../utils/api';
import { SecMedMark } from '../components/SecMedMark';
import { SettingsButton } from '../components/SettingsButton';
import { TrendLineChart } from '../components/TrendLineChart';

// ── Novedades médicas — contenido editorial curado, no viene del backend ────
// El backend no tiene un endpoint de noticias/eventos. Esto es contenido de
// muestra realista (congresos, publicaciones, novedades regulatorias) hasta
// que exista una fuente real (feed propio o agregador médico) que conectar.
const NEWS = [
  {
    tag: 'Congreso',
    title: 'XXXI Congreso Latinoamericano de Medicina Interna',
    body: 'Bogotá, 14–17 de septiembre. Convoca a especialistas de toda la región para discutir manejo de enfermedades crónicas no transmisibles y nuevas guías de hipertensión.',
  },
  {
    tag: 'Publicación',
    title: 'OMS actualiza directrices sobre resistencia antimicrobiana',
    body: 'La organización publicó recomendaciones revisadas para el uso racional de antibióticos en atención primaria, con énfasis en infecciones respiratorias.',
  },
  {
    tag: 'Seminario',
    title: 'Seminario regional de telemedicina y protección de datos clínicos',
    body: 'Modalidad híbrida, organizado por la asociación médica regional. Aborda marcos regulatorios para historia clínica electrónica e interoperabilidad.',
  },
  {
    tag: 'Investigación',
    title: 'Nuevo consenso sobre tamizaje de diabetes tipo 2',
    body: 'Sociedades de endocrinología de la región actualizan los puntos de corte recomendados para tamizaje temprano en población con factores de riesgo.',
  },
];

const SOCIAL_LINKS = [
  { label: 'Sitio web',   url: 'https://secmed.example.com' },
  { label: 'LinkedIn',    url: 'https://linkedin.com/company/secmed' },
  { label: 'Instagram',   url: 'https://instagram.com/secmed' },
  { label: 'X / Twitter', url: 'https://x.com/secmed' },
];

function StatBlock({ value, label, loading }: { value: number; label: string; loading: boolean }) {
  return (
    <View style={styles.statBlock}>
      {loading
        ? <ActivityIndicator color={colors.primary} size="small" />
        : <Text style={styles.statValue}>{value}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function DashboardScreen({ navigation }: any) {
  const { doctor } = useSession();
  const [stats,      setStats]      = useState<DashboardStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setStats(await getDashboardStats()); }
    catch { /* el dashboard no debe romperse si el backend está caído; solo no muestra cifras */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const firstName = doctor?.name?.split(' ')[0] ?? '';

  const change = stats?.monthOverMonthChange ?? 0;
  const changeIsPositive = change >= 0;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Header degradado corporativo */}
        <LinearGradient
          colors={['#0C2438', '#15567F', '#1D6FA5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <SecMedMark size={30} />
            <View style={styles.avatarWrap}>
              <SettingsButton />
            </View>
          </View>
          <Text style={styles.greeting}>{getGreeting()}{firstName ? `, Dr(a). ${firstName}` : ''}</Text>
          <Text style={styles.subgreeting}>Panel clínico — SecMed</Text>
        </LinearGradient>

        {/* Panel de tendencia: gráfico + número grande con % de cambio */}
        <View style={[styles.trendCard, shadow.card]}>
          <View style={styles.trendHeader}>
            <View>
              <Text style={styles.trendLabel}>Consultas — últimos 6 meses</Text>
              <View style={styles.trendValueRow}>
                {loading
                  ? <ActivityIndicator color={colors.primary} />
                  : <Text style={styles.trendValue}>{stats?.monthlyTrend?.[stats.monthlyTrend.length - 1]?.count ?? 0}</Text>}
                {!loading && (
                  <View style={[styles.changeChip, { backgroundColor: changeIsPositive ? '#DCF0EA' : '#FEE2E2' }]}>
                    <Text style={[styles.changeChipText, { color: changeIsPositive ? '#1A7A5E' : '#991B1B' }]}>
                      {changeIsPositive ? '↑' : '↓'} {Math.abs(change)}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.trendSub}>vs. mes anterior</Text>
            </View>
          </View>
          {!loading && stats?.monthlyTrend && (
            <TrendLineChart data={stats.monthlyTrend} />
          )}
        </View>

        {/* Resumen clínico — sin iconos, tipográfico, sobrio */}
        <Text style={styles.sectionTitle}>Resumen clínico</Text>
        <View style={[styles.summaryCard, shadow.card]}>
          <StatBlock value={stats?.totalPatients ?? 0} label="Pacientes registrados" loading={loading} />
          <View style={styles.summaryDivider} />
          <StatBlock value={stats?.appointmentsToday ?? 0} label="Citas para hoy" loading={loading} />
          <View style={styles.summaryDivider} />
          <StatBlock value={stats?.documentsThisMonth ?? 0} label="Documentos este mes" loading={loading} />
        </View>

        {/* Acceso principal a la app clínica */}
        <TouchableOpacity
          style={styles.enterCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Tabs')}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.enterTitle}>Entrar a SecMed</Text>
            <Text style={styles.enterSub}>Pacientes, agenda, consulta y certificados ZK</Text>
          </View>
          <Text style={styles.enterArrow}>→</Text>
        </TouchableOpacity>
        <Text style={styles.enterHint}>Puedes volver aquí en cualquier momento con el botón atrás.</Text>

        {/* Novedades médicas */}
        <Text style={styles.sectionTitle}>Novedades del sector</Text>
        {NEWS.map((n, i) => (
          <View key={i} style={[styles.newsCard, shadow.card]}>
            <Text style={styles.newsTag}>{n.tag.toUpperCase()}</Text>
            <Text style={styles.newsTitle}>{n.title}</Text>
            <Text style={styles.newsBody}>{n.body}</Text>
          </View>
        ))}

        {/* Sobre SecMed */}
        <Text style={styles.sectionTitle}>Sobre SecMed</Text>
        <View style={[styles.aboutCard, shadow.card]}>
          <Text style={styles.aboutText}>
            SecMed combina inteligencia artificial clínica con criptografía de
            conocimiento cero (Zero-Knowledge) para que el médico trabaje más
            rápido sin exponer innecesariamente los datos del paciente. Cada
            expediente puede emitir certificados verificables — por ejemplo,
            tipo de sangre o fecha de última consulta — sin revelar el resto
            de la historia clínica.
          </Text>
        </View>

        {/* Redes sociales */}
        <Text style={styles.sectionTitle}>Síguenos</Text>
        <View style={styles.socialRow}>
          {SOCIAL_LINKS.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.socialBtn, shadow.card]}
              activeOpacity={0.8}
              onPress={() => Linking.openURL(s.url).catch(() => {})}
            >
              <Text style={styles.socialLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footerText}>SecMed · Versión demo</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },

  header:         { paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.xl, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  headerTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  avatarWrap:     { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20 },
  greeting:       { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  subgreeting:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

  trendCard:      { backgroundColor: colors.cardBg, borderRadius: radius.lg, marginHorizontal: spacing.md, marginTop: -28, padding: spacing.md },
  trendHeader:    { marginBottom: spacing.sm },
  trendLabel:     { fontSize: 12, color: colors.inkSoft, marginBottom: 4 },
  trendValueRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trendValue:     { fontSize: 30, fontWeight: '700', color: colors.ink, letterSpacing: -0.8 },
  changeChip:     { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  changeChipText: { fontSize: 12, fontWeight: '700' },
  trendSub:       { fontSize: 11, color: colors.inkSoft, marginTop: 2 },

  sectionTitle:   { fontSize: 15, fontWeight: '700', color: colors.ink, marginHorizontal: spacing.md, marginTop: spacing.xl, marginBottom: spacing.sm },

  summaryCard:    { flexDirection: 'row', backgroundColor: colors.cardBg, borderRadius: radius.lg, marginHorizontal: spacing.md, padding: spacing.md },
  statBlock:      { flex: 1, alignItems: 'center' },
  statValue:      { fontSize: 22, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
  statLabel:      { fontSize: 11, color: colors.inkSoft, marginTop: 4, textAlign: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.line, marginVertical: 2 },

  enterCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, marginHorizontal: spacing.md, marginTop: spacing.lg, padding: spacing.md, gap: 12 },
  enterTitle:     { fontSize: 17, fontWeight: '700', color: colors.white },
  enterSub:       { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  enterArrow:     { fontSize: 24, color: colors.white },
  enterHint:      { fontSize: 11.5, color: colors.inkSoft, textAlign: 'center', marginTop: 8, marginHorizontal: spacing.lg },

  newsCard:       { backgroundColor: colors.cardBg, borderRadius: radius.lg, marginHorizontal: spacing.md, padding: spacing.md, marginBottom: 10 },
  newsTag:        { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1, marginBottom: 6 },
  newsTitle:      { fontSize: 14.5, fontWeight: '600', color: colors.ink, marginBottom: 5, lineHeight: 20 },
  newsBody:       { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },

  aboutCard:      { backgroundColor: colors.cardBg, borderRadius: radius.lg, marginHorizontal: spacing.md, padding: spacing.md },
  aboutText:      { fontSize: 13, color: colors.inkSoft, lineHeight: 20 },

  socialRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: spacing.md },
  socialBtn:      { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.cardBg, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center' },
  socialLabel:    { fontSize: 12.5, color: colors.ink, fontWeight: '600' },

  footerText:     { textAlign: 'center', fontSize: 11.5, color: colors.inkSoft, marginTop: spacing.xl },
});