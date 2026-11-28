# Laporan Pengembangan Aplikasi Web DrugTraceability

**Mata kuliah:** Blockchain
**Kelompok 4E Informatika, Universitas Singaperbangsa Karawang**

| Nama | NIM |
|---|---|
| Agustinus Janssen Simamora | 2410631170055 |
| Mohammed Ali Irsyad Ginting | 2410631170083 |
| Gita Maharani | 2410631170022 |

**Tahap:** UAS - pengembangan purwarupa UTS menjadi aplikasi berbasis website

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan | Penyusun |
|---|---|---|---|
| 0.1 | - | Audit berkas proyek UTS dan penyusunan rekomendasi tahapan | - |
| 0.2 | - | Pembangunan antarmuka web dan integrasi dengan smart contract | - |
| 1.0 | - | Pengujian akhir, dokumentasi deployment, dan lampiran tangkapan layar | - |

Kolom tanggal dan penyusun diisi tim saat dokumen ini dikumpulkan.

---

## 1. Latar Belakang dan Tujuan

Pada UTS, kelompok membuat purwarupa `DrugTraceability`, yaitu sistem pelacakan distribusi obat
berbasis blockchain dengan smart contract Solidity yang diuji melalui Remix IDE dan Remix VM. Semua
interaksi pada tahap itu masih dilakukan langsung melalui Remix IDE, sehingga pengguna lain belum
dapat mencoba sistem tanpa memahami fungsi kontrak satu per satu.

Pengembangan UAS mengubah keadaan tersebut: purwarupa dilengkapi antarmuka website yang benar-benar
terhubung ke smart contract. Pengguna lain dapat membuka website, menghubungkan wallet, dan
menggunakan fitur sesuai peran masing-masing.

Tujuan pengembangan:

1. Menyediakan antarmuka web untuk seluruh fungsi utama smart contract yang sudah ada.
2. Membuktikan pemisahan hak akses dengan pengujian multi-wallet, bukan hanya satu akun.
3. Menjaga aturan bisnis dan keamanan tetap berada pada smart contract, bukan pada halaman web.
4. Menyediakan dokumentasi cara menjalankan dan menguji sistem bagi dosen dan pengguna lain.

---

## 2. Hasil Audit Proyek UTS

Audit lengkap ada pada `docs/AUDIT.md`. Ringkasan temuan yang menentukan arah pengembangan:

| No | Temuan | Konsekuensi pada pengembangan |
|---|---|---|
| 1 | Laporan UTS memuat dua bentuk kontrak: satu berkas tunggal dan lampiran tiga berkas | Implementasi memakai versi tiga berkas (`DrugTypes.sol`, `DrugAccessControl.sol`, `DrugTraceability.sol`) karena itulah yang terlampir pada laporan |
| 2 | Tidak ada fungsi untuk mengambil daftar seluruh batch | Daftar batch disusun dari pemindaian event `BatchRegistered`, dibantu penyimpanan nomor blok deployment |
| 3 | `batches()` mengembalikan tuple posisional, bukan objek bernama | Antarmuka memetakan sepuluh kolom berdasarkan urutan tetap |
| 4 | `flagRecall()` dapat dijalankan pabrik atas batch pabrik lain | Kontrak tidak diubah; antarmuka memberi peringatan dan laporan memuat rekomendasi perbaikan |
| 5 | `registerActor()` dapat menimpa role yang sudah ada | Antarmuka menampilkan role yang sedang berlaku sebelum konfirmasi |
| 6 | `computeBatchId()` memakai `encodePacked` tanpa pemisah | Dicatat sebagai rekomendasi; Batch ID tidak diubah agar hasil demonstrasi UTS tetap sama |
| 7 | Belum ada ABI, alamat kontrak, maupun konfigurasi jaringan | Dibuat skrip deploy yang menghasilkan ABI dan konfigurasi jaringan secara otomatis |

