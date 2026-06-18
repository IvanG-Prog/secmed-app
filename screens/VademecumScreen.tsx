import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { searchVademecum } from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';

export default function VademecumScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text?: string) => {
    const q = text !== undefined ? text : query;
    if (q.length > 2) {
      setLoading(true);
      try {
        const data = await searchVademecum(q);
        setResults(data.products);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      setResults([]);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerName}>Vadémecum</Text>
        <Text style={styles.headerId}>Medicamentos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card]}>
          <TextInput
            placeholder="Buscar medicamento..."
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              handleSearch(text);
            }}
            style={styles.input}
            placeholderTextColor={colors.inkSoft}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch()}>
            <Text style={styles.searchText}>Buscar</Text>
          </TouchableOpacity>

          {loading && (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          )}

          <FlatList
            data={results}
            keyExtractor={(item) => item.ef}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('VademecumDetail', { ef: item.ef })}
                style={styles.resultCard}
              >
                <Text style={styles.resultName}>{item.nombre}</Text>
                <Text style={styles.resultSub}>{item.principio_activo}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  header:      { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerName:  { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  headerId:    { fontFamily: 'Courier', fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  body:        { padding: spacing.md, paddingBottom: 80 },
  card:        { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  input:       { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 14, color: colors.ink, marginBottom: spacing.sm },
  searchBtn:   { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginBottom: spacing.md },
  searchText:  { color: colors.white, fontWeight: '600', fontSize: 14 },
  resultCard:  { backgroundColor: colors.bgSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  resultName:  { fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  resultSub:   { fontSize: 13, color: colors.inkSoft },
});
