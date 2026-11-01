/**
 * Membuat DATA UJI CBT Sekolah Sukma:
 *  - 20 siswa MI Islamiyah (kelas 5A & 6A) + 20 siswa SMP Al Hidayah (kelas 7A & 8A)
 *  - 4 paket soal per sekolah: Literasi, Numerasi, PAI, Bahasa Arab (masing-masing 5 butir)
 *  - 4 jadwal ujian per sekolah (token aktif, hari ini)
 *
 * Keluaran:
 *   data-uji/Backup-CBT-Sukma-2026.json      → bisa dipulihkan via Pengaturan → Restore
 *   data-uji/Siswa-MI-Islamiyah.xlsx         → import lewat Data Siswa
 *   data-uji/Siswa-SMP-Al-Hidayah.xlsx
 *   data-uji/Bank-Soal-MI-Islamiyah.xlsx     → ringkasan soal + kunci (untuk review guru)
 *   data-uji/Bank-Soal-SMP-Al-Hidayah.xlsx
 *   lalu (opsional) dikirim ke Google Sheet via action=pushAll
 *
 * Jalankan:
 *   node scripts/seed-trial.mjs --write
 *   node scripts/seed-trial.mjs --push --url "https://.../exec" --key "KUNCI"
 */
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const TODAY = '2026-11-01';
const CREATED = new Date().toISOString();

/* ============================== SISWA ================================== */
const MI_NAMES = [
  ['Ahmad Fauzan Ramadhan', 'L'], ['Aisyah Putri Ramadhani', 'P'], ['Bagas Aditya Pratama', 'L'],
  ['Citra Ayu Lestari', 'P'], ['Dimas Ardiansyah', 'L'], ['Elsa Nur Aini', 'P'],
  ['Fahri Abdillah', 'L'], ['Gita Puspita Sari', 'P'], ['Hafizh Maulana Yusuf', 'L'],
  ['Indah Nur Fadilah', 'P'], ['Joko Santoso Putra', 'L'], ['Khalisa Zahra Azzahra', 'P'],
  ['Lukman Hakim', 'L'], ['Maulida Rahmawati', 'P'], ['Naufal Rizky Hidayat', 'L'],
  ['Nabila Syafira Putri', 'P'], ['Rafi Athallah Wijaya', 'L'], ['Salma Kamila Husna', 'P'],
  ['Zaki Mubarak', 'L'], ['Zahra Aulia Rahma', 'P'],
];
const SMP_NAMES = [
  ['Aditya Bagus Saputra', 'L'], ['Aulia Rahmadani', 'P'], ['Bayu Prasetyo Aji', 'L'],
  ['Cahya Ningrum Sari', 'P'], ['Dava Airlangga Putra', 'L'], ['Dewi Amalia Rahmawati', 'P'],
  ['Eka Nur Cahyono', 'L'], ['Farah Nabila Zahra', 'P'], ['Galih Ramadhan Saputra', 'L'],
  ['Hanifah Salma Aulia', 'P'], ['Ilham Maulana Akbar', 'L'], ['Kirana Ayu Wardani', 'P'],
  ['Muhammad Rizky Pratama', 'L'], ['Nadia Salsabila Putri', 'P'], ['Oktavia Dwi Anggraini', 'P'],
  ['Rizal Fahmi Ardiansyah', 'L'], ['Salsabila Putri Ramadhani', 'P'], ['Tegar Bagas Prakoso', 'L'],
  ['Vina Ayu Safitri', 'P'], ['Yusuf Abdurrahman Hakim', 'L'],
];

const buildStudents = () => {
  const mi = MI_NAMES.map(([name, gender], i) => ({
    id: `std_mi_${String(i + 1).padStart(2, '0')}`,
    nis: String(2530001 + i),
    name,
    school: 'MI Islamiyah',
    className: i < 10 ? '5A' : '6A',
    gender,
    password: '12345',
    createdAt: CREATED,
  }));
  const smp = SMP_NAMES.map(([name, gender], i) => ({
    id: `std_smp_${String(i + 1).padStart(2, '0')}`,
    nis: String(2531001 + i),
    name,
    school: 'SMP Al Hidayah',
    className: i < 10 ? '7A' : '8A',
    gender,
    password: '12345',
    createdAt: CREATED,
  }));
  return [...mi, ...smp];
};

