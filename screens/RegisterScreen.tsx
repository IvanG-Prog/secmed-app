import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { registerDoctor } from '../utils/auth/localAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegister() {
    try {
      await registerDoctor({ name, license, email, password });
      Alert.alert('Registro exitoso', 'Tu cuenta ha sido creada.');
      navigation.replace('Home');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Registro de Médico</Text>

      <TextInput
        placeholder="Nombre"
        value={name}
        onChangeText={setName}
        style={{ marginBottom: 10, borderWidth: 1, padding: 10 }}
      />

      <TextInput
        placeholder="Cédula / Licencia"
        value={license}
        onChangeText={setLicense}
        style={{ marginBottom: 10, borderWidth: 1, padding: 10 }}
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ marginBottom: 10, borderWidth: 1, padding: 10 }}
      />

      <TextInput
        placeholder="Clave"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ marginBottom: 20, borderWidth: 1, padding: 10 }}
      />

      <Button title="Crear cuenta" onPress={handleRegister} />

      <View style={{ marginTop: 20 }}>
        <Button title="Ya tengo cuenta" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  );
}
