// ─────────────────────────────────────────────────────────────────────────────
// Autenticación local — SecMed Mobile
//
// El backend Rust de la demo no tiene endpoints de auth (es un servicio
// clínico, no un IdP). Para que el acceso sea real y no un mockup visual,
// la sesión del médico se gestiona 100% en el dispositivo:
//
//   - El registro crea una credencial local: usuario + hash de la clave,
//     guardado en SecureStore (cifrado por el OS, Keystore en Android).
//   - El login valida la clave contra ese hash.
//   - Una vez que existe una sesión válida, el médico puede desbloquear
//     la app con huella/Face ID (expo-local-authentication) en lugar de
//     volver a escribir la clave — el dispositivo es el segundo factor.
//
// Esto es honesto sobre lo que es: autenticación local de dispositivo,
// no un sistema de identidad multi-dispositivo. Para producción real
// se conectaría a un endpoint /api/auth en el backend.
// ─────────────────────────────────────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const KEY_DOCTOR    = 'secmed.doctor';       // { id, name, license, email, passHash }
const KEY_SESSION   = 'secmed.session';      // 'active' | undefined

export type Doctor = {
  id: string;
  name: string;
  license: string;   // colegiatura / cédula profesional
  email: string;
  passHash: string;
};

export type PublicDoctor = Omit<Doctor, 'passHash'>;

// ── Hash de clave (SHA-256, suficiente para este alcance local) ─────────────
async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

// ── Registro ──────────────────────────────────────────────────────────────
export async function registerDoctor(input: {
  name: string; license: string; email: string; password: string;
}): Promise<PublicDoctor> {
  const existing = await SecureStore.getItemAsync(KEY_DOCTOR);
  if (existing) {
    throw new Error('Ya existe un médico registrado en este dispositivo. Inicia sesión.');
  }
  const passHash = await hashPassword(input.password);
  const doctor: Doctor = {
    id: `dr-${Date.now().toString(36)}`,
    name: input.name,
    license: input.license,
    email: input.email,
    passHash,
  };
  await SecureStore.setItemAsync(KEY_DOCTOR, JSON.stringify(doctor));
  await SecureStore.setItemAsync(KEY_SESSION, 'active');
  const { passHash: _, ...pub } = doctor;
  return pub;
}

// ── ¿Ya hay un médico registrado en este dispositivo? ───────────────────────
export async function hasRegisteredDoctor(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY_DOCTOR)) !== null;
}

export async function getStoredDoctor(): Promise<PublicDoctor | null> {
  const raw = await SecureStore.getItemAsync(KEY_DOCTOR);
  if (!raw) return null;
  const { passHash: _, ...pub } = JSON.parse(raw) as Doctor;
  return pub;
}

// ── Login con clave ──────────────────────────────────────────────────────────
export async function loginWithPassword(password: string): Promise<PublicDoctor> {
  const raw = await SecureStore.getItemAsync(KEY_DOCTOR);
  if (!raw) throw new Error('No hay ningún médico registrado en este dispositivo.');
  const doctor: Doctor = JSON.parse(raw);
  const hash = await hashPassword(password);
  if (hash !== doctor.passHash) throw new Error('Clave incorrecta.');
  await SecureStore.setItemAsync(KEY_SESSION, 'active');
  const { passHash: _, ...pub } = doctor;
  return pub;
}

// ── Disponibilidad de biometría en el dispositivo ────────────────────────────
export type BiometricKind = 'face' | 'fingerprint' | 'none';

export async function getBiometricKind(): Promise<BiometricKind> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled   = await LocalAuthentication.isEnrolledAsync();
  if (!compatible || !enrolled) return 'none';
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  return 'none';
}

// ── Desbloqueo biométrico de una sesión ya existente ─────────────────────────
export async function loginWithBiometrics(): Promise<PublicDoctor> {
  const raw = await SecureStore.getItemAsync(KEY_DOCTOR);
  if (!raw) throw new Error('No hay ningún médico registrado en este dispositivo.');

  const kind = await getBiometricKind();
  if (kind === 'none') throw new Error('Este dispositivo no tiene biometría configurada.');

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Verifica tu identidad para acceder a SecMed',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false, // si falla biometría, el OS ofrece el PIN del dispositivo
  });
  if (!result.success) {
    throw new Error('No se pudo verificar tu identidad.');
  }
  await SecureStore.setItemAsync(KEY_SESSION, 'active');
  const { passHash: _, ...pub } = JSON.parse(raw) as Doctor;
  return pub;
}

// ── Sesión activa ─────────────────────────────────────────────────────────────
export async function hasActiveSession(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY_SESSION)) === 'active';
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_SESSION);
}

// ── Borra el registro local por completo (útil en desarrollo / "olvidé mi clave") ─
export async function resetLocalAccount(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_DOCTOR);
  await SecureStore.deleteItemAsync(KEY_SESSION);
}