/* ============================== SOAL =================================== */
const mc = (id, text, options, key, score = 1, stimulus, explanation) => ({
  id, type: 'multiple_choice', text, stimulus,
  options: options.map((t, i) => ({ id: 'ABCDE'[i], text: t })),
  answerKey: [key], score, explanation, createdAt: CREATED,
});
const complex = (id, text, options, keys, score = 2, stimulus, explanation) => ({
  id, type: 'complex_mc', text, stimulus,
  options: options.map((t, i) => ({ id: 'ABCDE'[i], text: t })),
  answerKey: keys, score, explanation, createdAt: CREATED,
});
const tf = (id, text, answer, score = 1, stimulus, explanation) => ({
  id, type: 'true_false', text, stimulus,
  options: [{ id: 'true', text: 'Benar' }, { id: 'false', text: 'Salah' }],
  answerKey: [answer], score, explanation, createdAt: CREATED,
});
const essay = (id, text, score = 3, stimulus, explanation) => ({
  id, type: 'essay', text, stimulus, options: [], answerKey: [], score, explanation, createdAt: CREATED,
});

const STIM_LITERASI_MI = `Kebun Sekolah
Setiap hari Jumat, siswa MI Islamiyah bekerja bakti di kebun sekolah. Mereka menanam sawi, bayam, dan cabai. Pak Rahmat, guru kelas, mengajari cara menyiram dan memberi pupuk. Hasil panen dijual di kantin dengan harga murah. Uang penjualannya dipakai untuk membeli buku bacaan di perpustakaan.`;

const STIM_LITERASI_SMP = `Sampah Plastik di Sekitar Kita
Sampah plastik membutuhkan waktu ratusan tahun untuk terurai. Kantong plastik yang dibuang sembarangan sering menyumbat saluran air dan menyebabkan banjir ketika hujan. Beberapa sekolah mulai membiasakan siswa membawa tempat minum sendiri. Menurut saya, kebiasaan kecil ini jauh lebih bermanfaat daripada sekadar berdebat tentang bahaya plastik.`;

const packMi = {
  lit: 'pkt_mi_lit',
  num: 'pkt_mi_num',
  pai: 'pkt_mi_pai',
  bar: 'pkt_mi_bar',
};
const packSmp = {
  lit: 'pkt_smp_lit',
  num: 'pkt_smp_num',
  pai: 'pkt_smp_pai',
  bar: 'pkt_smp_bar',
};

