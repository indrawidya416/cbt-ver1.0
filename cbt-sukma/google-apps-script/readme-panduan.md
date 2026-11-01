# Panduan Pemasangan Backend — Google Sheets (Apps Script)

> **Versi `Code.gs`: 2.0** — memuat perbaikan sesi (`start`/`heartbeat`/`end`), aksi
> `deleteResult`, serta alat bantu `testSesi` dan `bersihkanDataUji` yang dijalankan
> langsung dari editor Apps Script.

Panduan ini menghubungkan **CBT Sekolah Sukma** dengan **Google Spreadsheet** sebagai database
online: nilai ujian siswa otomatis masuk ke spreadsheet, data bisa ditarik ke semua PC, dan
proteksi **1 akun = 1 perangkat** berlaku lintas perangkat.

> Aplikasi tetap bisa dipakai **tanpa** langkah ini (mode offline penuh). Backend baru diperlukan
> bila ingin mengumpulkan nilai dari banyak PC/handphone sekaligus.

---

## 1. Siapkan Spreadsheet

1. Buka <https://sheets.new> → beri nama, misalnya **Database CBT Sukma**.
2. Klik menu **Extensions → Apps Script**. Tab baru berisi `Code.gs` akan terbuka.
3. Hapus semua isi `Code.gs`, lalu **tempel seluruh isi file `Code.gs`** dari folder
   `google-apps-script/` pada aplikasi ini.
4. Ganti baris konfigurasi paling atas:

   ```js
   const API_KEY = 'GANTI-KUNCI-RAHASIA-ANDA';
   ```

   Buat kunci acak yang panjang dan sulit ditebak, contoh:
   `sukma-kebonsari-7f3a9c21e4`. Jangan pakai spasi/tanda kutip di dalamnya.
   *(Kunci ini nanti diisikan ke aplikasi pada menu Pengaturan.)*
5. (Opsional) Klik **File → Project Settings → Time zone** → pilih **(GMT+07:00) Jakarta**.
6. Simpan (Ctrl+S).

## 2. Buat sheet otomatis

Di editor Apps Script, pilih fungsi **`setupSheets`** pada daftar fungsi → klik **Run**.
Izinkan akses saat diminta (*Review permissions → pilih akun → Advanced → Go to project → Allow*).

Setelah selesai, spreadsheet akan memiliki sheet:
`Students`, `Results`, `Sessions`, `Exams`, `Questions`, `Packets`.
Sheet `Results` inilah yang dibaca guru (nilai per siswa per ujian).

## 3. Deploy sebagai Web App

1. Klik **Deploy → New deployment**.
2. Pilih jenis **Web app**.
3. Isi:
   - **Description**: `CBT Sukma v1`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**  ← *wajib "Anyone"*, bukan "Anyone with Google account"
4. Klik **Deploy** → **Authorize access** → izinkan.
5. Salin **Web app URL** (berakhiran `/exec`), contoh:

   ```
   https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxx/exec
   ```

> ⚠️ Setiap kali Anda mengubah `Code.gs`, lakukan **Deploy → Manage deployments → Edit → Version:
> New version → Deploy**. Kalau tidak, perubahan tidak terpakai.

## 4. Uji koneksi dari browser

Tempel URL berikut di browser (ganti `URL_ANDA` dan `KUNCI`):

```
URL_ANDA?action=ping&key=KUNCI
```

Harus muncul balasan seperti:

```json
{"ok":true,"time":"2026-11-01T07:15:00+07:00","tz":"Asia/Jakarta","sheets":["Students","Results","Sessions","Exams","Questions","Packets"]}
```

Bila muncul `Kunci API (key) tidak valid.` → `API_KEY` di Code.gs belum diganti atau salah ketik.
Bila muncul halaman login Google → deployment belum "Anyone".

## 5. Hubungkan aplikasi

1. Buka aplikasi CBT (sebagai **guru/admin**) → menu **Pengaturan**.
2. Isi:
   - **URL Database / API**: URL `/exec` tadi
   - **Kunci API (key)**: sama dengan `API_KEY` di Code.gs
3. Klik **📡 Tes Koneksi** → harus muncul "Koneksi berhasil".
4. Klik **💾 Simpan & Tarik Data**. Data master (siswa, paket soal, jadwal) akan ditarik dari sheet
   bila sheet sudah berisi data.

## 6. Cara kerja setelah terhubung

| Kejadian | Yang terjadi |
|---|---|
| Siswa menekan **Kumpulkan** | Nilai + seluruh jawaban dikirim ke sheet `Results` (satu baris per siswa per ujian) |
| Internet putus saat mengumpulkan | Hasil disimpan di perangkat & masuk **antrean**; dikirim otomatis saat aplikasi dibuka lagi |
| Guru menekan **Kirim Hasil Tertunda (n)** | Mengirim ulang semua hasil yang masih mengantre |
| Siswa login | Aplikasi mengecek sesi ke server; bila akun aktif di perangkat lain → login ditolak |
| Guru menekan **Akhiri Sesi** di Monitoring | Sesi di server ditandai `released`; siswa bisa login kembali |
| Guru menekan **Tarik Data** | Menarik data terbaru dari sheet ke PC guru |

