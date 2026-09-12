import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchVademecum, DrugProduct, DrugMonograph } from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';
import { SettingsButton } from '../components/SettingsButton';
import { HomeLogo } from '../components/HomeLogo';

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function VademecumScreen({ navigation, route }: any) {
  // Cuando se navega desde Consulta con un texto precargado (ej. nombre de fármaco
  // detectado en el plan), lo usamos como búsqueda inicial.
  const initialQuery = route?.params?.initialQuery ?? '';

  const [query,      setQuery]      = useState(initialQuery);
  const debouncedQuery = useDebounced(query, 350);
  const [products,   setProducts]   = useState<DrugProduct[]>([]);
  const [monographs, setMonographs] = useState<DrugMonograph[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);

  React.useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setProducts([]); setMonographs([]); setSearched(false);
      return;
    }
    setLoading(true);
    searchVademecum(q)
      .then(res => { setProducts(res.products); setMonographs(res.monographs); setSearched(true); })
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const hasResults = products.length > 0 || monographs.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <HomeLogo size={14} />
          <Text style={styles.eyebrow}>SECMED</Text>
        </View>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Vadémecum</Text>
          <SettingsButton />
        </View>
        <Text style={styles.subtitle}>Productos farmacéuticos y monografías clínicas</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={15} color={colors.inkSoft} />
        <TextInput
          style={styles.searchInput}
          value={query} onChangeText={setQuery}
          placeholder="Buscar por nombre comercial o principio activo…"
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="none"
          autoFocus={!!initialQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close" size={16} color={colors.inkSoft} style={{ padding: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

      {!loading && query.trim().length >= 2 && !hasResults && searched && (
        <View style={styles.empty}>
          <Ionicons name="medical-outline" size={40} color={colors.inkSoft} style={{ marginBottom: spacing.md }} />
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyBody}>No se encontró "{query}" en el vadémecum.</Text>
        </View>
      )}

      {!loading && query.trim().length < 2 && (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={40} color={colors.inkSoft} style={{ marginBottom: spacing.md }} />
          <Text style={styles.emptyTitle}>Busca un medicamento</Text>
          <Text style={styles.emptyBody}>Escribe al menos 2 letras del nombre comercial o principio activo.</Text>
        </View>
      )}

      {!loading && hasResults && (
        <FlatList
          data={[
            ...(monographs.length > 0 ? [{ type: 'header' as const, label: 'Monografías (DCI)' }] : []),
            ...monographs.map(m => ({ type: 'monograph' as const, data: m })),
            ...(products.length > 0 ? [{ type: 'header' as const, label: 'Productos comerciales' }] : []),
            ...products.map(p => ({ type: 'product' as const, data: p })),
          ]}
          keyExtractor={(item, i) =>
            item.type === 'header' ? `h-${i}` :
            item.type === 'monograph' ? `m-${item.data.id}` : `p-${item.data.ef}`
          }
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionLabel}>{item.label}</Text>;
            }
            if (item.type === 'monograph') {
              const m = item.data;
              return (
                <TouchableOpacity
                  style={[styles.card, shadow.card]} activeOpacity={0.82}
                  onPress={() => navigation.navigate('VademecumDetail', { monographId: m.id, dci: m.dci })}
                >
                  <View style={styles.cardIconWrap}><Ionicons name="flask-outline" size={19} color={colors.secondary} /></View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{m.dci}</Text>
                    <Text style={styles.cardSub}>{m.atc ? `ATC ${m.atc}` : 'Monografía clínica'}{m.via ? ` · ${m.via}` : ''}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            }
            const p = item.data;
            return (
              <TouchableOpacity
                style={[styles.card, shadow.card, !p.is_active && styles.cardInactive]} activeOpacity={0.82}
                onPress={() => navigation.navigate('VademecumDetail', { ef: p.ef, productName: p.nombre })}
              >
                <View style={[styles.cardIconWrap, { backgroundColor: colors.bgSoft }]}><Ionicons name="medical-outline" size={19} color={colors.primary} /></View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{p.nombre}</Text>
                  <Text style={styles.cardSub}>{p.principio_activo}</Text>
                  {!p.is_active && <Text style={styles.inactiveTag}>Registro no vigente</Text>}
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow:        { fontSize: 10, color: colors.primary, letterSpacing: 2, fontFamily: 'Courier' },
  eyebrowRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title:          { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
  subtitle:       { fontSize: 13, color: colors.inkSoft, marginTop: 3 },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSoft, borderRadius: radius.md, marginHorizontal: spacing.md, marginTop: spacing.md, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchIcon:     { fontSize: 15 },
  searchInput:    { flex: 1, fontSize: 15, color: colors.ink },
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, marginTop: spacing.md, marginBottom: spacing.sm },
  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, gap: 12 },
  cardInactive:   { opacity: 0.6 },
  cardIconWrap:   { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.secondarySoft, alignItems: 'center', justifyContent: 'center' },
  cardIcon:       { fontSize: 18 },
  cardInfo:       { flex: 1 },
  cardName:       { fontSize: 15, fontWeight: '600', color: colors.ink },
  cardSub:        { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  inactiveTag:    { fontSize: 10, color: colors.danger, marginTop: 3, fontWeight: '500' },
  chevron:        { fontSize: 22, color: colors.inkSoft },
  empty:          { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyIcon:      { fontSize: 40, marginBottom: spacing.md },
  emptyTitle:     { fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  emptyBody:      { fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
});