Sesuai aturan kerja pada panduan, kontrak tidak diubah dan tidak ada fungsi yang dikarang. Seluruh
pemanggilan dari antarmuka memakai nama fungsi dan urutan parameter yang identik dengan berkas
Solidity proyek UTS.

---

## 3. Arsitektur Aplikasi

```
Peramban pengguna
├── Halaman web (HTML, CSS, JavaScript)
├── Ethers.js (berkas browser)
└── MetaMask (identitas alamat + penanda tangan transaksi)
        |
        | transaksi bertanda tangan / permintaan baca
        v
Node blockchain (Hardhat lokal, chainId 31337; atau Sepolia Testnet, chainId 11155111)
        |
        v
Smart contract DrugTraceability
        |
        v
Data: role aktor, batch obat, riwayat perpindahan, status recall
```

Poin penting arsitektur: tidak ada server backend. Halaman web bersifat statis dan dapat dijalankan
sebagai berkas biasa maupun melalui server statis sederhana. Seluruh aturan, validasi, dan
penyimpanan data berada pada smart contract. Karena itu, memodifikasi berkas HTML atau JavaScript
tidak dapat melewati aturan seperti penolakan transfer batch yang sudah di-recall.

Berkas yang membentuk aplikasi:

| Berkas | Peran |
|---|---|
| `web/index.html` | Beranda |
| `web/verifikasi.html` | Verifikasi publik tanpa wallet |
| `web/dashboard.html` | Dashboard sesuai role |
| `web/daftar-aktor.html` | Pengajuan pendaftaran aktor |
| `web/panduan.html` | Panduan penggunaan dan pengujian |
| `web/assets/js/app.js` | Koneksi wallet, pemanggilan kontrak, pemformatan, notifikasi |
| `web/assets/js/dashboard.js` | Panel per role, pemindaian event, log aktivitas |
| `web/assets/css/app.css` | Gaya antarmuka, mode terang dan gelap |
| `web/contract-config.js` | Alamat kontrak per chainId (dihasilkan skrip deploy) |
| `web/abi/DrugTraceability.js` | ABI kontrak (dihasilkan skrip deploy) |

---

## 4. Antarmuka: arah visual dan alasan pemilihannya

Pengembangan UAS ini melakukan remake tampilan, bukan sekadar menambah halaman. Sebelum menulis kode,
dilakukan satu putaran pemilihan arah visual dengan empat kandidat, dan arah yang dipilih adalah
**Kartu Stok Apotek**: setiap catatan batch diperlakukan sebagai lembar kartu stok gudang.

Bentuknya: kepala kartu berisi identitas batch dan segel tanggal kedaluwarsa yang ditempel miring,
badan berisi bilah masa edar dan kolom fakta bernomor, tabel mutasi dengan kolom masuk, keluar, dan
saldo pemegang serta nomor blok di kolom paling kanan, lalu kaki tiga kolom tanda tangan yang isinya
alamat wallet pendaftar, nama modifier kontrak yang memeriksa, dan jumlah perpindahan tercatat.

Alasan arah ini dipilih: penguji langsung mengenali polanya, karena kartu stok adalah dokumen yang
memang dipakai di gudang farmasi. Ia juga memaksa dua hal yang penting bagi penilaian, yaitu setiap
angka wajib berasal dari ledger (karena kolom blok harus terisi), dan setiap penolakan kontrak wajib
ditampilkan apa adanya (karena itulah tanda tangan kontrak pada baris tersebut).

Ketentuan tampilan yang berlaku di seluruh halaman: tema terang saja, sudut 0px pada semua komponen,
tanpa bayangan pada lembar data, dan angka memakai huruf monospace berlebar digit tetap. Sistem desain
lengkapnya dicatat pada `DESIGN.md`, dan token mesinnya pada `.impeccable/design.json`.

### 4.1 Antarmuka menurut peran

