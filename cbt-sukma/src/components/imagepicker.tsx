import React, { useRef, useState } from 'react';
import {
  IMAGE_BUDGET_TOTAL,
  IMAGE_BUDGET_TOTAL as DEFAULT_BUDGET,
  compressImage,
  dataUrlKb,
  totalChars,
} from '../services/imageService';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  /** jumlah gambar maksimal */
  max?: number;
  /** anggaran total karakter base64 untuk seluruh gambar dalam daftar ini */
  budget?: number;
  /** tampilan ringkas untuk baris pilihan jawaban */
  compact?: boolean;
  label?: string;
  hint?: string;
}

const ImagePicker: React.FC<Props> = ({
  images,
  onChange,
  max = 3,
  budget = DEFAULT_BUDGET * 3,
  compact = false,
  label = 'Gambar Soal',
  hint,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const slots = Math.max(0, max - images.length);
  const used = totalChars(images);

  const addImages = async (files: FileList | File[]) => {
    setError('');
    const list = Array.from(files).slice(0, slots);
    if (!list.length) {
      setError(`Maksimal ${max} gambar.`);
      return;
    }
    setBusy(true);
    try {
      const next = [...images];
      for (const file of list) {
        const remaining = Math.max(3000, budget - totalChars(next));
        const perImage = Math.max(2500, Math.min(IMAGE_BUDGET_TOTAL, Math.floor(remaining / Math.max(1, max - next.length))));
        const result = await compressImage(file, perImage);
        next.push(result.dataUrl);
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memproses gambar.');
    } finally {
      setBusy(false);
    }
  };

  const addUrl = async () => {
    const value = url.trim();
    if (!value) return;
    setError('');
    if (images.length >= max) {
      setError(`Maksimal ${max} gambar.`);
      return;
    }
    setBusy(true);
    try {
      if (/^https?:\/\//i.test(value)) {
        // coba unduh & kompres agar tetap tampil saat offline / versi satu file
        try {
          const result = await compressImage(value, IMAGE_BUDGET_TOTAL);
          onChange([...images, result.dataUrl]);
        } catch {
          // gagal karena CORS → simpan sebagai tautan (butuh internet saat ujian)
          onChange([...images, value]);
          setError('Gambar dari tautan disimpan apa adanya (butuh internet saat ujian). Unggah berkas agar tersimpan permanen.');
        }
      } else {
        setError('Tautan gambar harus dimulai dengan http:// atau https://');
        setBusy(false);
        return;
      }
      setUrl('');
      setUrlMode(false);
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div className={compact ? 'mt-1.5' : ''}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`label !mb-0 ${compact ? 'text-[10px]' : ''}`}>
          {label}{' '}
          <span className="normal-case font-medium text-slate-400">
            ({images.length}/{max})
          </span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 ${
              compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
            }`}
            disabled={busy || slots === 0}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? '⏳ Memproses…' : compact ? '🖼️ Gambar' : '🖼️ Pilih Gambar'}
          </button>
          {!compact && (
            <button
              type="button"
              className="font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 px-2.5 py-1 text-[11px]"
              disabled={busy || slots === 0}
              onClick={() => setUrlMode((v) => !v)}
            >
              🔗 Tempel URL
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addImages(e.target.files);
          e.target.value = '';
        }}
      />

      {urlMode && !compact && (
        <div className="flex gap-1.5 mb-2">
          <input
            className="input !py-1.5 text-xs"
            placeholder="https://…/gambar.png"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <button type="button" className="btn-secondary !py-1.5 !px-3 text-xs" onClick={addUrl} disabled={busy}>
            Tambah
          </button>
        </div>
      )}

      {images.length > 0 ? (
        <div className={`flex flex-wrap gap-2 ${compact ? 'mb-1' : 'mb-2'}`}>
          {images.map((img, i) => (
            <div key={`${i}-${img.slice(0, 24)}`} className="relative group">
              <button
                type="button"
                onClick={() => setPreview(img)}
                className={`block rounded-lg overflow-hidden border border-slate-200 bg-slate-50 ${
                  compact ? 'w-14 h-14' : 'w-24 h-24'
                }`}
                title="Klik untuk memperbesar"
              >
                <img src={img} alt={`Gambar ${i + 1}`} className="w-full h-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow"
                title="Hapus gambar"
              >
                ✕
              </button>
              {!compact && (
                <span className="absolute bottom-0 left-0 right-0 bg-slate-900/70 text-white text-[9px] font-semibold text-center py-0.5">
                  {dataUrlKb(img)} KB
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        !compact && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) addImages(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-3 py-3 text-center transition ${
              dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-slate-50/60 hover:border-brand-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500">
              Tarik gambar ke sini atau klik untuk memilih berkas
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              JPG / PNG / WEBP · otomatis diperkecil agar hemat ruang
            </p>
          </div>
        )
      )}

      {hint && !compact && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">⚠️ {error}</p>}
      {!compact && used > 0 && (
        <p className="text-[10px] text-slate-400 mt-1">
          Total gambar soal ini: {Math.round(used / 1000)} ribu karakter (
          {dataUrlKb(images.join(''))} KB)
        </p>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="Pratinjau" className="max-h-[85vh] max-w-full rounded-xl shadow-2xl bg-white" />
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
