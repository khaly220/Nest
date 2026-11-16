/**
 * Nest design tokens — professional blue identity.
 *
 * Two palettes are provided, `lightColors` and `darkColors`. Screens and
 * components must never import a palette directly: they read the active palette
 * through `useTheme()` (see `./ThemeProvider`) and build styles with
 * `makeStyles()` so the whole surface re-renders the moment the theme changes.
 *
 * Token names are role based so their meaning survives a brand tweak:
 *   brand       primary action blue
 *   brandDeep   solid deep blue used behind white text
 *   brandInk    brand-coloured glyphs and headings on light surfaces
 *   brandSoft   soft brand tint behind icons and pills
 *   navy        darkest surface (hero panels, table headers)
 *   accent      desaturated blue used for muted panels and avatars
 */
export type NestColors = {
  /** Primary action blue. */
  brand: string;
  /** Solid deep blue — used behind white content. */
  brandDeep: string;
  /** Brand-coloured glyphs, headings and links on light surfaces. */
  brandInk: string;
  /** Soft brand tint for chips, icon bubbles and pills. */
  brandSoft: string;
  /** Darkest surface — hero panels and overlays. */
  navy: string;
  /** Desaturated blue for muted panels and avatars. */
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
  brand: '#2563EB',
  brandDeep: '#1E3A8A',
  brandInk: '#1D4ED8',
  brandSoft: '#DBEAFE',
  navy: '#0F172A',
  accent: '#93C5FD',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',

  ink: '#0F172A',
  inkSecondary: '#64748B',
  inkMuted: '#94A3B8',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  warning: '#D97706',
  danger: '#DC2626',
  success: '#16A34A',

  brandTint: '#EFF6FF',
  surfaceTint: '#F8FAFC',
  neutralTint: '#F1F5F9',
  warningTint: '#FFFBEB',
  dangerTint: '#FEF2F2',
  successTint: '#F0FDF4',

  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.45)',
  onDark: 'rgba(255, 255, 255, 0.88)',
  onDarkMuted: 'rgba(255, 255, 255, 0.62)',
};

export const darkColors: NestColors = {
  brand: '#3B82F6',
  brandDeep: '#1E3A8A',
  brandInk: '#93C5FD',
  brandSoft: '#1E3A8A',
  navy: '#020617',
  accent: '#1E293B',

  background: '#0B1220',
  surface: '#111C2E',
  surfaceMuted: '#16233A',

  ink: '#E8EEF7',
  inkSecondary: '#94A3B8',
  inkMuted: '#64748B',

  border: '#1E293B',
  borderStrong: '#334155',

  warning: '#F59E0B',
  danger: '#F87171',
  success: '#4ADE80',

  brandTint: '#132441',
  surfaceTint: '#0F1B2E',
  neutralTint: '#132033',
  warningTint: '#2A1F0B',
  dangerTint: '#2A1414',
  successTint: '#0D2418',

  white: '#FFFFFF',
  overlay: 'rgba(2, 6, 23, 0.62)',
  onDark: 'rgba(255, 255, 255, 0.9)',
  onDarkMuted: 'rgba(255, 255, 255, 0.6)',
};

export type ColorName = keyof NestColors;

export type NestGradients = {
  /** Deep navy → blue hero panel. */
  hero: readonly [string, string, ...string[]];
  /** Two-stop brand gradient for primary buttons. */
  brand: readonly [string, string, ...string[]];
  /** Very soft brand wash for tinted sections. */
  soft: readonly [string, string, ...string[]];
  neutral: readonly [string, string, ...string[]];
  surface: readonly [string, string, ...string[]];
};

export const lightGradients: NestGradients = {
  hero: ['#0F172A', '#1E3A8A', '#2563EB'],
  brand: ['#3B82F6', '#2563EB'],
  soft: ['#FFFFFF', '#EFF6FF'],
  neutral: ['#F8FAFC', '#F1F5F9'],
  surface: ['#FFFFFF', '#F8FAFC'],
};

export const darkGradients: NestGradients = {
  hero: ['#020617', '#0F172A', '#1E3A8A'],
  brand: ['#3B82F6', '#2563EB'],
  soft: ['#0F1B2E', '#132441'],
  neutral: ['#0B1220', '#132033'],
  surface: ['#111C2E', '#0B1220'],
};

/**
 * @deprecated Static light palette kept only so unconverted modules keep
 * compiling. Always prefer `useTheme()` inside components.
 */
export const colors = lightColors;
/** @deprecated See `colors`. Prefer `useTheme()`. */
export const gradients = lightGradients;
