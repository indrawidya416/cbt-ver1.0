import { SchoolName } from './types';

export type ThemeId = 'tosca' | 'mi' | 'smp';

/**
 * Tema dasar aplikasi: **tosca**.
 * Setiap sekolah memakai warna khasnya sendiri:
 * - MI Islamiyah   → oranye
 * - SMP Al Hidayah → biru
 */
export const themeOfSchool = (school?: string | null): ThemeId => {
  if (school === 'MI Islamiyah') return 'mi';
  if (school === 'SMP Al Hidayah') return 'smp';
  return 'tosca';
};

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  subtitle: string;
  primary: string; // warna HEX untuk pratinjau / logo
  secondary: string;
  ring: string; // kelas pembantu
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  tosca: {
    id: 'tosca',
    label: 'Tosca',
    subtitle: 'Warna dasar aplikasi (Guru & Admin)',
    primary: '#0d9488',
    secondary: '#14b8a6',
    ring: 'border-brand-300',
  },
  mi: {
    id: 'mi',
    label: 'MI Islamiyah',
    subtitle: 'Template MI Islamiyah',
    primary: '#ea580c',
    secondary: '#fb923c',
    ring: 'border-orange-300',
  },
  smp: {
    id: 'smp',
    label: 'SMP Al Hidayah',
    subtitle: 'Template SMP Al Hidayah',
    primary: '#1d4ed8',
    secondary: '#1e3a8a',
    ring: 'border-blue-300',
  },
};

/** Warna identitas sekolah (dipakai pada badge di area admin bertema tosca) */
export const SCHOOL_STYLE: Record<
  SchoolName,
  { text: string; bg: string; border: string; dot: string; hex: string; label: string }
> = {
  'MI Islamiyah': {
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    hex: '#ea580c',
    label: 'MI Islamiyah',
  },
  'SMP Al Hidayah': {
    text: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-800',
    hex: '#1d4ed8',
    label: 'SMP Al Hidayah',
  },
};