| Peran | Menu pada dashboard | Fungsi kontrak yang dipanggil |
|---|---|---|
| Regulator | Recall batch, Aktor rantai pasok, Permintaan pendaftaran, Log aktivitas | `registerActor()`, `flagRecall()` |
| Pabrik | Batch saya, Registrasi batch, Transfer custody, Recall batch, Aktor, Log | `registerBatch()`, `transferCustody()`, `flagRecall()` |
| Distributor | Batch saya, Transfer custody, Aktor, Log | `transferCustody()` |
| Apotek / RS | Batch saya, Transfer custody, Aktor, Log | `transferCustody()` |
| Pengunjung umum | Halaman verifikasi | `verifyAuthenticity()`, `getTransferHistory()`, `batches()`, `computeBatchId()` |

Menu yang tampil ditentukan oleh hasil pembacaan `roles(address)` dari kontrak, bukan oleh pilihan
pengguna. Pengguna tanpa role tidak dibawa ke dashboard, melainkan ke layar pengajuan pendaftaran
aktor, karena kontrak hanya mengizinkan regulator memanggil `registerActor()`.

### 4.2 Alur satu transaksi

1. Pengguna mengisi data pada formulir halaman yang sesuai perannya.
2. Antarmuka memvalidasi bentuk data (alamat wallet, Batch ID, urutan tanggal) untuk menghindari
   transaksi yang pasti gagal.
3. Antarmuka memanggil fungsi kontrak melalui `ethers`, dan wallet meminta konfirmasi.
4. Selama menunggu, tombol menampilkan indikator proses dan tidak dapat diklik ulang.
5. Setelah transaksi masuk ke blok, antarmuka menampilkan notifikasi berisi nomor blok dan tautan
   explorer bila jaringan mendukung.
6. Data ditampilkan ulang dengan membaca kontrak, bukan dari nilai yang diketik pengguna.

Bila transaksi ditolak kontrak, pesan `require()` diterjemahkan menjadi kalimat yang dapat dibaca,
misalnya "Batch berstatus recall, tidak dapat dipindahtangankan". Bila pengguna membatalkan transaksi
pada wallet, muncul notifikasi bahwa transaksi dibatalkan.

### 4.3 Halaman pemeriksaan publik

Halaman ini menjadi jawaban atas kebutuhan pasien untuk memeriksa obat. Dua cara pencarian disediakan:
memasukkan NIE, kode batch, dan nomor serial sebagaimana tercetak pada kemasan (Batch ID dihitung
kontrak melalui `computeBatchId()`), atau menempelkan Batch ID secara langsung.

Hasil yang ditampilkan: status pendaftaran batch, sisa masa berlaku, pemegang saat ini, alamat
pendaftar, status recall beserta alasannya, dan seluruh riwayat perpindahan lengkap dengan waktu
transaksi. Halaman ini juga membuat tautan permanen dan QR code sehingga label pada kemasan dapat
diarahkan langsung ke hasil verifikasi.

Halaman ini bekerja tanpa wallet karena memakai provider baca-saja. Antarmuka juga menegaskan bahwa
`verifyAuthenticity()` membuktikan batch terdaftar pada ledger, bukan membuktikan keaslian fisik produk.

### 4.4 Batasan yang disampaikan secara terbuka

1. Permintaan pendaftaran aktor disimpan pada `localStorage` peramban, bukan pada blockchain, dan
   hal ini dinyatakan pada antarmuka. Ini catatan kerja bagi regulator, bukan fitur blockchain.
2. Trigger otomatis "akun email" tidak dibuat karena akan bertentangan dengan pemeriksaan hak akses
   pada kontrak. Wallet tetap menjadi identitas sesuai panduan bagian 5.
3. Registrasi aktor tetap hanya dapat dilakukan regulator.
4. Daftar batch bergantung pada event kontrak. Dokumentasi menyebutkan cara menangani kondisi ini
   (memindai ulang, dan nomor blok deployment tersimpan pada konfigurasi).

---

## 5. Pengujian

### 5.1 Pengujian otomatis kontrak