Kolom penting pada sheet **Results**:
`resultId, examId, examTitle, nis, studentName, className, school, status, autoScore, manualScore,
maxScore, needsGrading, violationCount, deviceId, deviceLabel, startedAt, submittedAt, updatedAt, answersJson`

> `answersJson` berisi seluruh jawaban siswa (dipakai saat tarik data). **Jangan dihapus/diedit**,
> tetapi aman untuk disembunyikan kolomnya bila guru hanya ingin melihat nilai.

## 7. Hal yang harus diperhatikan

- **Kunci API di aplikasi bersifat "pengaman ringan".** Siapa pun yang bisa membuka file HTML dan
  menekan F12 dapat melihat URL & kuncinya. Untuk sekolah ini biasanya cukup; ganti kunci setiap
  semester agar aman.
- **Jangan menaruh kata sandi siswa di sheet yang dibagikan.** Kolom `password` di sheet `Students`
  hanya untuk keperluan aplikasi.
- **Kuota Google** (bisa berubah): Apps Script punya batas eksekusi & panggilan harian, dan Google
  Sheets dibatasi jumlah sel. Untuk skala satu sekolah (ratusan siswa, beberapa ujian/semester),
  biasanya jauh dari batas.
- **Latensi** tiap permintaan 1–3 detik. Karena itu jawaban disimpan lokal dan hanya dikirim sekali
  saat mengumpulkan — jangan mengubah desain ini menjadi kirim per klik.
- **Tulisan bersamaan** ditangani `LockService` di `Code.gs` agar dua siswa yang mengumpulkan
  hampir bersamaan tidak saling menimpa.
- **Cadangkan tetap penting:** gunakan **Pengaturan → Backup (JSON)** setiap selesai ujian, karena
  internet/kuota bisa bermasalah sewaktu-waktu.

## 8. Pemecahan masalah (troubleshooting)

| Gejala | Penyebab & solusi |
|---|---|
| `Gagal terhubung: Failed to fetch` | URL salah (bukan `/exec`), belum deploy, atau akses bukan "Anyone" |
| Muncul halaman login Google saat dibuka | Deploy ulang dengan **Who has access: Anyone** |
| `Kunci API (key) tidak valid` | `API_KEY` di Code.gs ≠ isian **Kunci API** di Pengaturan |
| Data tidak muncul di sheet | Belum klik **Kumpulkan**; atau siswa mengumpulkan saat offline → cek **Kirim Hasil Tertunda** |
| Tanggal di sheet bergeser 7 jam | Time zone project Apps Script belum `Asia/Jakarta` |
| Perubahan Code.gs tidak berefek | Deploy ulang dengan **New version** |
| `Terlalu banyak permintaan` (quota) | Tunggu hingga kuota harian pulih; pakai mode lokal sementara |
| Sesi siswa tidak terkunci lintas PC | URL/Kunci belum diisi di **semua** PC, atau sheet `Sessions` sudah terisi `released` |

## 8b. Alat bantu di editor Apps Script

Buka `Code.gs` → pilih fungsi di daftar fungsi → **Run**:

| Fungsi | Kegunaan |
|---|---|
| `setupSheets` | Membuat/menyiapkan semua sheet + header |
| `testPing` | Menampilkan hasil `action=ping` di Execution log |
| `testSesi` | Uji alur sesi: start → blokir perangkat lain → release (otomatis bersih-bersih) |
| `bersihkanDataUji` | Menghapus baris uji coba di `Results` & `Sessions` (NIS/ID berawalan `UJI`/`TEST`, atau NIS `9999999`) |

Aksi endpoint yang tersedia:
`getAll`, `getAllSessions`, `session` (check/start/heartbeat/end/release), `releaseSession`,
`submitResult`, `submitResults`, `pushAll`, `deleteResult` (`resultId` atau `nis`).

## 9. Uji cepat sebelum dipakai siswa

1. Pengaturan → **Tes Koneksi** ✅
2. Login 1 siswa → cek muncul baris baru di sheet `Sessions`.
3. Login siswa yang sama di perangkat kedua → harus ditolak.
4. Guru klik **Akhiri Sesi** → siswa bisa login lagi.
5. Siswa mengerjakan 1 ujian → klik Kumpulkan → cek baris baru di sheet `Results` dengan nilai benar.
6. Putuskan internet siswa, kumpulkan ujian lagi → status "antrean" → sambungkan internet →
   **Kirim Hasil Tertunda** → baris muncul di sheet.


---

## Versi 2.1 — hapus data siswa lewat API

Tambahan action baru (POST): `deleteStudents`

```json
{ "key": "KUNCI", "action": "deleteStudents", "prefixes": ["253"] }
```

- `nisList` untuk NIS tertentu, `prefixes` untuk awalan NIS (mis. `253` = seluruh siswa contoh).
- Setelah mengganti `Code.gs`: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
- Cek versi: buka `<URL>/exec?action=ping&key=KUNCI` → harus `"version":"2.1"`.
- Alat editor tambahan: fungsi `hapusSiswaContoh()` (jalankan dari Apps Script → Run).
