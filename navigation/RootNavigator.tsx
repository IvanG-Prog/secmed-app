import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { colors } from '../theme/tokens';

import PatientsScreen      from '../screens/PatientsScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import ConsultationScreen  from '../screens/ConsultationScreen';
import AppointmentsScreen  from '../screens/AppointmentsScreen';
import DocumentsScreen     from '../screens/DocumentsScreen';
import PortalScreen        from '../screens/PortalScreen';

// 🔥 Auth
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// 🔥 Home
import HomeScreen from '../screens/HomeScreen';

// 🔥 Vademécum
import VademecumScreen from '../screens/VademecumScreen';
import VademecumDetailScreen from '../screens/VademecumDetailScreen';

// 🔥 Hook de sesión
import { useSession } from '../hooks/useSession';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;

  // Home
  Home: undefined;

  // Vademécum
  Vademecum: undefined;
  VademecumDetail: { ef: string };

  // Tabs
  Tabs: undefined;

  // Stacks sobre los tabs
  PatientDetail:  { patientId: string; patientName: string };
  Consultation:   { patientId: string; patientName: string };
  Documents:      { patientId?: string; patientName?: string };
  Portal:         undefined;
};

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function icon(name: string, focused: boolean) {
  const icons: Record<string, [string, string]> = {
    Pacientes: ['👤', '👤'],
    Agenda:    ['📅', '📅'],
    Docs:      ['📄', '📄'],
    Vademecum: ['💊', '💊'], // 🔥 icono para el vademécum
    Portal:    ['🔐', '🔐'],
  };
  const [active, inactive] = icons[name] ?? ['•', '•'];
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
      {focused ? active : inactive}
    </Text>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Pacientes"
        component={PatientsScreen}
        options={{ tabBarIcon: ({ focused }) => icon('Pacientes', focused) }}
      />
      <Tab.Screen
        name="Agenda"
        component={AppointmentsScreen}
        options={{ tabBarIcon: ({ focused }) => icon('Agenda', focused) }}
      />
      <Tab.Screen
        name="Docs"
        component={DocumentsScreen}
        options={{ tabBarLabel: 'Documentos', tabBarIcon: ({ focused }) => icon('Docs', focused) }}
      />
      <Tab.Screen
        name="Vademecum"
        component={VademecumScreen as React.ComponentType<any>}
        options={{ tabBarLabel: 'Vademécum', tabBarIcon: ({ focused }) => icon('Vademecum', focused) }}
      />
      <Tab.Screen
        name="Portal"
        component={PortalScreen}
        options={{ tabBarLabel: 'ZK Portal', tabBarIcon: ({ focused }) => icon('Portal', focused) }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  // 🔥 Deshabilitado: flujo de sesión
  // const session = useSession();
  // if (session === 'loading') return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* 🔥 FLUJO DE AUTENTICACIÓN — DESHABILITADO */}
      {/*
      {session === 'noDoctor' && (
        <Stack.Screen name="Register" component={RegisterScreen} />
      )}

      {session === 'login' && (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}

      {session === 'main' && (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Vademecum" component={VademecumScreen} />
          <Stack.Screen name="VademecumDetail" component={VademecumDetailScreen} />

          <Stack.Screen name="Tabs"          component={Tabs} />
          <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
          <Stack.Screen name="Consultation"  component={ConsultationScreen} />
          <Stack.Screen name="Documents"     component={DocumentsScreen} />
          <Stack.Screen name="Portal"        component={PortalScreen} />
        </>
      )}
      */}

      {/* 🔥 APP PRINCIPAL DIRECTA */}
      <Stack.Screen name="Tabs"          component={Tabs} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <Stack.Screen name="Consultation"  component={ConsultationScreen} />
      <Stack.Screen name="Documents"     component={DocumentsScreen} />
      <Stack.Screen name="Portal"        component={PortalScreen} />
      <Stack.Screen name="VademecumDetail" component={VademecumDetailScreen} />
    </Stack.Navigator>
  );
}