const buildQuestions = () => [
  /* ---------------- MI · Literasi ---------------- */
  { ...mc('q_mi_lit_1', 'Apa ide pokok paragraf tersebut?', [
    'Kegiatan kerja bakti siswa di kebun sekolah',
    'Cara menanam cabai yang benar',
    'Harga sawi di kantin sekolah',
    'Perpustakaan sekolah yang baru',
  ], 'A', 1, STIM_LITERASI_MI), packetId: packMi.lit },
  { ...mc('q_mi_lit_2', 'Kata "panen" pada teks di atas berarti ...', [
    'menanam kembali', 'memetik hasil tanaman', 'membeli bibit', 'menyiram tanaman',
  ], 'B', 1, STIM_LITERASI_MI), packetId: packMi.lit },
  { ...tf('q_mi_lit_3', 'Hasil penjualan sayur di kebun sekolah dipakai untuk membeli buku bacaan.', 'true', 1, STIM_LITERASI_MI), packetId: packMi.lit },
  { ...complex('q_mi_lit_4', 'Pilih SEMUA tanaman yang disebut dalam teks!', [
    'Sawi', 'Bayam', 'Jagung', 'Cabai', 'Padi',
  ], ['A', 'B', 'D'], 2, STIM_LITERASI_MI), packetId: packMi.lit },
  { ...essay('q_mi_lit_5', 'Tuliskan dua kalimat kesimpulan tentang manfaat kebun sekolah berdasarkan teks di atas.', 3, STIM_LITERASI_MI,
    'Contoh jawaban: Kebun sekolah melatih siswa bekerja sama, dan hasil panennya dapat menambah koleksi buku perpustakaan.'), packetId: packMi.lit },

  /* ---------------- MI · Numerasi ---------------- */
  { ...mc('q_mi_num_1', 'Ibu membeli 3 buku tulis. Harga satu buku Rp2.500. Berapa total yang harus dibayar?', [
    'Rp5.500', 'Rp6.000', 'Rp7.500', 'Rp8.000',
  ], 'C', 1), packetId: packMi.num },
  { ...mc('q_mi_num_2', 'Sebuah persegi panjang memiliki panjang 8 cm dan lebar 5 cm. Kelilingnya adalah ...', [
    '13 cm', '26 cm', '40 cm', '80 cm',
  ], 'B', 1), packetId: packMi.num },
  { ...tf('q_mi_num_3', 'Pecahan 0,5 sama nilainya dengan 1/2.', 'true', 1), packetId: packMi.num },
  { ...mc('q_mi_num_4', 'Hasil dari 2/5 + 1/5 adalah ...', ['3/10', '3/5', '2/25', '1/5'], 'B', 1), packetId: packMi.num },
  { ...essay('q_mi_num_5', 'Andi membawa uang Rp20.000. Ia membeli 2 pensil seharga Rp3.000 per pensil dan 1 buku Rp7.000. Berapa uang kembalian Andi? Tuliskan cara menghitungnya.', 3,
    [], 'Total belanja = (2 × 3.000) + 7.000 = Rp13.000. Kembalian = 20.000 − 13.000 = Rp7.000.'), packetId: packMi.num },

  /* ---------------- MI · PAI ---------------- */
  { ...mc('q_mi_pai_1', 'Rukun Islam ada ...', ['empat', 'lima', 'enam', 'tujuh'], 'B', 1), packetId: packMi.pai },
  { ...mc('q_mi_pai_2', 'Surah Al-Kausar terdiri atas ... ayat.', ['dua', 'tiga', 'empat', 'lima'], 'B', 1), packetId: packMi.pai },
  { ...tf('q_mi_pai_3', 'Salat Subuh dikerjakan sebanyak tiga rakaat.', 'false', 1, undefined, 'Salat Subuh dua rakaat.'), packetId: packMi.pai },
  { ...complex('q_mi_pai_4', 'Pilih SEMUA yang termasuk rukun wudu!', [
    'Membasuh wajah', 'Membasuh kedua tangan sampai siku', 'Mengusap kepala', 'Memakai parfum', 'Membaca doa makan',
  ], ['A', 'B', 'C'], 2), packetId: packMi.pai },
  { ...essay('q_mi_pai_5', 'Sebutkan tiga contoh perilaku jujur yang dapat dilakukan seorang siswa di sekolah.', 3,
    [], 'Contoh: tidak menyontek saat ujian, mengembalikan barang yang ditemukan, berkata benar kepada guru.'), packetId: packMi.pai },

  /* ---------------- MI · Bahasa Arab ---------------- */
  { ...mc('q_mi_bar_1', 'Arti kata كِتَابٌ adalah ...', ['buku', 'pensil', 'meja', 'pintu'], 'A', 1), packetId: packMi.bar },
  { ...mc('q_mi_bar_2', 'Arti kata مَدْرَسَةٌ adalah ...', ['masjid', 'sekolah', 'rumah', 'pasar'], 'B', 1), packetId: packMi.bar },
  { ...tf('q_mi_bar_3', 'Kata قَلَمٌ berarti meja.', 'false', 1, undefined, 'قَلَمٌ berarti pena/pensil.'), packetId: packMi.bar },
  { ...complex('q_mi_bar_4', 'Pilih SEMUA kata yang menunjukkan anggota keluarga!', [
    'أَبٌ', 'أُمٌّ', 'كِتَابٌ', 'أَخٌ', 'مَدْرَسَةٌ',
  ], ['A', 'B', 'D'], 2), packetId: packMi.bar },
  { ...essay('q_mi_bar_5', 'Tuliskan arti kata بَيْتٌ dan مَسْجِدٌ dalam bahasa Indonesia.', 3,
    [], 'بَيْتٌ = rumah; مَسْجِدٌ = masjid.'), packetId: packMi.bar },

  /* ---------------- SMP · Literasi ---------------- */
  { ...mc('q_smp_lit_1', 'Ide pokok teks di atas adalah ...', [
    'Lamanya waktu penguraian sampah plastik dan dampaknya bagi lingkungan',
    'Cara membuat kantong plastik di pabrik',
    'Penyebab banjir di kota besar setiap tahun',
    'Manfaat berdebat tentang sampah plastik',
  ], 'A', 1, STIM_LITERASI_SMP), packetId: packSmp.lit },
  { ...mc('q_smp_lit_2', 'Kalimat "Menurut saya, kebiasaan kecil ini jauh lebih bermanfaat ..." merupakan ...', [
    'fakta', 'opini penulis', 'kalimat tanya', 'data statistik',
  ], 'B', 1, STIM_LITERASI_SMP), packetId: packSmp.lit },
  { ...tf('q_smp_lit_3', 'Menurut teks, kantong plastik dapat menyumbat saluran air dan menyebabkan banjir.', 'true', 1, STIM_LITERASI_SMP), packetId: packSmp.lit },
  { ...complex('q_smp_lit_4', 'Pilih SEMUA pernyataan yang merupakan FAKTA berdasarkan teks!', [
    'Sampah plastik membutuhkan waktu ratusan tahun untuk terurai',
    'Sampah plastik menyumbat saluran air',
    'Membawa tempat minum sendiri adalah kebiasaan terbaik di dunia',
    'Beberapa sekolah membiasakan siswa membawa tempat minum sendiri',
    'Berdebat lebih bermanfaat daripada bertindak',
  ], ['A', 'B', 'D'], 2, STIM_LITERASI_SMP), packetId: packSmp.lit },
  { ...essay('q_smp_lit_5', 'Tuliskan simpulan teks tersebut dan satu saran tindakan yang bisa dilakukan siswa.', 3, STIM_LITERASI_SMP,
    'Simpulan: sampah plastik berbahaya dan lama terurai; saran: membawa tempat minum sendiri dan memilah sampah.'), packetId: packSmp.lit },

  /* ---------------- SMP · Numerasi ---------------- */
  { ...mc('q_smp_num_1', 'Jika 3x + 5 = 20, maka nilai x adalah ...', ['3', '5', '7', '15'], 'B', 1), packetId: packSmp.num },
  { ...mc('q_smp_num_2', 'Sebuah baju berharga Rp150.000 mendapat diskon 20%. Harga setelah diskon adalah ...', [
    'Rp110.000', 'Rp120.000', 'Rp130.000', 'Rp140.000',
  ], 'B', 1), packetId: packSmp.num },
  { ...tf('q_smp_num_3', 'Hasil dari (−5) × (−4) adalah 20.', 'true', 1), packetId: packSmp.num },
  { ...mc('q_smp_num_4', 'Perbandingan uang Ani dan Budi adalah 3 : 5. Jika uang Budi Rp75.000, uang Ani adalah ...', [
    'Rp35.000', 'Rp45.000', 'Rp50.000', 'Rp60.000',
  ], 'B', 1), packetId: packSmp.num },
  { ...essay('q_smp_num_5', 'Rina menabung Rp50.000 setiap minggu. Setelah 12 minggu, ia mengambil Rp150.000 untuk membeli buku. Berapa sisa tabungan Rina? Tuliskan langkahnya.', 3,
    [], 'Tabungan = 12 × 50.000 = 600.000. Sisa = 600.000 − 150.000 = Rp450.000.'), packetId: packSmp.num },

  /* ---------------- SMP · PAI ---------------- */
  { ...mc('q_smp_pai_1', 'Jumlah malaikat yang wajib diketahui seorang muslim adalah ...', ['sembilan', 'sepuluh', 'sebelas', 'dua belas'], 'B', 1), packetId: packSmp.pai },
  { ...mc('q_smp_pai_2', 'Malaikat yang bertugas mencatat amal baik dan buruk manusia adalah ...', [
    'Jibril', 'Mikail', 'Raqib dan Atid', 'Izrail',
  ], 'C', 1), packetId: packSmp.pai },
  { ...tf('q_smp_pai_3', 'Hukum melaksanakan puasa Ramadan adalah sunah.', 'false', 1, undefined, 'Puasa Ramadan hukumnya wajib bagi muslim yang mampu.'), packetId: packSmp.pai },
  { ...complex('q_smp_pai_4', 'Pilih SEMUA yang termasuk rukun salat!', [
    'Niat', 'Takbiratul ihram', 'Membaca Al-Fatihah', 'Bersalaman setelah salat', 'Membaca surah pendek',
  ], ['A', 'B', 'C'], 2), packetId: packSmp.pai },
  { ...essay('q_smp_pai_5', 'Sebutkan tiga hikmah salat berjamaah bagi seorang pelajar.', 3,
    [], 'Contoh: melatih kedisiplinan, mempererat persaudaraan, menumbuhkan kebersamaan, mendapat pahala 27 derajat.'), packetId: packSmp.pai },

  /* ---------------- SMP · Bahasa Arab ---------------- */
  { ...mc('q_smp_bar_1', 'Arti kata مُعَلِّمٌ adalah ...', ['murid', 'guru', 'petani', 'pedagang'], 'B', 1), packetId: packSmp.bar },
  { ...mc('q_smp_bar_2', 'Arti kata مَكْتَبَةٌ adalah ...', ['perpustakaan', 'kantin', 'lapangan', 'ruang guru'], 'A', 1), packetId: packSmp.bar },
  { ...tf('q_smp_bar_3', 'Kata أُسْتَاذٌ berarti murid.', 'false', 1, undefined, 'أُسْتَاذٌ berarti guru/profesor.'), packetId: packSmp.bar },
  { ...complex('q_smp_bar_4', 'Pilih SEMUA kata yang menunjukkan tempat!', [
    'مَسْجِدٌ', 'مَكْتَبَةٌ', 'كِتَابٌ', 'أَنْتُمْ', 'مَدْرَسَةٌ',
  ], ['A', 'B', 'E'], 2), packetId: packSmp.bar },
  { ...essay('q_smp_bar_5', 'Tuliskan tiga kata benda yang ada di sekolah dalam bahasa Arab beserta artinya.', 3,
    [], 'Contoh: كِتَابٌ (buku), قَلَمٌ (pena), سَبُّورَةٌ (papan tulis/madrasah).'), packetId: packSmp.bar },
];

