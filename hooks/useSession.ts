// ─────────────────────────────────────────────────────────────────────────────
// useSession — fuente única de verdad sobre la sesión del médico.
//
// El RootNavigator usa `status` para decidir qué stack mostrar:
//   'loading'        → splash mientras se consulta SecureStore
//   'unauthenticated' → hace falta clave o huella (HomeScreen / Login / Register)
//   'authenticated'   → ya se autenticó en este arranque (Tabs de la app clínica)
//
// Autenticarse dura hasta que se cierra la app (no hay "recordarme"): cada
// arranque en frío exige clave o huella de nuevo, aunque ya exista un
// médico registrado en el dispositivo.
//
// No usa Context de React a propósito: para una app de este tamaño un hook
// simple con un módulo de estado compartido es suficiente y evita el
// boilerplate de un Provider. Si la app crece, esto se migra a Context o
// Zustand sin tocar las pantallas que ya consumen el hook.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import {
  hasRegisteredDoctor,
  loginWithPassword, loginWithBiometrics, registerDoctor,
  logout as authLogout, resetLocalAccount,
  PublicDoctor,
} from '../utils/auth/localAuth';

export type SessionStatus = 'loading' | 'unauthenticated' | 'authenticated';

type SessionState = {
  status: SessionStatus;
  doctor: PublicDoctor | null;
  hasRegistered: boolean;   // ¿ya existe una cuenta local? (para decidir Home → Login vs Register)
};

// Estado compartido simple entre los componentes que usan el hook.
let listeners: Array<(s: SessionState) => void> = [];
let state: SessionState = { status: 'loading', doctor: null, hasRegistered: false };

function setState(next: Partial<SessionState>) {
  state = { ...state, ...next };
  listeners.forEach(l => l(state));
}

async function bootstrap() {
  // Por seguridad (la app maneja historia clínica), cada arranque en frío
  // exige volver a autenticarse (clave o huella) aunque ya exista un
  // médico registrado en el dispositivo. Antes se guardaba una bandera de
  // "sesión activa" que nunca expiraba, así que reabrir la app después de
  // días/semanas entraba directo al panel sin pedir nada — eso ya no pasa:
  // el flag de sesión activa dejó de usarse para saltarse el login.
  const registered = await hasRegisteredDoctor();
  setState({ status: 'unauthenticated', doctor: null, hasRegistered: registered });
}
bootstrap();

export function useSession() {
  const [local, setLocal] = useState(state);

  useEffect(() => {
    const listener = (s: SessionState) => setLocal(s);
    listeners.push(listener);
    // bootstrap() se dispara al cargar el módulo, antes de que este efecto
    // llegue a suscribirse — si ya resolvió para entonces, el aviso se
    // pierde y el componente se queda pegado en 'loading'. Sincronizamos
    // acá con el estado global actual para cubrir esa carrera.
    setLocal(state);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  const register = useCallback(async (input: { name: string; license: string; email: string; password: string }) => {
    const doctor = await registerDoctor(input);
    setState({ status: 'authenticated', doctor, hasRegistered: true });
    return doctor;
  }, []);

  const login = useCallback(async (password: string) => {
    const doctor = await loginWithPassword(password);
    setState({ status: 'authenticated', doctor });
    return doctor;
  }, []);

  const loginBiometric = useCallback(async () => {
    const doctor = await loginWithBiometrics();
    setState({ status: 'authenticated', doctor });
    return doctor;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setState({ status: 'unauthenticated', doctor: null });
  }, []);

  const resetAccount = useCallback(async () => {
    await resetLocalAccount();
    setState({ status: 'unauthenticated', doctor: null, hasRegistered: false });
  }, []);

  return {
    status: local.status,
    doctor: local.doctor,
    hasRegistered: local.hasRegistered,
    register, login, loginBiometric, logout, resetAccount,
  };
}