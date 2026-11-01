/**
 * Layanan gambar soal & pilihan jawaban.
 *
 * Gambar disimpan sebagai data-URL (base64) di dalam data soal supaya:
 *  - tetap tampil pada versi satu file (offline), dan
 *  - ikut tersinkron ke Google Sheets bersama soal (JSON soal dalam 1 sel).
 *
 * Karena sel Google Sheets maksimal 50.000 karakter, setiap gambar
 * dikompres otomatis sampai ukurannya masuk anggaran (budget) tertentu.
 */

/**
 * Anggaran per gambar. Google Sheets hanya menampung 50.000 karakter per sel,
 * sedangkan seluruh soal (termasuk gambar) disimpan sebagai 1 sel JSON —
 * jadi total gambar per soal dibatasi 36.000 karakter (≈27 KB).
 */
export const IMAGE_BUDGET_TOTAL = 12000;
export const QUESTION_IMAGE_BUDGET = 36000;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // berkas asli maksimal 8 MB

export interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
  chars: number;
  kb: number;
}

const SCALES = [1200, 1000, 900, 800, 700, 600, 500, 420, 340, 280, 220];
const QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42];

const loadBitmap = (file: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Berkas gambar tidak dapat dibaca.'));
    };
    img.src = url;
  });

/** Perkiraan ukuran (KB) dari sebuah data-URL */
export const dataUrlKb = (dataUrl?: string): number =>
  dataUrl ? Math.round(((dataUrl.length - (dataUrl.indexOf(',') + 1)) * 0.75) / 1024) : 0;

export const totalChars = (images: string[] = []): number =>
  images.reduce((a, img) => a + (img?.length || 0), 0);

/**
 * Kompres gambar dari berkas (atau data-URL) agar panjang base64 ≤ budget.
 * Melempar Error bila berkas bukan gambar / terlalu besar / tidak bisa dikompres.
 */
export const compressImage = async (
  input: File | Blob | string,
  budget = IMAGE_BUDGET_TOTAL,
): Promise<CompressedImage> => {
  let source: Blob;
  if (typeof input === 'string') {
    const res = await fetch(input);
    source = await res.blob();
  } else {
    source = input;
  }

  if (source instanceof File) {
    if (!source.type.startsWith('image/')) {
      throw new Error('Berkas harus berupa gambar (JPG, PNG, WEBP, GIF).');
    }
    if (source.size > MAX_UPLOAD_BYTES) {
      throw new Error('Ukuran gambar maksimal 8 MB. Perkecil dulu gambarnya.');
    }
  }

  const img = await loadBitmap(source);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Peramban tidak mendukung pengolahan gambar.');

  let last: CompressedImage | null = null;

  for (const maxW of SCALES) {
    const ratio = Math.min(1, maxW / img.naturalWidth, maxW / img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * ratio));
    const h = Math.max(1, Math.round(img.naturalHeight * ratio));
    canvas.width = w;
    canvas.height = h;

    // latar putih supaya PNG transparan tidak menjadi hitam
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of QUALITIES) {
      const dataUrl = canvas.toDataURL('image/jpeg', q);
      const candidate: CompressedImage = {
        dataUrl,
        width: w,
        height: h,
        chars: dataUrl.length,
        kb: dataUrlKb(dataUrl),
      };
      last = candidate;
      if (dataUrl.length <= budget) return candidate;
    }
  }

  if (last && last.chars <= budget * 1.15) return last;
  throw new Error(
    'Gambar terlalu besar untuk disimpan. Gunakan gambar yang lebih sederhana atau kecil.',
  );
};

/** Keterangan ukuran gambar untuk ditampilkan di UI */
export const describeImage = (dataUrl: string): string => `${dataUrlKb(dataUrl)} KB`;