`npm test` menjalankan 15 pengujian pada kontrak yang sama dengan yang dipakai antarmuka. Dua belas
di antaranya adalah skenario pengujian pada BAB III laporan UTS, ditambah tiga pengujian
tambahan untuk kasus yang belum tercakup.

| No | Skenario | Kondisi yang diharapkan | Hasil |
|---|---|---|---|
| 1 | Regulator mendaftarkan Manufacturer, Distributor, Pharmacy | Aktor berhasil terdaftar dan `regulator()` sesuai deployer | Lulus |
| 2 | Manufacturer mendaftarkan batch valid | Batch tercatat, `currentHolder` = pabrik | Lulus |
| 3 | Non-Manufacturer mendaftarkan batch | Transaksi ditolak | Lulus |
| 4 | Kedaluwarsa lebih awal atau sama dengan produksi | Transaksi ditolak | Lulus |
| 5 | Transfer ke Distributor terdaftar | Transfer berhasil | Lulus |
| 6 | Transfer oleh pihak bukan pemegang batch | Transaksi ditolak | Lulus |
| 7 | Transfer kepada aktor belum terdaftar | Transaksi ditolak | Lulus |
| 8 | Verifikasi batch terdaftar dan batch tidak dikenal | Data sesuai, batch tak dikenal tidak sah | Lulus |
| 9 | Riwayat perpindahan batch | Riwayat menampilkan pengirim, penerima, waktu | Lulus |
| 10 | Recall oleh Regulator dan oleh pabrik | Status berubah menjadi recall, alasan tersimpan | Lulus |
| 11 | Transfer batch yang telah recall | Transaksi ditolak | Lulus |
| 12 | Recall ulang batch yang sudah recall | Transaksi ditolak | Lulus |
| 13 | `registerActor()` oleh bukan regulator dan dengan role None | Keduanya ditolak | Lulus |
| 14 | Batch dengan kombinasi NIE/kode batch/serial sama didaftarkan dua kali | Transaksi ditolak | Lulus |
| 15 | Transfer batch yang tidak pernah didaftarkan | Transaksi ditolak | Lulus |

Hasil eksekusi: **15 pengujian, seluruhnya lulus** (`15 passing`).

### 5.2 Pengujian antarmuka dengan beberapa wallet

Pengujian ini dijalankan pada jaringan Hardhat lokal dengan wallet berbeda untuk setiap peran, dan
satu akun sengaja dibiarkan tanpa peran. Hasil yang dicatat di bawah adalah keluaran nyata dari
pengujian, bukan perkiraan.

| Uji | Cara | Hasil |
|---|---|---|
| Pemisahan menu menurut peran | Menghubungkan tiap akun bergantian, membaca menu yang terbentuk | Pabrik mendapat 6 menu, Distributor dan Apotek 4, BPOM 4, akun tanpa peran tidak mendapat menu operasional |
| Akun tanpa peran | Menghubungkan akun ke-5 dan ke-6 | Muncul pemberitahuan bahwa wallet belum berperan, beserta cara mengajukan permintaan ke BPOM |
| Registrasi batch | Pabrik mengisi formulir lalu mengirim transaksi | Blok bertambah 15 ke 16, `registerBatch()` tercatat, data terbaca kembali dari kontrak |
| Perpindahan custody | Pabrik memindahkan batch ke wallet Distributor | Blok bertambah ke 17, pemegang berubah menjadi Distributor, `getTransferHistory()` berisi satu catatan |
| Penarikan batch | BPOM mengisi Batch ID dan alasan, lalu mengonfirmasi dialog | Blok bertambah ke 18, status recall benar, alasan tersimpan pada ledger |
| Transfer batch recall | Distributor mencoba memindahkan batch yang sudah recall | Kontrak menolak: "Batch berstatus recall, tidak dapat dipindahtangankan", dan tidak ada blok baru |
| Verifikasi publik tanpa wallet | Membuka halaman Periksa Batch melalui URL berisi Batch ID | Kartu batch tampil lengkap tanpa perlu wallet |
| Kolom kosong | Menekan tombol transaksi tanpa mengisi Batch ID | Aplikasi menolak lebih dahulu dengan pesan pada kolom yang bersangkutan |
| Konsol peramban | Membuka lima halaman | Tidak ada galat JavaScript pada seluruh halaman |

