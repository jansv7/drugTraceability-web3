# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML, CSS, dan JavaScript statis (tanpa framework, tanpa proses build). Dikonfirmasi pengguna:
tetap seperti ini, tidak pindah ke React. Berkas dibuka langsung atau lewat server statis lokal.
Kontrak Solidity dikembangkan dengan Hardhat 2 dan diuji dengan Chai.

## Users

**Pengguna utama (penilai):** dosen penguji UAS dan tim penyusun (Kelompok 4E Informatika,
Universitas Singaperbangsa Karawang). Situasinya: menilai apakah purwarupa UTS yang tadinya hanya
bisa dijalankan lewat Remix IDE sudah benar-benar menjadi aplikasi web yang dapat dipakai pengguna
lain, dengan pemisahan hak akses yang terbukti. Yang mereka butuhkan: cepat memahami sistemnya,
cepat menemukan bukti bahwa aturan smart contract benar-benar berlaku, dan mudah menjalankan
skenario pengujian satu per satu.

**Pengguna operasional:** pabrik (manufacturer), distributor/PBF, apotek/rumah sakit, dan BPOM
sebagai regulator. Situasinya: mencatat batch obat, memindahkan tanggung jawab (custody), dan
menandai batch bermasalah. Mereka bukan ahli blockchain dan tidak perlu memahami istilah teknis.

**Pengguna umum:** pasien dan masyarakat yang hanya ingin memeriksa apakah sebuah obat terdaftar
dan masih berlaku. Mereka tidak punya wallet dan tidak mau membuat akun.

## Product Purpose

Antarmuka web untuk smart contract `DrugTraceability`. Membuat aturan pelacakan distribusi obat yang
sudah diprogram di blockchain dapat dijalankan orang lain melalui antarmuka yang mudah dipakai,
tanpa harus memahami fungsi Solidity satu per satu. Keberhasilan berarti: pengguna dapat
menghubungkan wallet, memperoleh hak akses sesuai role yang tersimpan di kontrak, menjalankan
registrasi aktor, registrasi batch, perpindahan custody, verifikasi, dan recall, serta melihat
status setiap transaksi apa adanya, termasuk ketika transaksi ditolak atau dibatalkan.

## Positioning

Aturan sistem dijalankan dan diamankan oleh smart contract, bukan oleh halaman web. Mengubah berkas
HTML atau JavaScript tidak dapat melewati aturan seperti penolakan transfer batch yang berstatus
recall atau penolakan penerima yang belum terdaftar. Konsekuensinya: tidak ada sistem akun, tidak
ada password, dan tidak ada pemilihan role mandiri. Wallet menjadi identitas, dan BPOM (regulator)
satu-satunya pihak yang dapat mendaftarkan aktor. Halaman verifikasi terbuka untuk siapa saja karena
hanya memanggil fungsi baca, sehingga pasien dapat memakainya tanpa wallet.

## Operating Context

- Lingkungan demo: node blockchain lokal Hardhat (chainId 31337) atau Sepolia Testnet (11155111).
- Wallet: MetaMask. Akun uji diimpor memakai private key yang dicetak `npx hardhat node`.
- Data contoh untuk demonstrasi dibuat skrip `npm run seed:local`: 3 aktor, 4 batch, 2 perpindahan
  custody, dan 1 batch berstatus recall.
- Demo di kelas memakai laptop dengan jendela peramban lebar.
- Skenario penilaian mengikuti 12 skenario pengujian pada laporan UTS ditambah kasus antarmuka
  (wallet belum terhubung, wallet tanpa role, jaringan salah, transaksi dibatalkan).
- Dokumen pendukung yang sudah ada: laporan UTS (.docx), panduan pengembangan UAS, audit, laporan
  UAS, dan alur demo.

## Capabilities and Constraints

Fungsi kontrak yang tersedia dan dipakai antarmuka: `registerActor()`, `registerBatch()`,
`transferCustody()`, `verifyAuthenticity()`, `getTransferHistory()`, `flagRecall()`,
`computeBatchId()`, ditambah pembacaan `batches()`, `roles()`, dan `regulator()`.

