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

export type RootStackParamList = {
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
        name="Portal"
        component={PortalScreen}
        options={{ tabBarLabel: 'ZK Portal', tabBarIcon: ({ focused }) => icon('Portal', focused) }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs"          component={Tabs} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <Stack.Screen name="Consultation"  component={ConsultationScreen} />
      <Stack.Screen name="Documents"     component={DocumentsScreen} />
      <Stack.Screen name="Portal"        component={PortalScreen} />
    </Stack.Navigator>
  );
}