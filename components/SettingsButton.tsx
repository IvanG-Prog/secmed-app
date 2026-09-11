// Botón de acceso a Configuración — esquina superior derecha.
// Se usa en el header de cada pantalla principal de los Tabs
// (Pacientes, Agenda, Documentos, Vadémecum, Portal) para no
// sobrecargar la tab bar inferior con un sexto ítem.
//
// Funciona como un avatar de cuenta: si el médico tiene foto, la muestra;
// si no, cae en sus iniciales (más personal que un ícono genérico de
// engranaje — comunica "esta es tu cuenta", no solo "ajustes").
import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { useSession } from '../hooks/useSession';

export function SettingsButton() {
  const navigation = useNavigation<any>();
  const { doctor } = useSession();

  // La demo no tiene todavía subida de foto de perfil (no hay endpoint
  // para eso); cuando exista, doctor.photoUrl alimentaría esto sin
  // tener que tocar este componente.
  const doctorPhotoUrl: string | null = (doctor as any)?.photoUrl ?? null;

  const initials = doctor?.name
    ? doctor.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : null;

  return (
    <TouchableOpacity
      style={styles.btn}
      activeOpacity={0.7}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      onPress={() => navigation.navigate('Settings')}
    >
      {doctorPhotoUrl ? (
        <Image source={{ uri: doctorPhotoUrl }} style={styles.icon} />
      ) : initials ? (
        <Text style={styles.fallback}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={17} color={colors.secondary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondarySoft,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
  fallback: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
});