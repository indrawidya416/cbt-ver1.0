/**
 * Layanan Excel (.xlsx) — dipakai untuk unduh & unggah data siswa
 * dan rekap nilai, supaya guru bisa langsung membuka/mengeditnya
 * di Microsoft Excel atau WPS Office (tanpa ubah ke CSV dulu).
 */
import * as XLSX from 'xlsx';

export type CellValue = string | number | null | undefined;

export interface SheetSpec {
  /** Nama sheet (maks 31 karakter, tanpa karakter terlarang) */
  name: string;
  /** Baris data; baris pertama biasanya judul kolom */
  rows: CellValue[][];
  /** Lebar kolom (opsional), satuan karakter */
  widths?: number[];
}

const safeName = (name: string) => name.replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || 'Sheet1';

/** Unduh beberapa sheet sekaligus sebagai satu file .xlsx */
export const downloadXlsx = (filename: string, sheets: SheetSpec[]) => {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows.map((row) => row.map((c) => (c === undefined || c === null ? '' : c))));
    if (sheet.widths?.length) ws['!cols'] = sheet.widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, safeName(sheet.name));
  });
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
};

/**
 * Baca file .xlsx / .xls / .csv yang diunggah guru.
 * Mengembalikan seluruh baris (array 2 dimensi) dari sheet pertama,
 * sel kosong menjadi string kosong.
 */
export const readSpreadsheet = async (file: File): Promise<string[][]> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const ws = wb.Sheets[first];
  const rows = XLSX.utils.sheet_to_json<CellValue[]>(ws, { header: 1, raw: false, defval: '', blankrows: false });
  return rows.map((row) => (row || []).map((c) => String(c ?? '').trim()));
};

/** Ubah baris hasil baca Excel menjadi teks tempel (dipisah koma) */
export const rowsToText = (rows: string[][]): string =>
  rows
    .filter((row) => row.some((c) => c !== ''))
    .map((row) => row.map((c) => c.replace(/\s+/g, ' ').trim()).join(', '))
    .join('\n');

/** Baca file teks (CSV/txt) menjadi baris */
export const readTextFile = async (file: File): Promise<string[][]> => {
  const text = await file.text();
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((l) => l.split(/[,;\t]/).map((c) => c.replace(/^"|"$/g, '').trim()));
};

/** Ambil baris dari file apa pun yang didukung (Excel atau CSV) */
export const readAnyTableFile = async (file: File): Promise<string[][]> => {
  if (/\.(csv|txt)$/i.test(file.name)) return readTextFile(file);
  return readSpreadsheet(file);
};
