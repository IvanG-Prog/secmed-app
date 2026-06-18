// SecMed — Design tokens (espejo del CSS del landing/web)
// Primario: azul clínico #1D6FA5 | Secundario: teal #2FA88E
// Fuentes: Sora (display), Inter (body), IBM Plex Mono (datos)

export const colors = {
  // Fondos
  bg:          '#FFFFFF',
  bgSoft:      '#EEF6F5',
  bgDark:      '#0E1C28',
  bgSoftDark:  '#152535',

  // Texto
  ink:         '#1C2B36',
  inkSoft:     '#5B6E7A',
  inkDark:     '#DDE8F0',
  inkSoftDark: '#7A9DB4',

  // Bordes
  line:        '#E1E8EA',
  lineDark:    '#1E3044',

  // Marca
  primary:     '#1D6FA5',
  primaryDark: '#15567F',
  secondary:   '#2FA88E',
  secondarySoft:'#DCF0EA',

  // Semánticos
  success:     '#2FA88E',
  warning:     '#F59E0B',
  danger:      '#EF4444',
  dangerSoft:  '#FEE2E2',

  // Riesgo clínico (igual que el web)
  riskLow:     '#2FA88E',
  riskMod:     '#F59E0B',
  riskHigh:    '#F97316',
  riskVery:    '#EF4444',

  // UI
  white:       '#FFFFFF',
  cardBg:      '#FFFFFF',
  footerBg:    '#15263A',
  overlay:     'rgba(14,28,40,0.55)',
};

export const typography = {
  // Sora → display/títulos
  display: 'Sora-Bold',
  displaySemi: 'Sora-SemiBold',
  displayMedium: 'Sora-Medium',
  displayRegular: 'Sora-Regular',
  // Inter → cuerpo
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemi: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
  // IBM Plex Mono → datos, hashes, IDs
  mono: 'IBMPlexMono-Regular',
  monoMedium: 'IBMPlexMono-Medium',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor: '#1C2B36',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
};