const buildPackets = () => [
  { id: packMi.lit, name: 'Literasi MI — Kelas 5 & 6', category: 'Literasi', subject: 'Bahasa Indonesia', school: 'MI Islamiyah', level: 'Kelas 5-6', description: 'Membaca teks, ide pokok, fakta/opini', createdAt: CREATED },
  { id: packMi.num, name: 'Numerasi MI — Kelas 5 & 6', category: 'Numerasi', subject: 'Matematika', school: 'MI Islamiyah', level: 'Kelas 5-6', description: 'Operasi hitung, pecahan, keliling, soal cerita', createdAt: CREATED },
  { id: packMi.pai, name: 'PAI MI — Kelas 5 & 6', category: 'Mapel', subject: 'Pendidikan Agama Islam', school: 'MI Islamiyah', level: 'Kelas 5-6', description: 'Rukun Islam, rukun wudu, surah pendek, akhlak', createdAt: CREATED },
  { id: packMi.bar, name: 'Bahasa Arab MI — Kelas 5 & 6', category: 'Mapel', subject: 'Bahasa Arab', school: 'MI Islamiyah', level: 'Kelas 5-6', description: 'Mufradat (kosakata) dan arti kata', createdAt: CREATED },
  { id: packSmp.lit, name: 'Literasi SMP — Kelas 7 & 8', category: 'Literasi', subject: 'Bahasa Indonesia', school: 'SMP Al Hidayah', level: 'Kelas 7-8', description: 'Teks eksposisi, fakta & opini, simpulan', createdAt: CREATED },
  { id: packSmp.num, name: 'Numerasi SMP — Kelas 7 & 8', category: 'Numerasi', subject: 'Matematika', school: 'SMP Al Hidayah', level: 'Kelas 7-8', description: 'Persamaan linear, persentase, perbandingan', createdAt: CREATED },
  { id: packSmp.pai, name: 'PAI SMP — Kelas 7 & 8', category: 'Mapel', subject: 'Pendidikan Agama Islam', school: 'SMP Al Hidayah', level: 'Kelas 7-8', description: 'Iman kepada malaikat, rukun salat, puasa', createdAt: CREATED },
  { id: packSmp.bar, name: 'Bahasa Arab SMP — Kelas 7 & 8', category: 'Mapel', subject: 'Bahasa Arab', school: 'SMP Al Hidayah', level: 'Kelas 7-8', description: 'Istilah di sekolah dan mufradat', createdAt: CREATED },
];

