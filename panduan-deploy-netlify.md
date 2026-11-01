# 🚀 Panduan Deploy ke Netlify — CBT Sekolah Sukma

## 1. Apakah akun demo terpengaruh? **Tidak.**

| Hal | Pengaruh setelah deploy ke Netlify |
|---|---|
| **12 akun demo bawaan** (`admin`, `guru`, `guru.mi`…`guru.mi5`, `guru.smp`…`guru.smp5`) | **Tetap ada.** Setiap kali aplikasi dibuka di perangkat yang penyimpanannya masih kosong, 12 akun ini otomatis ditanam lagi (sandi guru `guru123`, admin `admin123`). |
| **Akun yang Anda tambahkan** lewat menu **🔑 Akun Login** | Tetap ada **di perangkat itu**, karena disimpan di penyimpanan browser (localStorage), bukan di server. Tidak ikut ter-deploy dan **tidak otomatis muncul di perangkat lain**. |
| **Daftar akun demo di halaman login** | Otomatis menampilkan jumlah akun yang ada di perangkat tersebut (mis. 13 akun bila Anda menambah 1). |
| **Siswa, soal, jadwal, hasil ujian** | Sama: tersimpan per perangkat, dan bisa disamakan lewat **Pengaturan → ⬇️ Tarik Data** (sumber: Google Sheets). |

### ⚠️ Satu hal yang paling sering bikin bingung: alamat situs = "identitas" penyimpanan

Data browser (akun tambahan, daftar siswa, hasil ujian) terikat pada **alamat/domain** aplikasi.

| Pindah dari | Ke | Akibatnya |
|---|---|---|
| `file:///…/CBT-Sekolah-Sukma.html` | `https://nama-situs.netlify.app` | Dianggap **situs baru** → mulai dari nol (12 akun demo). Data lama di file HTML tidak terbawa. Data siswa tinggal ditarik dari Google Sheet. |
| Netlify → Netlify (redeploy / update versi) | alamat sama | Data **tetap utuh** (tidak hilang). |
| `nama-situs.netlify.app` | domain sendiri (`cbt.sekolahsukma.sch.id`) | Dianggap situs baru → mulai dari nol lagi. Kalau mau pindah domain, lakukan **sekali di awal**, sebelum dipakai siswa. |
| Ganti nama site Netlify | alamat baru | Sama seperti di atas — hindari setelah dipakai. |

> **Rekomendasi:** tentukan dulu alamat final (atau pasang custom domain), **baru** bagikan ke guru/siswa.

## 2. Yang sudah siap di workspace

| Folder / file | Isi |
|---|---|
| `netlify-deploy/` | **Folder siap unggah** (index.html + assets + netlify.toml + _redirects), ± 1,4 MB |
| `cbt-sukma/netlify.toml` | Konfigurasi untuk deploy via Git (build `npm run build`, publish `dist`) |
| `cbt-sukma/scripts/build-netlify.mjs` | `npm run netlify` → build ulang + menyegarkan folder `netlify-deploy/` |
| `CBT-Sekolah-Sukma.html` | Versi satu file (bisa juga dijadikan `index.html` di Netlify) |

## 3. Cara deploy (pilih salah satu)

### A. Cara tercepat — unggah folder (tanpa Git)

1. Buka <https://app.netlify.com/drop>
2. Tarik **folder `netlify-deploy`** ke halaman itu (bukan file satu per satu).
3. Tunggu ± 10 detik → situs langsung online (`https://xxx-yyy.netlify.app`).
4. Buka **Site configuration → Change site name** untuk mengganti alamat, mis. `cbt-sekolah-sukma`.

> Kalau hanya ingin mengunggah versi satu file: ubah nama `CBT-Sekolah-Sukma.html` menjadi `index.html`,
> lalu tarik file itu saja. Semuanya berjalan tanpa folder `assets`.

### B. Cara Git (otomatis build setiap update)

1. Unggah folder `cbt-sukma` ke GitHub/GitLab.
2. Netlify → **Add new site → Import an existing project** → pilih repo.
3. Build command: `npm run build` · Publish directory: `dist` (sudah tercantum di `netlify.toml`).
4. Setiap `git push`, Netlify build & deploy otomatis.

### C. Cara CLI

```bash
npm install -g netlify-cli
cd netlify-deploy
netlify deploy --prod --dir .
```

## 4. Setelah deploy — sambungkan ke Google Sheets

Aplikasi ini menyimpan data di perangkat + Google Sheets. Agar semua HP/laptop memakai data yang sama
(237 siswa, dsb.), ada 2 pilihan:

**Pilihan 1 — isi sekali per perangkat (tanpa build ulang)**
1. Login `admin` → **⚙️ Pengaturan**
2. Isi **URL Database** = `https://script.google.com/macros/s/AKfycbwVIaEkfjgU0dvbByC1ZjoGZnNhFbw-JulnFGJVrcyvWFzEebVxf0ZFoOs_5ZmKoHeL/exec`
3. Isi **Kunci API** = `uji-cbt-sukma-1f4b7c`
4. Klik **Tes Koneksi** → **Simpan** → **⬇️ Tarik Data**

**Pilihan 2 — otomatis untuk semua perangkat (Environment Variables)**
1. Netlify → **Site configuration → Environment variables → Add a variable**
   - `VITE_API_URL` = URL `/exec` di atas
   - `VITE_API_KEY` = kunci API
2. **Deploys → Trigger deploy → Clear cache and deploy site**
3. Semua perangkat yang membuka aplikasi langsung terhubung.

> 🔐 **Catatan keamanan:** situs Netlify bersifat publik, sehingga kunci API yang ditulis di
> Environment Variables **bisa dibaca siapa pun** dari kode halaman. Untuk kelas yang benar-benar
> dipakai, gantilah kunci tersebut (di `Code.gs`) dan jangan tampilkan alamat situs ke publik.
> Kalau tidak ingin kunci terlihat, pakai **Pilihan 1** (diisi manual, tersimpan di perangkat).

## 5. Checklist uji setelah deploy (5 menit)

1. Buka alamat situs → halaman login + poster tampil.
2. Tab **Guru / Admin** → muncul **12 akun demo** → klik `admin / admin123` → masuk.
3. Menu **⚙️ Pengaturan** → **Tes Koneksi** → “Koneksi berhasil”.
4. **⬇️ Tarik Data** → menu **Data Siswa** menampilkan **237 siswa** (termasuk 4A–6B).
5. Menu **🔑 Akun Login** → tambah 1 akun guru → login dengan akun itu → berhasil.
6. Buka di **HP** → login siswa (`NIS`, sandi `12345`) → ujian tampil & nyaman.
7. Refresh halaman → data & akun tetap ada.

## 6. Catatan penting

- **Jangan** pakai dua alamat berbeda (mis. `file://` dan `netlify.app`) bergantian untuk mengerjakan ujian —
  datanya terpisah.
- Bila suatu saat memindahkan alamat situs, lakukan **Tarik Data** di perangkat yang datanya masih ada
  **sebelum** pindah, atau andalkan Google Sheets sebagai sumber utama.
- Akun login masih tersimpan **per perangkat** (belum tersinkron ke Google Sheets). Bila ingin akun guru
  otomatis sama di semua perangkat, minta pengembangan lanjutan: sheet `Staff` + action `pushStaff`
  di `Code.gs`.
