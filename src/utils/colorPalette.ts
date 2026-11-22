import { LicenseCategory } from '../types/cea';

export type ColorPaletteId = 'aurora' | 'emerald' | 'solar' | 'prism' | 'racing';

export interface ColorPaletteOption {
  id: ColorPaletteId;
  name: string;
  swatchGradient: string;
  inkHex: string;
}

export const COLOR_PALETTES: ColorPaletteOption[] = [
  {
    id: 'aurora',
    name: 'Cobalto Cian',
    swatchGradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
    inkHex: '#1d4ed8',
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    swatchGradient: 'linear-gradient(135deg, #059669 0%, #0ea5e9 100%)',
    inkHex: '#047857',
  },
  {
    id: 'solar',
    name: 'Ámbar Turbo',
    swatchGradient: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
    inkHex: '#c2410c',
  },
  {
    id: 'prism',
    name: 'Violeta Neón',
    swatchGradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    inkHex: '#6d28d9',
  },
  {
    id: 'racing',
    name: 'Carmesí',
    swatchGradient: 'linear-gradient(135deg, #e11d48 0%, #f97316 100%)',
    inkHex: '#be123c',
  },
];

export interface CategoryColorTheme {
  activeBg: string;
  idleHover: string;
  text: string;
  accentHex: string;
  softBg: string;
}

export const CATEGORY_COLOR_THEMES: Record<LicenseCategory, CategoryColorTheme> = {
  A2: {
    activeBg:
      'border-orange-500 bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25',
    idleHover:
      'hover:border-orange-400/70 hover:bg-orange-50 dark:hover:bg-orange-950/35 hover:text-orange-700 dark:hover:text-orange-300',
    text: 'text-orange-600 dark:text-orange-400',
    accentHex: '#f97316',
    softBg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
  B1: {
    activeBg:
      'border-sky-500 bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25',
    idleHover:
      'hover:border-sky-400/70 hover:bg-sky-50 dark:hover:bg-sky-950/35 hover:text-sky-700 dark:hover:text-sky-300',
    text: 'text-sky-600 dark:text-sky-400',
    accentHex: '#0ea5e9',
    softBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  C1: {
    activeBg:
      'border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25',
    idleHover:
      'hover:border-emerald-400/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/35 hover:text-emerald-700 dark:hover:text-emerald-300',
    text: 'text-emerald-600 dark:text-emerald-400',
    accentHex: '#10b981',
    softBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  C2: {
    activeBg:
      'border-violet-500 bg-gradient-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/25',
    idleHover:
      'hover:border-violet-400/70 hover:bg-violet-50 dark:hover:bg-violet-950/35 hover:text-violet-700 dark:hover:text-violet-300',
    text: 'text-violet-600 dark:text-violet-400',
    accentHex: '#8b5cf6',
    softBg: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  C3: {
    activeBg:
      'border-rose-500 bg-gradient-to-br from-rose-600 to-pink-500 text-white shadow-lg shadow-rose-500/25',
    idleHover:
      'hover:border-rose-400/70 hover:bg-rose-50 dark:hover:bg-rose-950/35 hover:text-rose-700 dark:hover:text-rose-300',
    text: 'text-rose-600 dark:text-rose-400',
    accentHex: '#f43f5e',
    softBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
};