- Role: None, Manufacturer, Distributor, Pharmacy, Regulator. Urutan nilai enum tidak boleh diubah.
- Role hanya dapat diberikan regulator melalui `registerActor()`. Pengguna lain mengajukan
  permintaan; permintaan itu disimpan pada `localStorage` peramban sebagai catatan kerja, **bukan**
  data blockchain, dan harus dinyatakan begitu pada antarmuka.
- Batch ID adalah `keccak256` dari NIE, kode batch, dan nomor serial.
- `flagRecall()` dapat dipanggil regulator atau akun ber-role Manufacturer; kontrak tidak memeriksa
  apakah batch itu milik pabrik pemanggil. Ini keterbatasan yang diketahui; antarmuka memberi
  peringatan, dan perbaikan kontrak menunggu persetujuan dosen.
- Tidak ada server backend dan tidak ada basis data. Tidak ada kunci privat di dalam berkas proyek.
- Tidak ada fungsi kontrak untuk mengambil daftar seluruh batch; daftar disusun dengan memindai
  event dari nomor blok deployment.
- Terminologi yang dipakai konsisten: "batch" untuk kumpulan produksi, "custody" untuk tanggung
  jawab pemegangan, "recall" untuk penarikan batch, "NIE" untuk nomor izin edar.
- Bahasa antarmuka: Indonesia, dengan istilah teknis yang dijelaskan pada konteksnya.

## Brand Commitments

- Nama produk: **DrugTraceability**. Nama mata kuliah dan identitas tim dicantumkan pada laporan,
  tidak perlu dijadikan ornamen antarmuka.
- **Tema terang saja.** Pengguna meminta tidak ada mode gelap; permintaan ini mengikat seluruh
  halaman. Tidak ada media query `prefers-color-scheme: dark` dan tidak ada tombol pengalih tema.
- Nilai yang harus tetap jujur: tidak ada data contoh yang ditampilkan seolah-olah data blockchain
  sungguhan, dan tidak ada klaim yang belum dibuktikan pengujian.

## Evidence on Hand

- `contracts/` tiga berkas Solidity yang identik dengan lampiran laporan UTS (tidak diubah).
- `test/DrugTraceability.test.js`: 15 pengujian otomatis; 12 di antaranya adalah skenario pada
  BAB III laporan UTS. Hasil: seluruhnya lulus.
- `docs/AUDIT.md`, `docs/DEPLOY.md`, `docs/LAPORAN_UAS.md`, `docs/LAPORAN_UAS.docx`,
  `docs/ALUR_DEMO.md`, `docs/ALUR_PENGGUNAAN.md`, `docs/gambar/` enam tangkapan layar.
- Data yang boleh dikarang: isi batch contoh dan nama instansi contoh pada data seed serta
  tangkapan layar, karena semuanya diberi label sebagai data uji.
- Yang tidak boleh dikarang: nama pelanggan, mitra, harga, sertifikasi, atau integrasi dengan
  sistem BPOM. Integrasi dengan BPOM belum ada dan harus tetap dinyatakan belum ada.

## Product Principles

1. Kontrak adalah sumber kebenaran. Antarmuka tidak pernah menampilkan nilai yang tidak dibaca dari
   kontrak, dan tidak memalsukan keberhasilan transaksi.
2. Aturan yang ditegakkan kontrak harus terlihat dapat diperiksa. Penolakan transaksi ditampilkan
   beserta sebabnya, bukan disembunyikan, supaya penguji dapat memverifikasi aturannya.
3. Hak akses ditunjukkan melalui struktur, bukan hanya pesan peringatan: menu yang tidak menjadi
   kewenangan pengguna tidak dibangun, dan pengguna tanpa role diarahkan ke jalur pengajuan.
4. Kejujuran soal batas kemampuan lebih penting daripada tampilan yang meyakinkan.
5. Bahasa manusia lebih dulu: pengguna memahami apa yang harus dilakukan tanpa membaca istilah
   blockchain.

## Accessibility & Inclusion

Kontras teks minimal WCAG AA (4.5:1 untuk teks isi). Seluruh alur dapat dioperasikan dengan
papan ketik, dengan penanda fokus yang terlihat. Status tidak dibedakan hanya oleh warna, tetapi
juga oleh teks label. Halaman tetap dapat dibaca pada layar ponsel 390px, meski sasaran utama
penggunaan adalah laptop/desktop.
