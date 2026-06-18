import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getVademecumProduct } from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'VademecumDetail'>;

export default function VademecumDetailScreen({ route }: Props) {
  const { ef } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getVademecumProduct(ef);
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [ef]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>No se encontró información</Text>
      </View>
    );
  }

  const { product, monograph } = data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.body}>
      <View style={[styles.card, shadow.card]}>
        <Text style={styles.title}>{product.nombre}</Text>
        <Text style={styles.subtitle}>{product.principio_activo}</Text>
      </View>

      {monograph && (
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.section}>Indicaciones</Text>
          <Text style={styles.text}>{monograph.indicaciones || 'N/A'}</Text>

          <Text style={styles.section}>Posología</Text>
          <Text style={styles.text}>{monograph.posologia || 'N/A'}</Text>

          <Text style={styles.section}>Contraindicaciones</Text>
          <Text style={styles.text}>{monograph.contraindicaciones || 'N/A'}</Text>

          <Text style={styles.section}>Interacciones</Text>
          <Text style={styles.text}>{monograph.interacciones || 'N/A'}</Text>

          <Text style={styles.section}>Advertencias</Text>
          <Text style={styles.text}>{monograph.advertencias || 'N/A'}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  loader:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  errorText:   { fontSize: 14, color: colors.danger },
  body:        { padding: spacing.md, paddingBottom: 80 },
  card:        { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  title:       { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  subtitle:    { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md },
  section:     { fontSize: 15, fontWeight: '600', color: colors.ink, marginTop: spacing.sm, marginBottom: 4 },
  text:        { fontSize: 13, color: colors.inkSoft, marginBottom: spacing.sm },
});
