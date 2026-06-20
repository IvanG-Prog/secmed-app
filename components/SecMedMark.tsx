// Marca oficial SecMed — réplica exacta del SVG del landing/web:
// círculo azul (#1D6FA5) con cruz teal (#2FA88E) al centro.
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme/tokens';

export function SecMedMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="46" fill="none" stroke={colors.primary} strokeWidth={3} />
      <Path d="M50 30 V70 M30 50 H70" stroke={colors.secondary} strokeWidth={6} strokeLinecap="round" />
    </Svg>
  );
}

export function SecMedWordmark({ markSize = 40, fontSize = 26 }: { markSize?: number; fontSize?: number }) {
  const { Text } = require('react-native');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <SecMedMark size={markSize} />
      <Text style={{ fontSize, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 }}>SecMed</Text>
    </View>
  );
}