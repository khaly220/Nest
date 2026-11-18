/**
 * Nest design tokens — warm coral identity.
 *
 * Two palettes are provided, `lightColors` and `darkColors`. Screens and
 * components must never import a palette directly: they read the active palette
 * through `useTheme()` (see `./ThemeProvider`) and build styles with
 * `makeStyles()` so the whole surface re-renders the moment the theme changes.
 *
 * Token names are role based so their meaning survives a brand tweak:
 *   brand       primary action coral
 *   brandDeep   solid deep coral used behind white text
 *   brandInk    brand-coloured glyphs and headings on light surfaces
 *   brandSoft   soft brand tint behind icons and pills
 *   navy        darkest surface (hero panels and overlays)
 *   accent      soft coral used for muted panels and avatars
 */
export type NestColors = {
  /** Primary action coral. */
  brand: string;
  /** Solid deep coral — used behind white content. */
  brandDeep: string;
  /** Brand-coloured glyphs, headings and links on light surfaces. */
  brandInk: string;
  /** Soft brand tint for chips, icon bubbles and pills. */
  brandSoft: string;
  /** Darkest surface — hero panels and overlays. */
  navy: string;
  /** Soft coral for muted panels and avatars. */
  accent: string;

  /** App background. */
  background: string;
  /** Card background. */
  surface: string;
  /** Slightly tinted surface for nested cards. */
  surfaceMuted: string;

  /** Main text. */
  ink: string;
  /** Secondary text. */
  inkSecondary: string;
  /** Tertiary text and disabled labels. */
  inkMuted: string;

  /** Borders and dividers. */
  border: string;
  borderStrong: string;

  warning: string;
  danger: string;
  success: string;

  /** Soft tints used behind icons and status pills. */
  brandTint: string;
  surfaceTint: string;
  neutralTint: string;
  warningTint: string;
  dangerTint: string;
  successTint: string;

  white: string;
  overlay: string;
  /** Text on dark/gradient surfaces. */
  onDark: string;
  onDarkMuted: string;
};

export const lightColors: NestColors = {
  brand: '#C84A28',
  brandDeep: '#A93D21',
  brandInk: '#B94221',
  brandSoft: '#FFE9DF',
  navy: '#30231E',
  accent: '#FDBA9A',

  background: '#FFF8F4',
  surface: '#FFFFFF',
  surfaceMuted: '#FFF1EA',

  ink: '#29231F',
  inkSecondary: '#776B64',
  inkMuted: '#A99B92',

  border: '#F0E2DA',
  borderStrong: '#E4CEC2',

  warning: '#D97706',
  danger: '#C63B32',
  success: '#16A34A',

  brandTint: '#FFF3ED',
  surfaceTint: '#FFF8F4',
  neutralTint: '#F8F1EC',
  warningTint: '#FFFBEB',
  dangerTint: '#FFF0EE',
  successTint: '#F0FDF4',

  white: '#FFFFFF',
  overlay: 'rgba(48, 35, 30, 0.45)',
  onDark: 'rgba(255, 255, 255, 0.88)',
  onDarkMuted: 'rgba(255, 255, 255, 0.62)',
};

export const darkColors: NestColors = {
  brand: '#FF8A65',
  brandDeep: '#A93D21',
  brandInk: '#FFAA8D',
  brandSoft: '#49271F',
  navy: '#130E0C',
  accent: '#3B2923',

  background: '#171210',
  surface: '#211A17',
  surfaceMuted: '#2A211D',

  ink: '#F5ECE7',
  inkSecondary: '#B9A69C',
  inkMuted: '#85736A',

  border: '#3B2E28',
  borderStrong: '#58443A',

  warning: '#F59E0B',
  danger: '#C63B32',
  success: '#4ADE80',

  brandTint: '#35201A',
  surfaceTint: '#1C1512',
  neutralTint: '#2A211D',
  warningTint: '#30220F',
  dangerTint: '#321A17',
  successTint: '#14251A',

  white: '#FFFFFF',
  overlay: 'rgba(19, 14, 12, 0.68)',
  onDark: 'rgba(255, 255, 255, 0.9)',
  onDarkMuted: 'rgba(255, 255, 255, 0.6)',
};

export type ColorName = keyof NestColors;

export type NestGradients = {
  /** Deep warm hero panel. */
  hero: readonly [string, string, ...string[]];
  /** Two-stop coral gradient for primary buttons. */
  brand: readonly [string, string, ...string[]];
  /** Very soft brand wash for tinted sections. */
  soft: readonly [string, string, ...string[]];
  neutral: readonly [string, string, ...string[]];
  surface: readonly [string, string, ...string[]];
};

export const lightGradients: NestGradients = {
  hero: ['#30231E', '#6D3829', '#A93D21'],
  brand: ['#C84A28', '#B94221'],
  soft: ['#FFFCFA', '#FFEFE7'],
  neutral: ['#FFF8F4', '#F8F1EC'],
  surface: ['#FFFFFF', '#FFF8F4'],
};

export const darkGradients: NestGradients = {
  hero: ['#130E0C', '#30201A', '#633323'],
  brand: ['#C84A28', '#B94221'],
  soft: ['#1C1512', '#35201A'],
  neutral: ['#171210', '#2A211D'],
  surface: ['#211A17', '#171210'],
};

/**
 * @deprecated Static light palette kept only so unconverted modules keep
 * compiling. Always prefer `useTheme()` inside components.
 */
export const colors = lightColors;
/** @deprecated See `colors`. Prefer `useTheme()`. */
export const gradients = lightGradients;