Pengujian pemisahan peran dijalankan ulang setelah tampilan diganti, untuk memastikan arah visual baru
tidak mengubah hak akses.

### 5.3 Temuan yang diperbaiki selama pengujian

| Temuan | Perbaikan |
|---|---|
| Alamat wallet dengan huruf besar/kecil tidak konsisten ditolak wallet dengan pesan "bad address checksum" | Seluruh alamat dari masukan pengguna dinormalkan sebelum dikirim ke kontrak |
| Pesan penolakan kontrak tampil sebagai "missing revert data" yang tidak menjelaskan apa pun | Ditambahkan simulasi `staticCall` sebelum mengirim transaksi, sehingga alasan asli dari `require()` selalu terbaca |
| Kolom nomor blok pada tabel mutasi selalu kosong karena `getTransferHistory()` tidak mengembalikannya | Nomor blok diambil dari event `BatchRegistered`, `CustodyTransferred`, dan `BatchRecalled`, lalu dipasangkan pada baris yang sesuai |
| Hash Batch ID membungkus sampai sembilan baris pada kolom sempit | Batch ID diberi satu baris penuh tersendiri dengan label dan tombol salin |
| Halaman pemeriksaan memberi lebar besar pada formulir dan sempit pada hasil, sehingga hasil justru terhimpit | Ditambahkan varian tata letak `.cols.search`: formulir 372px, hasil memakai sisa lebar |
| Tabel panjang melebarkan halaman pada layar ponsel | Tabel dibungkus wadah bergulir tersendiri dan lebar kolom grid dibatasi |
| Teks fungsional berukuran 10,6 sampai 11,6 piksel, sulit dibaca saat diproyeksikan di kelas | Seluruh ukuran teks fungsional dinaikkan ke 12 piksel atau lebih; hal ini juga ditemukan oleh pemeriksa otomatis |
| Judul dan keterangan pada daftar jejak menyatu dalam satu baris tanpa pemisah | Penanda daftar dibuat `display: block` sehingga judul dan keterangan terpisah |
| Tautan QR berubah ketika salah satu kolom diubah | Tautan permanen dibentuk dari Batch ID, bukan dari data mentah |
| Angka recall pada beranda tidak dijelaskan di tabel batch | Tabel beranda menampilkan batch bermasalah lebih dulu beserta alasan penarikannya |

---

## 6. Cara Menjalankan dan Menguji

Ringkasan perintah (panduan lengkap ada pada `README.md` dan `docs/DEPLOY.md`):

```bash
npm install
npm run node          # terminal 1: node blockchain lokal
npm run deploy:local  # terminal 2: deploy + tulis ABI & konfigurasi
npm run seed:local    # isi aktor, batch, dan satu batch recall
npm run web           # server statis pada http://127.0.0.1:5173
```

Langkah menambahkan jaringan pada MetaMask: nama `Hardhat Local`, RPC `http://127.0.0.1:8545`,
chainId `31337`. Akun uji diimpor memakai private key yang dicetak oleh `npm run node`.

Akun yang disarankan untuk demonstrasi:

| Akun | Peran | Keterangan |
|---|---|---|
| #0 | BPOM (Regulator) | Otomatis menjadi regulator saat kontrak di-deploy |
| #1 | Pabrik | Sudah didaftarkan oleh data contoh |
| #2 | Distributor | Sudah didaftarkan oleh data contoh |
| #3 | Apotek / RS | Sudah didaftarkan oleh data contoh |
| #4 | Belum terdaftar | Untuk menguji penolakan akses dan pengajuan pendaftaran |

