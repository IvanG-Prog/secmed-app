import React from 'react';
import { View, Text, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { logout } from '../utils/auth/localAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, marginBottom: 30 }}>SecMed</Text>

      <Button title="Pacientes" onPress={() => navigation.navigate('Tabs')} />
      <View style={{ height: 10 }} />

      <Button title="Vadémecum" onPress={() => navigation.navigate('Vademecum')} />
      <View style={{ height: 10 }} />

      <Button title="Cerrar sesión" onPress={async () => {
        await logout();
        navigation.replace('Login');
      }} />
    </View>
  );
}
