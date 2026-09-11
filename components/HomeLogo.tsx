// Logo pequeño y clicable para el header de cada pantalla — lleva al
// Dashboard (inicio) sin importar desde qué punto de la navegación se
// toque (tab o pantalla apilada encima de los tabs).
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SecMedMark } from './SecMedMark';

export function HomeLogo({ size = 28 }: { size?: number }) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Dashboard')}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Ir al inicio"
    >
      <SecMedMark size={size} />
    </TouchableOpacity>
  );
}
