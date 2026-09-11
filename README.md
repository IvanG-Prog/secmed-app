# SecMed — App móvil (médicos)

App de React Native / Expo para médicos: historia clínica asistida por IA
(nota libre → SOAP → diagnóstico → receta → informe, con dictado por voz) y
certificados Zero-Knowledge (tipo de sangre, última visita) sin exponer el
expediente completo.

Es el cliente **exclusivo para médicos** del sistema SecMed. El backend
(`secmed-demo`) es compartido con la clínica y el portal de pacientes; esta
app solo consume las funciones que le corresponden al médico (pacientes,
agenda, consulta con IA, documentos, vadémecum y el portal ZK).

## Requisitos

- Node.js 18 o superior
- npm
- La app [Expo Go](https://expo.dev/go) en tu teléfono, **o** un emulador de
  Android Studio / simulador de iOS
- No necesitas Rust ni Postgres para correr la app — por defecto se conecta
  al backend ya desplegado (ver más abajo).

## Instalación y arranque

```bash
npm install
npx expo start
```

Esto abre el Metro Bundler. Desde ahí puedes:

- Escanear el código QR con la app **Expo Go** (Android) o la cámara
  (iOS) para correrla en tu teléfono.
- Presionar `a` para abrir un emulador de Android ya configurado.
- Presionar `i` para abrir el simulador de iOS (requiere macOS + Xcode).
- Presionar `w` para correrla en el navegador (soporte limitado; el
  dictado por voz y la biometría no funcionan en web).

## Backend

`utils/api.ts` apunta por defecto al backend ya desplegado en Railway:

```
https://secmed-demo-production.up.railway.app/api
```

No necesitas levantar nada más para probar la app tal cual está. Si
quieres apuntar a un backend corriendo en tu máquina (repo `secmed-demo`),
cambia `BASE_URL` en `utils/api.ts` por, por ejemplo, `http://TU_IP_LOCAL:8080/api`
(usa la IP de tu máquina en la red local, no `localhost`, porque el
teléfono/emulador no comparte el `localhost` de tu computadora).

Para correr el backend localmente (repo aparte):

```bash
cd secmed-demo/backend
export DATABASE_URL="postgres://usuario:clave@localhost:5432/secmed"
export ANTHROPIC_API_KEY="sk-ant-..."   # notas SOAP, diagnóstico, receta, informe
export OPENAI_API_KEY="sk-..."          # transcripción de audio (dictado por voz)
./run.sh
```

Necesita una instancia de Postgres accesible en `DATABASE_URL` (crea el
esquema solo al arrancar) y Rust **nightly** (el `rust-toolchain.toml` del
backend fija la versión exacta; `rustup` la instala automáticamente al
correr `cargo run` si tienes `rustup` instalado).

Sin `OPENAI_API_KEY` en el backend, todo funciona excepto el dictado de
notas por voz. Sin `ANTHROPIC_API_KEY`, fallan "Estructurar SOAP",
"Consultar IA", "Generar receta" y "Generar informe".

## Cuenta y sesión

El registro e inicio de sesión son **100% locales al dispositivo** (no hay
un servidor de identidad todavía): el médico crea una cuenta con
usuario/clave, se guarda cifrada con `expo-secure-store`, y desde
"Seguridad y acceso" puede activar huella/Face ID como segundo factor.
Cada dispositivo soporta **una sola cuenta de médico** a la vez; para
cambiar de médico hay que eliminar la cuenta local desde Configuración →
Datos profesionales → "Eliminar cuenta de este dispositivo".

## Estructura del proyecto

```
screens/          Una pantalla por archivo (Pacientes, Agenda, Consulta, Documentos,
                   Portal ZK, Vadémecum, Configuración, Auth…)
navigation/        RootNavigator.tsx — stacks de auth y de la app + tabs
components/        SecMedMark, SettingsButton, TrendLineChart (gráfico SVG liviano)
hooks/useSession.ts  Estado de sesión del médico (fuente única de verdad)
utils/api.ts       Cliente HTTP hacia el backend (tipos + endpoints)
utils/auth/localAuth.ts  Registro/login/biometría 100% local (SecureStore)
theme/tokens.ts    Colores, tipografía, spacing — espejo del CSS del sitio web
```

## Funciones incluidas

- **Pacientes**: alta, búsqueda, expediente clínico, riesgo cardiovascular
  y de diabetes (FINDRISC).
- **Consulta**: nota libre (con dictado por voz), estructuración a SOAP con
  CIE-10, consideraciones clínicas por IA, receta e informe sugeridos.
- **Agenda**: citas por paciente, cambio de estado, filtros.
- **Documentos**: recetas e informes emitidos, entrega y verificación de
  integridad (hash Poseidon).
- **Portal ZK**: emisión y verificación de certificados de conocimiento
  cero (tipo de sangre, última visita) sin revelar el resto del expediente.
- **Vadémecum**: búsqueda de productos y monografías clínicas.
- **Panel principal**: resumen de actividad y novedades del sector antes
  de entrar a las funciones clínicas.

## Limitaciones conocidas de esta demo

- Un solo médico registrado por dispositivo (no hay multi-cuenta local).
- "Exportar datos" en Configuración → Mis datos está señalado como
  pendiente; no hay endpoint de exportación en el backend todavía.
- La foto de perfil del médico no está implementada (no hay endpoint de
  subida); el avatar usa iniciales.