const buildExams = () => [
  { id: 'exm_mi_lit', title: 'Asesmen Literasi — MI Islamiyah', packetId: packMi.lit, school: 'MI Islamiyah', classes: ['5A', '6A'], date: TODAY, startTime: '07:30', duration: 60, token: 'MILIT5', isActive: true, shuffle: false, kkm: 70, createdAt: CREATED },
  { id: 'exm_mi_num', title: 'Asesmen Numerasi — MI Islamiyah', packetId: packMi.num, school: 'MI Islamiyah', classes: ['5A', '6A'], date: TODAY, startTime: '09:00', duration: 60, token: 'MINUM5', isActive: true, shuffle: false, kkm: 70, createdAt: CREATED },
  { id: 'exm_mi_pai', title: 'Ulangan PAI — MI Islamiyah', packetId: packMi.pai, school: 'MI Islamiyah', classes: ['5A', '6A'], date: TODAY, startTime: '10:30', duration: 45, token: 'MIPAI5', isActive: true, shuffle: false, kkm: 70, createdAt: CREATED },
  { id: 'exm_mi_bar', title: 'Ulangan Bahasa Arab — MI Islamiyah', packetId: packMi.bar, school: 'MI Islamiyah', classes: ['5A', '6A'], date: TODAY, startTime: '12:30', duration: 45, token: 'MIBAR5', isActive: true, shuffle: false, kkm: 70, createdAt: CREATED },
  { id: 'exm_smp_lit', title: 'Asesmen Literasi — SMP Al Hidayah', packetId: packSmp.lit, school: 'SMP Al Hidayah', classes: ['7A', '8A'], date: TODAY, startTime: '07:30', duration: 60, token: 'SMPLIT', isActive: true, shuffle: false, kkm: 75, createdAt: CREATED },
  { id: 'exm_smp_num', title: 'Asesmen Numerasi — SMP Al Hidayah', packetId: packSmp.num, school: 'SMP Al Hidayah', classes: ['7A', '8A'], date: TODAY, startTime: '09:00', duration: 60, token: 'SMPNUM', isActive: true, shuffle: false, kkm: 75, createdAt: CREATED },
  { id: 'exm_smp_pai', title: 'Ulangan PAI — SMP Al Hidayah', packetId: packSmp.pai, school: 'SMP Al Hidayah', classes: ['7A', '8A'], date: TODAY, startTime: '10:30', duration: 45, token: 'SMPPAI', isActive: true, shuffle: false, kkm: 75, createdAt: CREATED },
  { id: 'exm_smp_bar', title: 'Ulangan Bahasa Arab — SMP Al Hidayah', packetId: packSmp.bar, school: 'SMP Al Hidayah', classes: ['7A', '8A'], date: TODAY, startTime: '12:30', duration: 45, token: 'SMPBAR', isActive: true, shuffle: false, kkm: 75, createdAt: CREATED },
];

