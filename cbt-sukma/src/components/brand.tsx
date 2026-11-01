import React from 'react';
import {
  LOGO_LPI,
  LOGO_LPI_MARK,
  LOGO_MI,
  LOGO_MI_CREST,
  LOGO_SMP,
  LOGO_SMP_CREST,
  LOGO_SUKMA_FULL,
  SUKMA_MARK,
} from '../assets/logos';
import { SchoolName } from '../types';
import { SCHOOL_STYLE } from '../theme';

/** Logo Sekolah Sukma (hexagon "SUKMA") */
export const SukmaMark: React.FC<{ className?: string; height?: number }> = ({
  className = '',
  height = 40,
}) => (
  <img
    src={SUKMA_MARK}
    alt="Logo Sekolah Sukma"
    style={{ height }}
    className={`w-auto select-none object-contain ${className}`}
    draggable={false}
  />
);

/** Logo Sekolah Sukma lengkap dengan tagline */
export const SukmaLogoFull: React.FC<{ className?: string; width?: number }> = ({
  className = '',
  width = 260,
}) => (
  <img
    src={LOGO_SUKMA_FULL}
    alt="Sekolah Unggulan Kebonsari Malang — Sekolah Para Juara"
    style={{ width }}
    className={`h-auto select-none object-contain ${className}`}
    draggable={false}
  />
);

/** Logo Lembaga Pendidikan Islam (LPI) Kebonsari Malang — lengkap dengan tulisan */
export const LpiLogo: React.FC<{ className?: string; height?: number }> = ({
  className = '',
  height = 28,
}) => (
  <img
    src={LOGO_LPI}
    alt="Lembaga Pendidikan Islam Kebonsari Malang"
    style={{ height }}
    className={`w-auto select-none object-contain ${className}`}
    draggable={false}
  />
);

/** Emblem LPI saja (untuk latar gelap / ruang sempit) */
export const LpiMark: React.FC<{ className?: string; height?: number }> = ({
  className = '',
  height = 24,
}) => (
  <img
    src={LOGO_LPI_MARK}
    alt="LPI Kebonsari Malang"
    style={{ height }}
    className={`w-auto select-none object-contain ${className}`}
    draggable={false}
  />
);

/** Logo sekolah: crest (lambang) atau lengkap dengan nama */
export const SchoolLogo: React.FC<{
  school: SchoolName;
  variant?: 'crest' | 'full';
  height?: number;
  className?: string;
}> = ({ school, variant = 'crest', height = 40, className = '' }) => {
  const src =
    school === 'MI Islamiyah'
      ? variant === 'crest'
        ? LOGO_MI_CREST
        : LOGO_MI
      : variant === 'crest'
      ? LOGO_SMP_CREST
      : LOGO_SMP;
  return (
    <img
      src={src}
      alt={`Logo ${school}`}
      style={{ height }}
      className={`w-auto select-none object-contain ${className}`}
      draggable={false}
    />
  );
};

/** Chip identitas sekolah dengan warna template masing-masing */
export const SchoolBadge: React.FC<{
  school: SchoolName | 'Semua';
  size?: 'sm' | 'md';
  withLogo?: boolean;
}> = ({ school, size = 'sm', withLogo = true }) => {
  if (school === 'Semua') {
    return (
      <span className="badge bg-slate-100 text-slate-600">
        Semua Sekolah
      </span>
    );
  }
  const s = SCHOOL_STYLE[school];
  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  return (
    <span
      className={`badge ${s.bg} ${s.text} border ${s.border} ${pad} gap-1.5`}
      title={`${school} · ${s.label}`}
    >
      {withLogo && <SchoolLogo school={school} height={size === 'sm' ? 13 : 16} />}
      {school}
    </span>
  );
};