Untuk pengujian di Sepolia Testnet: isi berkas `.env` dengan `SEPOLIA_RPC_URL` dan
`DEPLOYER_PRIVATE_KEY`, lalu jalankan `npm run deploy:sepolia`. Alamat kontrak untuk jaringan tersebut
ditambahkan otomatis pada `web/contract-config.js`, dan antarmuka akan memilihnya menyesuaikan
jaringan wallet.

---

## 7. Kesimpulan

1. Purwarupa UTS berhasil dikembangkan menjadi aplikasi web yang benar-benar berinteraksi dengan smart
   contract. Seluruh fungsi utama proyek UTS dapat dijalankan melalui antarmuka: registrasi aktor,
   registrasi batch, perpindahan custody, verifikasi, riwayat distribusi, dan recall.
2. Aturan bisnis dan keamanan tetap berada pada smart contract. Antarmuka tidak dapat melewati aturan
   seperti penolakan transfer batch yang berstatus recall atau penolakan penerima yang belum terdaftar
   sebagai aktor.
3. Pemisahan hak akses terbukti melalui pengujian dengan beberapa akun wallet, bukan hanya satu akun.
   Wallet tanpa role tidak memperoleh menu operasional sama sekali.
4. Tidak ada data contoh yang ditampilkan seolah-olah data blockchain. Seluruh batch, role, status
   recall, dan riwayat perpindahan pada antarmuka dibaca dari kontrak; data contoh yang disediakan
   skrip seed merupakan transaksi nyata pada jaringan uji lokal.
5. Fitur tambahan yang diminta pada bagian 7.2 panduan dapat dikerjakan: QR code untuk halaman
   verifikasi, dashboard ringkas jumlah batch dan aktor, riwayat transaksi dengan tautan explorer pada
   jaringan publik, halaman permintaan pendaftaran aktor, serta pencarian dan penyaringan batch.

Saran pengembangan berikutnya: memperbaiki pemeriksaan wewenang pada `flagRecall()` agar pabrik hanya
dapat menarik batch miliknya sendiri, mempertimbangkan penggunaan `abi.encode` pada pembentukan Batch
ID, dan menambahkan fungsi baca daftar batch pada kontrak agar antarmuka tidak bergantung pada
pemindaian event. Ketiganya disarankan sebagai perubahan kontrak, sehingga sebaiknya dibahas dan
disetujui terlebih dahulu.

---

## 8. Lampiran

Tangkapan layar antarmuka tersimpan pada folder ``:

| Berkas | Isi |
|---|---|
| `01-beranda.png` | Beranda: bilah angka jaringan, kartu batch terbaru, aturan kontrak, hak akses peran |
| `02-periksa-batch.png` | Hasil pemeriksaan satu batch: kartu stok dengan tabel mutasi dan nomor blok |
| `03-ruang-kerja.png` | Ruang kerja pabrik: daftar batch yang dicatat dan tindakan per baris |
| `04-panduan.png` | Panduan penggunaan, daftar fungsi kontrak, dan daftar periksa pengujian |
| `05-ruang-kerja-regulator.png` | Ruang kerja BPOM: pendaftaran aktor dan daftar aktor berperan |
| `06-pengajuan-peran.png` | Halaman pengajuan peran beserta penjelasan bahwa pengajuan bukan transaksi |
| `07-beranda-mobile.png` | Beranda pada layar ponsel 390px |

Dokumen pendukung lain:

| Berkas | Isi |
|---|---|
| `DESIGN.md` | Sistem desain lengkap: token warna, huruf, tata letak, bentuk, komponen, dan aturan |
| `docs/AUDIT.md` | Hasil audit proyek UTS secara lengkap |
| `docs/DEPLOY.md` | Panduan deployment lokal, Sepolia, dan publikasi online |
| `docs/ALUR_DEMO.md` | Urutan demonstrasi untuk presentasi di kelas |
| `README.md` | Ringkasan proyek dan perintah yang tersedia |
