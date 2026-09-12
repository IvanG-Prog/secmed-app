# SecMed — App móvil (médicos)

## Requisitos
- Node.js 18+
- La app **Expo Go** instalada en tu teléfono (Play Store / App Store)

## Cómo probarla

```bash
npm install
npx expo start
```

Esto abre un código QR en la terminal:

- **Android**: escanea el QR con la app Expo Go.
- **iOS**: escanéalo con la Cámara del teléfono.

No necesitas levantar ningún backend — la app ya se conecta sola al
servidor de SecMed en Railway.

## Si algo se ve raro después de instalar dependencias nuevas

```bash
npx expo start --clear
```

Esto limpia la caché de Metro y vuelve a armar el bundle desde cero.
