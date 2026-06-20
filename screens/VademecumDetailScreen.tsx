import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import {
  getVademecumProduct, getVademecumMonograph,
  ProductDetail, DrugMonograph,
} from '../utils/api';
import { colors, spacing, radius, shadow } from '../theme/tokens';

function Block({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.blockLabel}>{label}</Text>
      <Text style={styles.blockText}>{value}</Text>
    </View>
  );
}

function MonographView({ m }: { m: DrugMonograph }) {
  return (
    <>
      <View style={styles.headerCard}>
        <Text style={styles.dciName}>{m.dci}</Text>
        <View style={styles.tagRow}>
          {m.atc && <Text style={styles.tag}>ATC {m.atc}</Text>}
          {m.via && <Text style={styles.tag}>{m.via}</Text>}
        </View>
        {m.fecha_actualizacion && (
          <Text style={styles.updatedAt}>Actualizado: {m.fecha_actualizacion}</Text>
        )}
      </View>

      <Block label="Indicaciones"          value={m.indicaciones} />
      <Block label="Posología"             value={m.posologia} />
      <Block label="Contraindicaciones"    value={m.contraindicaciones} />
      <Block label="Interacciones"         value={m.interacciones} />
      <Block label="Advertencias"          value={m.advertencias} />
      <Block label="Embarazo y lactancia"  value={m.embarazo} />
      <Block label="Reacciones adversas"   value={m.reacciones} />
      <Block label="Sobredosis"            value={m.sobredosis} />

      {m.source_url && (
        <View style={styles.sourceBox}>
          <Text style={styles.sourceLabel}>Fuente</Text>
          <Text style={styles.sourceUrl} selectable numberOfLines={1}>{m.source_url}</Text>
        </View>
      )}
    </>
  );
}

export default function VademecumDetailScreen({ route, navigation }: any) {
  const { ef, monographId, productName, dci } = route.params ?? {};

  const [loading,  setLoading]  = useState(true);
  const [product,  setProduct]  = useState<ProductDetail | null>(null);
  const [monograph, setMonograph] = useState<DrugMonograph | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (ef) {
          setProduct(await getVademecumProduct(ef));
        } else if (monographId) {
          setMonograph(await getVademecumMonograph(monographId));
        }
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [ef, monographId]);

  const title = product?.product.nombre ?? monograph?.dci ?? productName ?? dci ?? 'Detalle';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Vadémecum</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {product && (
            <>
              <View style={[styles.headerCard, shadow.card]}>
                <Text style={styles.dciName}>{product.product.nombre}</Text>
                <Text style={styles.principioActivo}>{product.product.principio_activo}</Text>
                <View style={styles.tagRow}>
                  {product.product.is_active
                    ? <Text style={[styles.tag, styles.tagActive]}>Vigente</Text>
                    : <Text style={[styles.tag, styles.tagInactive]}>No vigente</Text>}
                  {product.product.representante && <Text style={styles.tag}>{product.product.representante}</Text>}
                </View>
                {product.product.fecha_vigencia && (
                  <Text style={styles.updatedAt}>Vigencia: {product.product.fecha_vigencia}</Text>
                )}
              </View>

              {product.monograph
                ? (
                  <>
                    <Text style={styles.sectionTitle}>Monografía — {product.monograph.dci}</Text>
                    <Block label="Indicaciones"          value={product.monograph.indicaciones} />
                    <Block label="Posología"             value={product.monograph.posologia} />
                    <Block label="Contraindicaciones"    value={product.monograph.contraindicaciones} />
                    <Block label="Interacciones"         value={product.monograph.interacciones} />
                    <Block label="Advertencias"          value={product.monograph.advertencias} />
                    <Block label="Embarazo y lactancia"  value={product.monograph.embarazo} />
                    <Block label="Reacciones adversas"   value={product.monograph.reacciones} />
                    <Block label="Sobredosis"            value={product.monograph.sobredosis} />
                  </>
                )
                : (
                  <View style={[styles.headerCard, { backgroundColor: colors.bgSoft }]}>
                    <Text style={styles.noMonoText}>
                      No hay monografía clínica detallada para este producto en la base de datos.
                    </Text>
                  </View>
                )}
            </>
          )}

          {monograph && <MonographView m={monograph} />}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  backText:         { fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 8 },
  headerTitle:      { fontSize: 19, fontWeight: '700', color: colors.ink },
  body:             { padding: spacing.md, paddingBottom: 80 },
  headerCard:       { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  dciName:          { fontSize: 19, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  principioActivo:  { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.sm },
  tagRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  tag:              { fontSize: 11, fontWeight: '600', color: colors.primary, backgroundColor: colors.bgSoft, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  tagActive:        { color: '#1A7A5E', backgroundColor: '#DCF0EA' },
  tagInactive:      { color: colors.danger, backgroundColor: colors.dangerSoft },
  updatedAt:        { fontSize: 11, color: colors.inkSoft, marginTop: 4 },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: spacing.sm, marginBottom: spacing.sm },
  block:            { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  blockLabel:       { fontSize: 10, fontWeight: '700', color: colors.secondary, letterSpacing: 1.2, marginBottom: 6 },
  blockText:        { fontSize: 14, color: colors.ink, lineHeight: 21 },
  noMonoText:       { fontSize: 13, color: colors.inkSoft, lineHeight: 19, textAlign: 'center' },
  sourceBox:        { padding: spacing.md, marginTop: spacing.sm },
  sourceLabel:      { fontSize: 11, color: colors.inkSoft, marginBottom: 3 },
  sourceUrl:        { fontSize: 11, color: colors.primary, fontFamily: 'Courier' },
});