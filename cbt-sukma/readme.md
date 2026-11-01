# CBT Sekolah Sukma — MI Islamiyah &amp; SMP Al Hidayah

Aplikasi **Computer Based Test (CBT)** berbasis web untuk dua sekolah: **MI Islamiyah** dan **SMP Al Hidayah**.
Dibangun dengan React + TypeScript + Vite + Tailwind CSS, bekerja **100% offline** (data disimpan di
`localStorage` browser) dan opsional dapat disinkronkan ke Google Sheets / REST API sekolah.

---

## 🌐 Deploy ke Netlify (hosting online)

Folder **`../netlify-deploy/`** sudah siap unggah (drag & drop ke <https://app.netlify.com/drop>),
dan `netlify.toml` sudah tersedia untuk deploy lewat Git.

- **Akun demo tidak terpengaruh** oleh deploy: 12 akun bawaan (`admin/admin123`, `guru…`) selalu
  ditanam otomatis di setiap perangkat/browser yang penyimpanannya masih kosong.
- Akun yang ditambah lewat menu **Akun Login** serta data siswa/hasil ujian tersimpan **per perangkat**
  (localStorage). Data browser terikat pada **alamat situs**: pindah dari `file://` ke `netlify.app`
  dianggap situs baru → tarik ulang data dari Google Sheets (**Pengaturan → ⬇️ Tarik Data**).
- Koneksi database bisa langsung terisi otomatis lewat Environment Variables Netlify
  (`VITE_API_URL`, `VITE_API_KEY`), atau diisi manual sekali per perangkat di menu Pengaturan.
- Panduan lengkap: **`../PANDUAN-DEPLOY-NETLIFY.md`**.
- Perintah menyegarkan folder deploy: `npm run netlify`.

## 🚀 Cara Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
```

Build produksi:

```bash
npm run build      # hasil di folder dist/
npm run preview
```

**Versi 1 file (tanpa server / tanpa instalasi)** — cocok untuk lab komputer yang tidak ada internet:

```bash
npm run build && npm run standalone
# hasil: dist/cbt-sukma-standalone.html  → bisa dibuka langsung dengan double-click
```

---

## 🔑 Akun Demo

**10 akun guru** (5 MI Islamiyah + 5 SMP Al Hidayah), 1 proktor, dan 1 administrator:

| Login | Sandi | Nama | Cakupan |
|---|---|---|---|
| `guru.mi` | `guru123` | Ust. Ahmad Fauzi, S.Pd.I | MI Islamiyah (tema oranye) |
| `guru.mi2` | `guru123` | Ustzh. Siti Aminah, S.Pd | MI Islamiyah |
| `guru.mi3` | `guru123` | Ust. Muhammad Ridwan, S.Pd.I | MI Islamiyah |
| `guru.mi4` | `guru123` | Ustzh. Nur Hidayah, S.Ag | MI Islamiyah |
| `guru.mi5` | `guru123` | Ust. Zainal Abidin, S.Pd | MI Islamiyah |
| `guru.smp` | `guru123` | Bpk. Bambang Setiawan, S.Pd | SMP Al Hidayah (tema biru) |
| `guru.smp2` | `guru123` | Ibu Retno Wulandari, S.Pd | SMP Al Hidayah |
| `guru.smp3` | `guru123` | Bpk. Agus Prasetyo, M.Pd | SMP Al Hidayah |
| `guru.smp4` | `guru123` | Ibu Dwi Lestari, S.Pd | SMP Al Hidayah |
| `guru.smp5` | `guru123` | Bpk. Hendra Kusuma, S.Kom | SMP Al Hidayah |
| `guru` | `guru123` | Proktor Sekolah Sukma | Kedua sekolah |
| `admin` | `admin123` | Administrator | Semua (tosca) |
| Siswa (MI Islamiyah) | NIS `2510004`, `2510008`, … | `12345` |
| Siswa (SMP Al Hidayah) | NIS `2511004`, `2511008`, … | `12345` |

> Saat pertama kali dibuka, data masih kosong. Masuk sebagai **admin → Pengaturan → “Isi Data Contoh”**
> (atau klik tombol “⚡ Muat Data Contoh Sekarang” di dashboard) untuk memuat
> 16 siswa, 5 paket soal, 25 butir soal, 3 jadwal ujian, dan hasil ujian simulasi.

**Token ujian contoh:** `SUKMA5` (Literasi MI), `SUKMA8` (Numerasi SMP), `IPA8HD` (IPA SMP).

---

## 🏫 Akun Guru per Sekolah

Setiap guru/proktor sekolah masuk ke halaman sekolahnya sendiri:

- **`guru.mi` sampai `guru.mi5`** (sandi `guru123`) → seluruh tampilan (dashboard, bank soal, jadwal,
  monitoring, analisis, data siswa) hanya berisi data **MI Islamiyah**, template warna oranye.
- **`guru.smp` sampai `guru.smp5`** (sandi `guru123`) → hanya data **SMP Al Hidayah**, template biru.
- Daftar akun lengkap juga muncul di halaman login (tab **Guru / Admin → Akun demo**), klik salah
  satu untuk mengisi otomatis username & sandi.
- **Akun bisa ditambah / diubah / dihapus dari dalam aplikasi** oleh administrator lewat menu
  **🔑 Akun Login** (lihat bagian di bawah) — tidak perlu build ulang.
- Saat menambah siswa/paket soal/jadwal, kolom **Sekolah otomatis terkunci** sesuai akun guru.
- **`admin` / `admin123`** tetap dapat melihat dan mengelola kedua sekolah (warna dasar tosca).

## 🔑 Menu “Akun Login” (khusus administrator)

Masuk sebagai **`admin` / `admin123`** → sidebar **🔑 Akun Login**.

| Kemampuan | Keterangan |
|---|---|
| **+ Tambah Akun** | Isi username, kata sandi, nama lengkap, peran (**Guru / Proktor** atau **Administrator**), cakupan sekolah (MI / SMP / semua), dan label tampilan. Akun langsung aktif dipakai login. |
| **✏️ Ubah** | Ganti nama, sandi, peran, cakupan, atau label akun yang sudah ada. |
| **🗑️ Hapus** | Menghapus akun (dengan konfirmasi). Akun yang dihapus langsung tidak bisa login dan hilang dari daftar akun demo halaman login. |
| **♻️ Pulihkan Akun Bawaan** | Mengembalikan 12 akun bawaan (5 MI + 5 SMP + proktor + admin) bila ada akun yang terhapus. |
| Pencarian & filter | Cari berdasarkan username/nama, atau saring per cakupan (MI / SMP / semua). |
| Tampilkan sandi | Tombol 👁️ untuk memperlihatkan / menyembunyikan kolom kata sandi. |

Pengaman:

- Username harus unik (minimal 3 karakter: huruf kecil, angka, titik, garis bawah, strip) dan sandi
  minimal 5 karakter — pesan kesalahan muncul di dalam formulir.
- Akun **`admin`** dan akun yang **sedang dipakai login** tidak bisa dihapus (tombol Hapus nonaktif).
- Minimal harus ada satu akun Administrator.
- Menu Akun Login hanya terlihat untuk administrator; guru/proktor yang membukanya mendapat pesan
  “Access Denied”.
- Akun login disimpan di perangkat (localStorage `sukma_staff`), **tidak** ikut tersinkron ke Google
  Sheets. Jika data perangkat dibersihkan, akun kembali ke 12 akun bawaan.

## 🖼️ Gambar pada Soal &amp; Pilihan Jawaban

Menu **Bank Soal → (pilih paket) → ✏️ Edit / + Soal** kini punya penyisip gambar:

| Bagian | Cara pakai |
|---|---|
| **Gambar Soal (opsional)** | Klik **🖼️ Pilih Gambar**, tarik-lepas berkas ke kotak putus-putus, atau **🔗 Tempel URL**. Maksimal **3 gambar** per soal (grafik, diagram, foto, ilustrasi). |
| **Gambar pilihan jawaban** | Tombol **🖼️ Gambar** kecil di bawah tiap pilihan (A, B, C, …). Maksimal **1 gambar** per pilihan. |

Detail teknis &amp; pengamanan:

- Gambar **otomatis dikompres** (diperkecil + JPEG) sehingga tersimpan hemat: satu gambar ± 8–10 KB.
- Total gambar dalam satu soal dibatasi **± 27 KB**, karena soal disimpan sebagai satu sel JSON di
  Google Sheets (batas sel 50.000 karakter) — bila melebihi, muncul pesan
  “Gambar soal ini terlalu besar…”.
- Berkas yang diterima: JPG, PNG, WEBP, GIF (maks. **8 MB** sebelum dikompres).
- Gambar tersimpan **di dalam data soal** (bukan tautan), jadi tetap tampil pada versi satu file,
  saat offline, dan ikut tersinkron ke Google Sheets bersama soal.
- Klik gambar kecil untuk **memperbesar** (pratinjau), tombol **✕** untuk menghapus.
- Saat siswa mengerjakan ujian, gambar soal tampil besar (bisa diklik untuk dibuka penuh) dan
  gambar pilihan tampil di dalam kartu jawaban.
- Kartu daftar soal menampilkan thumbnail ⬜ agar guru mudah mengenali soal bergambar.
- Soal boleh berisi **gambar saja** tanpa teks pertanyaan; pilihan jawaban juga boleh berupa gambar.

Catatan: fitur **export/import Excel** hanya memindahkan teks soal &amp; pilihan (bukan gambar),
karena format `.xlsx` tidak menyimpan gambar di dalam sel.

## 🎨 Logo & Template Warna

- **Logo Sekolah Sukma**, **logo MI Islamiyah**, dan **logo SMP Al Hidayah** sudah terpasang di
  halaman login, sidebar, topbar, dashboard siswa, serta antarmuka ujian (logo di-embed sebagai
  data-URI sehingga tetap tampil pada versi satu file).
- **Warna dasar aplikasi: tosca** (portal Guru &amp; Admin).
- **Template warna per sekolah** — otomatis aktif sesuai sekolah pengguna:
  | Sekolah | Template | Warna utama |
  |---|---|---|
  | MI Islamiyah | **Oranye** | `#ea580c` |
  | SMP Al Hidayah | **Biru** | `#1d4ed8` |
- **Halaman login memakai poster “Sekolah Para Juara”** sebagai latar penuh (`src/assets/login-bg.jpg`,
  di-embed sebagai data-URI lewat `npm run logos`). Tidak ada lagi lapisan warna orange/biru di belakang —
  warnanya diambil dari foto apa adanya, hanya diberi bayangan netral di sisi teks agar tetap terbaca.
  Warna tombol & aksen tetap menyesuaikan sekolah yang dipilih (MI oranye, SMP biru, guru/admin tosca).
- Penerapan template: halaman login, sidebar, dashboard siswa, kartu ujian, halaman ujian,
  Monitoring &amp; Analisis (mengikuti sekolah ujian yang dipilih), serta badge sekolah.
- Pratinjau ketiga template tersedia di **Pengaturan → Tema & Template Warna**.
- Kode tema terpusat di `src/theme.ts` + variabel CSS `--brand-*` pada `src/index.css`
  (ganti nilai satu variabel untuk mengubah seluruh warna template).

## ✨ Fitur Utama

### Sisi Guru / Admin
- **Dashboard** – statistik siswa, ujian aktif, jumlah paket soal Literasi &amp; Numerasi.
- **Data Siswa** – CRUD siswa, filter per sekolah/kelas, **import dari file Excel `.xlsx` / `.xls` / CSV**
  (tombol **Pilih File** + **Template Excel** siap isi, juga tetap bisa tempel manual),
  **export `.xlsx`** atau **CSV**, kata sandi siswa.
- **Bank Soal** – paket soal per kategori (Literasi, Numerasi, Sains, Mapel) &amp; per sekolah,
  4 tipe soal: pilihan ganda, pilihan ganda kompleks, benar/salah, dan uraian.
  **Bisa menyisipkan gambar pada soal (maks. 3) dan pada setiap pilihan jawaban.**
  Dilengkapi stimulus/teks bacaan, kunci jawaban, skor per butir, pembahasan, duplikasi soal.
- **Jadwal Ujian** – tanggal, jam, durasi, **token acak**, kelas peserta, KKM, acak urutan soal,
  aktif/nonaktif, duplikasi jadwal.
- **Monitoring** – pemantauan **real-time** (refresh 5 detik): progres jawaban per siswa,
  sisa waktu, nilai sementara, jumlah pelanggaran (keluar layar), **perangkat yang dipakai**,
  **Akhiri Sesi** (melepas kunci perangkat siswa), **kirim paksa** &amp; **reset ujian**.
- **Akun Login** (khusus admin) – tambah / ubah / hapus akun guru, proktor, dan administrator
  langsung dari aplikasi; akun baru langsung bisa dipakai login (lihat bagian **Menu “Akun Login”**).
- **Analisis Hasil** – rata-rata/tertinggi/terendah, ketuntasan vs KKM, distribusi nilai,
  peringkat 10 besar, **analisis tingkat kesukaran butir soal** (mudah/sedang/sulit),
  **koreksi jawaban uraian**, rekap nilai + **export Excel `.xlsx`** / **CSV**.
- **Pengaturan** – identitas aplikasi, tahun pelajaran, KKM default, mode anti-kecurangan,
  URL database/sinkronisasi, **Perbaiki Database**, **Isi Data Contoh**, **backup/restore JSON**, reset data.

### Sisi Siswa
- Login dengan **NIS** + pilih sekolah, tanpa perlu email.
- Beranda siswa: ringkasan ujian menunggu, ujian selesai, rata-rata nilai.
- **Ujian Saya** – daftar ujian sesuai kelas, status (tersedia / berlangsung / selesai), input **token**.
- **Antarmuka ujian**:
  - timer hitung mundur + **auto-submit** saat waktu habis,
  - navigasi nomor soal, penanda **ragu-ragu**, indikator soal terjawab,
  - **jawaban tersimpan otomatis** setiap klik,
  - konfirmasi sebelum mengumpulkan + rekap soal kosong,
  - **anti-kecurangan**: mencatat ketika siswa berpindah tab/aplikasi,
  - dukungan soal uraian (dinilai guru).
- **Hasil Ujian** – daftar nilai, predikat, dan **pembahasan per butir** (jawaban Anda vs kunci jawaban).

### 🔒 Keamanan &amp; 📱 Tampilan HP
- **Satu akun siswa = satu perangkat/tab.** Login kedua dengan NIS yang sama akan ditolak
  dengan layar **"Akun Sedang Digunakan"** (menyebut perangkat yang sedang aktif).
  Sesi berjalan memakai *heartbeat* 15 detik; bila tab lama ditutup/browser mati,
  sesi otomatis kedaluwarsa dalam ±1 menit sehingga siswa bisa masuk lagi.
- Jika siswa berganti HP karena perangkat lama rusak/hilang, guru atau proktor membuka
  **Monitoring → kolom Perangkat → tombol "Akhiri Sesi"**, lalu siswa dapat login kembali.
  Logout normal juga langsung melepas sesi.
### 📊 Format Excel (.xlsx)
- **Unduh:** Data Siswa dan Analisis Hasil punya tombol **⬇️ Excel** (`.xlsx`) di samping **⬇️ CSV**.
  File langsung bisa dibuka di Microsoft Excel / WPS / Google Sheets, lengkap dengan lebar kolom.
- **Unggah:** menu **Data Siswa → ⬆️ Import** menyediakan tombol **Pilih File** untuk `.xlsx`, `.xls`,
  atau `.csv`. Baris judul kolom otomatis dilewati, dan tersedia **⬇️ Template Excel** berisi
  contoh format: `NIS, Nama, Sekolah, Kelas, JK, Password`.
- Guru yang terikat satu sekolah hanya bisa mengimpor siswa sekolahnya sendiri (baris sekolah lain dilewati).
- Pembaca/penulis Excel memakai pustaka **SheetJS (`xlsx`)** yang sudah ada di `package.json`
  (jalankan `npm install` sekali setelah mengunduh zip).
- **Responsif penuh untuk HP**: sidebar berubah menjadi tombol menu, kartu statistik 2 kolom,
  Monitoring memakai kartu (bukan tabel lebar), dan halaman ujian punya **bilah bawah**
  (◀ Sebelumnya / nomor soal / Berikutnya ▶ / Kumpulkan) plus **panel navigasi soal**
  yang bisa dibuka-tutup. Tidak ada halaman yang melebar ke samping di layar 390 px.

---

## 👦 Data Siswa MI Islamiyah (kelas 4A–6B, 197 siswa)

Data asli siswa MI Islamiyah sudah dimasukkan (sumber: daftar hadir 8 halaman).

| Kelas | 4A | 4B | 4C | 5A | 5B | 5C | 6A | 6B | Total |
|---|---|---|---|---|---|---|---|---|---|
| Jumlah | 29 | 30 | 29 | 20 | 21 | 20 | 24 | 24 | **197** |

- **Sandi semua siswa: `12345`** (bisa dikosongkan/diubah per siswa di menu Data Siswa).
- Sudah dikirim ke Google Sheets (`Students`), jadi tinggal **Pengaturan → ⬇️ Tarik Data** di perangkat guru.
- File siap impor ada di folder `../data-siswa/`:
  `Import-Siswa-MI-Islamiyah-4A-6B.xlsx` (semua kelas, 1 sheet) dan
  `per-kelas/Import-Siswa-MI-4A.xlsx` … `6B.xlsx`. Format kolom:
  `NIS, Nama, Sekolah, Kelas, JK, Password`.
- Perintah kirim ulang ke sheet:
  `node scripts/push-students.mjs --push --url "<URL /exec>" --key "<KUNCI>"`
- Hapus siswa contoh (NIS berawalan `253…`):
  `node scripts/clean-demo.mjs --push --url "<URL /exec>" --key "<KUNCI>"`
  (butuh Code.gs **v2.1** yang sudah di-deploy ulang; alternatif: hapus barisnya langsung di sheet `Students`).

## 🧪 Data Uji Coba (40 siswa + 8 paket soal)

Folder **`data-uji/`** berisi data siap pakai untuk uji coba:

| File | Isi |
|---|---|
| `Siswa-MI-Islamiyah.xlsx` | 20 siswa MI (kelas 5A & 6A), NIS `2530001`–`2530020`, sandi `12345` |
| `Siswa-SMP-Al-Hidayah.xlsx` | 20 siswa SMP (kelas 7A & 8A), NIS `2531001`–`2531020`, sandi `12345` |
| `Bank-Soal-MI-Islamiyah.xlsx` | Ringkasan 20 butir soal MI + kunci (Literasi, Numerasi, PAI, Bahasa Arab) |
| `Bank-Soal-SMP-Al-Hidayah.xlsx` | Ringkasan 20 butir soal SMP + kunci |
| `Backup-CBT-Sukma-2026.json` | Backup lengkap (siswa + paket + soal + jadwal) → **Pengaturan → Restore** |

Jadwal uji (aktif, tanggal 01 Nov 2026)

| Sekolah | Mapel | Kelas | Token | Durasi |
|---|---|---|---|---|
| MI Islamiyah | Literasi | 5A, 6A | `MILIT5` | 60 mnt |
| MI Islamiyah | Numerasi | 5A, 6A | `MINUM5` | 60 mnt |
| MI Islamiyah | PAI | 5A, 6A | `MIPAI5` | 45 mnt |
| MI Islamiyah | Bahasa Arab | 5A, 6A | `MIBAR5` | 45 mnt |
| SMP Al Hidayah | Literasi | 7A, 8A | `SMPLIT` | 60 mnt |
| SMP Al Hidayah | Numerasi | 7A, 8A | `SMPNUM` | 60 mnt |
| SMP Al Hidayah | PAI | 7A, 8A | `SMPPAI` | 45 mnt |
| SMP Al Hidayah | Bahasa Arab | 7A, 8A | `SMPBAR` | 45 mnt |

Setiap paket berisi 5 butir: pilihan ganda, benar/salah, PG kompleks, dan **1 soal uraian**
(untuk mencoba alur koreksi guru). Skor maksimal per paket 7–8 poin.

Membuat ulang / mengirim ulang ke Google Sheet:

```bash
node scripts/seed-trial.mjs --write
node scripts/seed-trial.mjs --push --url "https://script.google.com/macros/s/.../exec" --key "KUNCI"
```

---

## 🗂️ Struktur Proyek

```
src/
├─ App.tsx                     # routing peran (admin/guru/siswa)
├─ index.tsx, index.css        # entry point + Tailwind
├─ types.ts                    # tipe data & helper (UserRole, Exam, Question, …)
├─ theme.ts                    # tema warna: tosca dasar / MI (oranye) / SMP (biru)
├─ assets/
│  ├─ logo-*.png               # logo Sukma, MI Islamiyah, SMP Al Hidayah
│  └─ logos.ts                 # logo sebagai data-URI (auto-generate: npm run logos)
├─ components/
│  ├─ Layout.tsx               # sidebar + topbar (menu berbeda per peran)
│  ├─ Brand.tsx                # komponen logo & badge sekolah
│  └─ ui.tsx                   # Card, Modal, Badge, StatCard, Toast, dll.
├─ services/
│  ├─ storageService.ts        # "database" localStorage + sinkronisasi + seed
│  ├─ securityService.ts       # kunci 1 akun = 1 perangkat (sesi + heartbeat)
│  ├─ excelService.ts          # unduh & baca file Excel (.xlsx)
│  ├─ apiService.ts            # kirim hasil & sesi ke Google Sheets (antrean + retry)
│  ├─ authService.ts           # akun guru/admin per sekolah + scoping data
│  └─ seedData.ts              # data contoh (siswa, paket, soal, jadwal)
├─ utils/scoring.ts            # penilaian otomatis, persentase, predikat
└─ google-apps-script/         # backend Google Sheets (Code.gs + panduan)
└─ pages/
   ├─ Login.tsx
   ├─ admin/    StudentData · QuestionBank · ExamSchedule · Monitoring · Analysis · Settings
   └─ student/  StudentDashboard · StudentExamList · ExamInterface · StudentResults
```

---

## ☁️ Backend Google Sheets (Opsional, sudah disiapkan)

Aplikasi berjalan penuh secara offline. Bila ingin nilai terkumpul dari banyak PC/HP sekaligus,
seluruh backend sudah tersedia di folder **`google-apps-script/`**:

| File | Isi |
|---|---|
| `Code.gs` | Seluruh backend Apps Script (doGet/doPost, `LockService`, sheet otomatis) |
| `README-PANDUAN.md` | Panduan pasang langkah demi langkah + troubleshooting |

**Ringkasnya:** buat Spreadsheet → Extensions → Apps Script → tempel `Code.gs` → ganti `API_KEY`
→ Deploy sebagai Web App (*Execute as: Me*, *Access: Anyone*) → salin URL `/exec` → tempel di
**Pengaturan → URL Database / API** beserta **Kunci API** → **Tes Koneksi**.

Yang berjalan otomatis setelah terhubung:

- **Nilai terkirim sendiri** setiap siswa menekan *Kumpulkan* (satu baris per siswa di sheet `Results`).
- **Antrean otomatis**: bila internet putus, hasil disimpan di perangkat lalu dikirim ulang lewat
  **Pengaturan → Kirim Hasil Tertunda (n)** atau otomatis saat aplikasi dibuka kembali.
- **Tarik Data**: menarik data terbaru dari sheet ke PC guru.
- **1 akun = 1 perangkat berlaku lintas perangkat**: login dicek ke server, dan guru dapat
  melepasnya dari **Monitoring → Akhiri Sesi** (sesi server ikut berubah menjadi `released`).
- Pengaman tambahan: `LockService` mencegah dua siswa yang mengumpulkan hampir bersamaan saling
  menimpa data.

> Catatan keamanan: kunci API pada aplikasi web bersifat *pengaman ringan* (bisa dilihat dari F12).
> Ganti kunci setiap semester dan jangan menaruh data sensitif pada sheet yang dibagikan.
> Detil lengkap, kuota, dan pemecahan masalah ada di `google-apps-script/README-PANDUAN.md`.

---

## 💡 Catatan Teknis

- Data tersimpan per-browser. Untuk ujian nyata, hubungkan backend Google Sheets di atas agar hasil
  terkumpul di satu tempat; tanpa backend, tiap PC menyimpan datanya sendiri.
- Nilai dihitung dari **skor butir** (bukan jumlah soal), jadi bobot soal uraian bisa lebih besar.
- Soal uraian bertanda *“menunggu koreksi”* sampai guru memberi nilai di menu **Analisis → Koreksi Uraian**.
- Ujian tetap dapat dikerjakan sepanjang hari jadwal (window susulan) meskipun jam mulai sudah lewat;
  setelah tanggalnya berakhir, siswa tidak dapat memulai lagi.

---

© 2025/2026 Sekolah Sukma · MI Islamiyah &amp; SMP Al Hidayah — Aplikasi CBT v1.0