/* ============================== OUTPUT ================================= */
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : '';
};

const students = buildStudents();
const questions = buildQuestions();
const packets = buildPackets();
const exams = buildExams();

const outDir = path.resolve('data-uji');
const writePhp = () => {
  fs.mkdirSync(outDir, { recursive: true });

  const backup = { students, packets, questions, exams, results: [], settings: null, exportedAt: CREATED };
  fs.writeFileSync(path.join(outDir, 'Backup-CBT-Sukma-2026.json'), JSON.stringify(backup, null, 2));

  const studentSheet = (school, file) => {
    const rows = [['NIS', 'Nama', 'Sekolah', 'Kelas', 'JK', 'Password']];
    students.filter((s) => s.school === school).forEach((s) => rows.push([s.nis, s.name, s.school, s.className, s.gender, s.password]));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 8 }, { wch: 5 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, path.join(outDir, file));
  };
  studentSheet('MI Islamiyah', 'Siswa-MI-Islamiyah.xlsx');
  studentSheet('SMP Al Hidayah', 'Siswa-SMP-Al-Hidayah.xlsx');

  const soalSheet = (school, file) => {
    const rows = [['Paket', 'Kategori', 'No', 'Tipe', 'Stimulus', 'Soal', 'Pilihan', 'Kunci', 'Skor']];
    const pks = packets.filter((p) => p.school === school);
    pks.forEach((p) => {
      questions.filter((q) => q.packetId === p.id).forEach((q, i) => {
        rows.push([
          p.name, p.category, i + 1,
          { multiple_choice: 'Pilihan Ganda', complex_mc: 'PG Kompleks', true_false: 'Benar/Salah', essay: 'Uraian' }[q.type],
          q.stimulus || '',
          q.text,
          q.options.map((o) => `${o.id}. ${o.text}`).join(' | '),
          q.answerKey.length ? q.answerKey.join(', ') : '(dinilai guru)',
          q.score,
        ]);
      });
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 5 }, { wch: 15 }, { wch: 45 }, { wch: 55 }, { wch: 60 }, { wch: 14 }, { wch: 6 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Soal');
    XLSX.writeFile(wb, path.join(outDir, file));
  };
  soalSheet('MI Islamiyah', 'Bank-Soal-MI-Islamiyah.xlsx');
  soalSheet('SMP Al Hidayah', 'Bank-Soal-SMP-Al-Hidayah.xlsx');

  console.log('✅ File dibuat di', outDir);
};

const pushToSheet = async (url, key) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ key, action: 'pushAll', data: { students, packets, questions, exams } }),
    redirect: 'follow',
  });
  const data = await res.json();
  console.log('📤 pushAll:', JSON.stringify(data));
  const all = await (await fetch(`${url}?${new URLSearchParams({ action: 'getAll', key })}`)).json();
  console.log(`📊 Di sheet sekarang → siswa: ${all.data.students.length}, paket: ${all.data.packets.length}, soal: ${all.data.questions.length}, jadwal: ${all.data.exams.length}`);
};

if (flag('write')) writePhp();
if (flag('push')) await pushToSheet(value('url'), value('key'));
if (!flag('write') && !flag('push')) {
  console.log('Pemakaian:');
  console.log('  node scripts/seed-trial.mjs --write');
  console.log('  node scripts/seed-trial.mjs --push --url "https://.../exec" --key "KUNCI"');
}
