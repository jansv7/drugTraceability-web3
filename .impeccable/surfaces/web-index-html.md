---
version: 1
slug: "web-index-html"
primary_target: "web/index.html"
related_targets: ["web/verifikasi.html","web/dashboard.html","web/daftar-aktor.html","web/panduan.html"]
---

# Surface: DrugTraceability Web App (5 halaman)

Mode: **Operate**. Pengguna menyelesaikan tugas: mencatat batch, memindahkan custody,
memverifikasi obat, menandai recall, dan membuktikan ke penguji bahwa aturan kontrak berlaku.

## Audience, job, action, constraints

- Pengguna penilai: dosen penguji UAS. Job: memastikan purwarupa UTS sudah menjadi aplikasi web yang
  benar-benar terhubung ke smart contract, dengan pemisahan hak akses yang terbukti.
- Pengguna operasional: pabrik, distributor/PBF, apotek, BPOM. Job: mencatat dan memindahkan batch
  serta menarik batch bermasalah.
- Pengguna umum: pasien. Job: memeriksa apakah satu batch terdaftar dan masih berlaku, tanpa wallet.
- Bukti yang tersedia: 15 pengujian kontrak lulus (12 di antaranya skenario BAB III laporan UTS),
  4 batch data contoh pada node lokal, 1 di antaranya berstatus recall.
- Batasan: tema terang saja, tanpa proses build, tanpa server backend, seluruh data dibaca dari
  kontrak, dilarang menampilkan data contoh seolah-olah data blockchain asli.

## Chosen direction and memorable moment

Arah: **Kartu Stok Batch** (pilihan pengguna, kartu IMPECCABLE'S PICK pada putaran arah).

Setiap catatan batch diperlakukan sebagai entri kartu stok gudang: identitas batch sebagai kepala
kartu, riwayat perpindahan sebagai kolom mutasi masuk/keluar/saldo dengan nomor blok di kolom paling
kanan, dan tiga kolom tanda tangan di kaki kartu berisi **diisi oleh alamat wallet**, **diperiksa
oleh nama modifier kontrak**, **disetujui pada nomor blok dan hash transaksi**.

Momen yang diingat: seluruh halaman terasa seperti satu lembar buku besar apotek yang terbuka di
bawah lampu, dan setiap baris data punya jejak tanda tangan yang bisa ditelusuri sampai ke blok.

## Unresolved decisions

- Apakah aplikasi wajib dipublikasikan online. Belum dijawab dosen; dibiarkan terbuka.
- Apakah dosen meminta kontrak diubah agar pabrik tidak dapat menarik batch milik pabrik lain.
  Kontrak tidak diubah sampai ada persetujuan.

---

## Direction contract

THESIS: Halaman ini satu lembar kartu stok apotek yang terbuka. Setiap batch adalah entri dengan
kepala identitas, kolom mutasi masuk/keluar/saldo bernomor blok, dan kaki tanda tangan berisi alamat
wallet, nama modifier kontrak, dan hash transaksi. Yang ditolak: hero ikut tengah, tiga kartu fitur
sejajar, kartu sudut membulat dengan ikon garis, dan gradasi berwarna.

OWN-WORLD: Kertas netral sejuk #f6f7f6 sebagai tanah; tinta hampir hitam #191919; satu warna aksen
lumut #3a5741 untuk tindakan dan penanda aktif; stempel merah #8c2f24 khusus keadaan bahaya (recall,
kesalahan, peringatan keras); oker #7a5309 untuk keadaan tunggu. Garis pemisah 1px warna #c6cbc7,
garis kepala 2px tinta. Sudut 0px di seluruh komponen, tanpa pengecualian. Judul dan label memakai
grotesque sempit Archivo; seluruh angka, alamat, dan hash memakai Azeret Mono dengan lebar digit tetap.
Komponen: rel tindakan gelap #1f2a24 sebagai satu-satunya bidang gelap, kepala kartu bergaris ganda,
tabel dengan baris petak, bilah masa edar, blok tanda tangan tiga kolom, segel status miring.

STORY: Pengunjung paham bahwa ini alat kerja pencatatan obat, bukan halaman promosi; percaya bahwa
angka di layar berasal dari ledger karena tiap baris membawa nomor blok dan hash; lalu menjalankan
tugasnya atau memeriksa satu batch.

FIRST VIEWPORT: Kepala kartu selebar halaman: nama batch dalam ukuran besar rata kiri, di kanan
segel kedaluwarsa miring sedikit. Di bawahnya kolom fakta bernomor kontrak: NIE, serial, produksi,
kedaluwarsa, Batch ID, diletakkan sebagai daftar berlabel di kiri dan bilah masa berlaku dengan
penanda hari ini di kanan. Lalu tabel mutasi: tanggal, uraian, masuk, keluar, saldo pemegang, blok.
Tindakan utama (registrasi batch / transfer / recall, sesuai role) duduk di bilah rel gelap di atas,
bukan di tengah halaman. Panel kanan sempit memuat identitas batch dan catatan recall.

FORM: Kartu stok gudang dan buku besar apotek. Posisi 1 dari 7 pada daftar kandidat saya. seed:f568b8fefd004356

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
