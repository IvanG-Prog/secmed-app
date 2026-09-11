import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { useSession } from '../hooks/useSession';

// Auth
import HomeScreen     from '../screens/HomeScreen';
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// App
import DashboardScreen from '../screens/Dashboardscreen';
import PatientsScreen        from '../screens/PatientsScreen';
import PatientDetailScreen   from '../screens/PatientDetailScreen';
import ConsultationScreen from '../screens/Consultationscreen';
import AppointmentsScreen    from '../screens/AppointmentsScreen';
import DocumentsScreen       from '../screens/DocumentsScreen';
import PortalScreen          from '../screens/PortalScreen';
import VademecumScreen       from '../screens/VademecumScreen';
import VademecumDetailScreen from '../screens/VademecumDetailScreen';
import SettingsScreen from '../screens/Settingsscreen';
import AccountSettingsScreen from '../screens/Accountsettingsscreen';
import SecuritySettingsScreen from '../screens/Securitysettingsscreen';
import PrivacySettingsScreen from '../screens/Privacysettingsscreen';
import DataSettingsScreen from '../screens/Datasettingsscreen';

export type RootStackParamList = {
  Dashboard:        undefined;
  Tabs:             undefined;
  PatientDetail:    { patientId: string; patientName: string };
  Consultation:     { patientId: string; patientName: string };
  Docs:             { patientId?: string; patientName?: string };
  Portal:           { patientId?: string; premode?: 'blood_type' | 'last_visit' };
  Vademecum:        undefined;
  VademecumDetail:  { ef?: string; monographId?: string; productName?: string; dci?: string };

  Settings:         undefined;
  AccountSettings:  undefined;
  SecuritySettings: undefined;
  PrivacySettings:  undefined;
  DataSettings:     undefined;
};

const AuthStack = createNativeStackNavigator();
const Tab       = createBottomTabNavigator();
const AppStack  = createNativeStackNavigator<RootStackParamList>();

// ─── Iconos de tabs ───────────────────────────────────────────────────────────
function icon(name: string, focused: boolean) {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    Pacientes: focused ? 'people' : 'people-outline',
    Agenda:    focused ? 'calendar' : 'calendar-outline',
    Docs:      focused ? 'document-text' : 'document-text-outline',
    Vademecum: focused ? 'medical' : 'medical-outline',
    Portal:    focused ? 'shield-checkmark' : 'shield-checkmark-outline',
  };
  return (
    <Ionicons
      name={icons[name] ?? 'ellipse-outline'}
      size={22}
      color={focused ? colors.primary : colors.inkSoft}
    />
  );
}

// ─── Flujo no autenticado: Home → Login | Register ───────────────────────────
function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Home"     component={HomeScreen} />
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Tabs principales (autenticado) ───────────────────────────────────────────
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
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '500', marginTop: 2 },
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
        component={VademecumScreen}
        options={{ tabBarLabel: 'Vadémecum', tabBarIcon: ({ focused }) => icon('Vademecum', focused) }}
      />
      <Tab.Screen
        name="Portal"
        component={PortalScreen}
        options={{ tabBarLabel: 'ZK Portal', tabBarIcon: ({ focused }) => icon('Portal', focused) }}
      />
    </Tab.Navigator>
  );
}

// ─── Flujo autenticado: Tabs + pantallas apiladas encima ─────────────────────
function AppFlow() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Dashboard"        component={DashboardScreen} />
      <AppStack.Screen name="Tabs"             component={Tabs} />
      <AppStack.Screen name="PatientDetail"    component={PatientDetailScreen} />
      <AppStack.Screen name="Consultation"     component={ConsultationScreen} />
      <AppStack.Screen name="Docs"             component={DocumentsScreen} />
      <AppStack.Screen name="Portal"           component={PortalScreen} />
      <AppStack.Screen name="Vademecum"        component={VademecumScreen} />
      <AppStack.Screen name="VademecumDetail"  component={VademecumDetailScreen} />
      <AppStack.Screen name="Settings"         component={SettingsScreen} />
      <AppStack.Screen name="AccountSettings"  component={AccountSettingsScreen} />
      <AppStack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
      <AppStack.Screen name="PrivacySettings"  component={PrivacySettingsScreen} />
      <AppStack.Screen name="DataSettings"     component={DataSettingsScreen} />
    </AppStack.Navigator>
  );
}

// ─── Raíz: decide entre AuthFlow y AppFlow según la sesión ───────────────────
export default function RootNavigator() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return status === 'authenticated' ? <AppFlow /> : <AuthFlow />;
}
