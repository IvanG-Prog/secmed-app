import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

import {
  loginWithPassword,
  loginWithBiometrics,
  getBiometricKind,
} from '../utils/auth/localAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [biometricKind, setBiometricKind] =
    useState<'face' | 'fingerprint' | 'none'>('none');

  useEffect(() => {
    getBiometricKind().then(setBiometricKind);
  }, []);

  async function handleLogin() {
    try {
      await loginWithPassword(password);
      navigation.replace('Tabs');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleBiometric() {
    try {
      await loginWithBiometrics();
      navigation.replace('Tabs');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Iniciar Sesión</Text>

      <TextInput
        placeholder="Clave"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ marginBottom: 20, borderWidth: 1, padding: 10 }}
      />

      <Button title="Ingresar" onPress={handleLogin} />

      {biometricKind !== 'none' && (
        <View style={{ marginTop: 20 }}>
          <Button
            title={
              biometricKind === 'face'
                ? 'Ingresar con Face ID'
                : 'Ingresar con Huella'
            }
            onPress={handleBiometric}
          />
        </View>
      )}

      <View style={{ marginTop: 20 }}>
        <Button title="Crear cuenta" onPress={() => navigation.navigate('Register')} />
      </View>
    </View>
  );
}
