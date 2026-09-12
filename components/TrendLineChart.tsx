// Gráfico de línea liviano hecho con react-native-svg directamente — evita
// sumar una librería de gráficos completa (chart-kit, victory, etc.) solo
// para una tendencia de 6 puntos.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Point = { label: string; count: number };

export function TrendLineChart({ data, height = 110 }: { data: Point[]; height?: number }) {
  if (data.length === 0) return null;

  const width   = 280;
  const padX    = 14;
  const padY    = 16;
  const max     = Math.max(...data.map(d => d.count), 1);
  const stepX   = (width - padX * 2) / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - d.count / max) * (height - padY * 2);
    return { x, y, ...d };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Línea base */}
        <Line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke={colors.line} strokeWidth={1} />

        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5}
            fill={i === points.length - 1 ? colors.secondary : colors.primary} />
        ))}
      </Svg>

      {/* Etiquetas de mes debajo del SVG, en RN puro para mejor legibilidad */}
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.label, i === data.length - 1 && styles.labelActive]}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelsRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  label:       { fontSize: 10, color: colors.inkSoft, textTransform: 'capitalize' },
  labelActive: { color: colors.primary, fontWeight: '700' },
});