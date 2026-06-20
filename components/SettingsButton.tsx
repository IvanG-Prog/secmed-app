// Botón de acceso a Configuración — esquina superior derecha.
// Se usa en el header de cada pantalla principal de los Tabs
// (Pacientes, Agenda, Documentos, Vadémecum, Portal) para no
// sobrecargar la tab bar inferior con un sexto ítem.
import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/tokens';

export function SettingsButton() {
  const navigation = useNavigation<any>();

  const doctorPhotoUrl: string | null = null; //  URL de la foto real si existe

  return (
    <TouchableOpacity
      style={styles.btn}
      activeOpacity={0.7}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      onPress={() => navigation.navigate('Settings')}
    >
      {doctorPhotoUrl ? (
        <Image source={{ uri: doctorPhotoUrl }} style={styles.icon} />
      ) : (
        <Text style={styles.fallback}>👤</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  fallback: {
    fontSize: 20,
    color: colors.ink,
  },
});
