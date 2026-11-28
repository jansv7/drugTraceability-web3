# Alur Penggunaan DrugTraceability (dari nol sampai selesai)

Panduan ini ditulis mengikuti label menu yang benar-benar ada di aplikasi. Perkiraan waktu demo
10 sampai 15 menit. Urutannya mengikuti alur nyata distribusi obat: pabrik, distributor, apotek,
lalu pasien.

**Semua perintah dijalankan di folder proyek:**

```
C:\Users\USER\Projects\DrugTraceabilityWeb
```

---

## Bagian 0 - Menyiapkan (sekali saja, sebelum masuk kelas)

### Langkah 1: Terminal 1, jalankan node blockchain

Buka terminal di folder proyek, lalu:

```
npm run node
```

Tunggu sampai muncul baris ini. Selama demo, **jangan tutup terminal ini**:

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

Terminal ini juga mencetak 20 akun uji beserta private key-nya. Biarkan tetap terlihat, karena
kunci itu dipakai untuk mengimpor akun ke MetaMask. Lima akun pertama yang dipakai demo:

| Urutan | Alamat | Peran di sistem |
|---|---|---|
| Akun #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | BPOM (Regulator) |
| Akun #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Pabrik (Manufacturer) |
| Akun #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Distributor |
| Akun #3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | Apotek |
| Akun #4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | Belum berperan (untuk uji penolakan) |

Private key tiap akun tercetak di Terminal 1. Akun-akun ini akun uji Hardhat yang sudah diketahui
publik, jadi aman ditulis di sini, tetapi **jangan dipakai di jaringan asli**. Salin dari Terminal 1
saja supaya tidak salah.

### Langkah 2: Terminal 2, pasang kontrak dan isi data

Buka terminal **baru** (jangan menutup Terminal 1), di folder proyek yang sama, lalu jalankan tiga
perintah berurutan:

```
npm run deploy:local
npm run seed:local
npm run web
```

Arti tiap perintah:

| Perintah | Yang dikerjakan |
|---|---|
| `npm run deploy:local` | Menanam smart contract ke node lokal, lalu menulis alamat dan ABI ke folder `web/` |
| `npm run seed:local` | Mengisi data contoh: 4 batch, 1 di antaranya berstatus recall |
| `npm run web` | Menjalankan server halaman web |

Perintah terakhir mencetak alamat situs. Biarkan Terminal 2 tetap terbuka juga:

```
http://127.0.0.1:5173/
```

Kalau `deploy:local` gagal dengan pesan `EADDRINUSE`, artinya ada node lama yang belum mati. Lihat
bagian "Kalau ada yang bermasalah" di bawah.

### Langkah 3: Browser, buka situsnya

Buka `http://127.0.0.1:5173/`. Beranda muncul dengan angka yang dibaca dari kontrak.

Kalau angka pada beranda masih tanda "—" beberapa detik, tunggu sebentar lalu muat ulang. Halaman
sedang membaca blockchain.

### Langkah 4: MetaMask, siapkan jaringan dan akun

Tanpa langkah ini, tombol transaksi tidak akan bekerja.

**4a. Tambahkan jaringan Hardhat Local**

Di MetaMask: **Pengaturan → Jaringan → Tambah jaringan → Tambah jaringan secara manual**, lalu isi:

| Kolom | Isi |
|---|---|
| Nama jaringan | `Hardhat Local` |
| URL RPC baru | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Simbol mata uang | `ETH` |

Simpan, lalu pilih jaringan **Hardhat Local**.

**4b. Impor lima akun**

Di MetaMask: klik pemilih akun → **Tambah akun atau dompet → Impor akun**, lalu tempel private key
dari Terminal 1. Ulangi untuk akun #0 sampai #4.

Beri nama tiap akun agar tidak tertukar saat demo: `BPOM`, `Pabrik`, `Distributor`, `Apotek`,
`Tanpa Role`.

**4c. Pastikan sudah benar**

Buka beranda, klik **Hubungkan wallet** di kanan atas. Kalau alamat akun muncul di kepala halaman,
sambungan sudah benar.

---

## Data yang tersedia setelah `npm run seed:local`

Inilah isi blockchain saat demo dimulai. Angka ini dibaca langsung dari kontrak, bukan dari berkas
contoh:

| Kode batch | NIE | Serial | Pemegang sekarang | Perpindahan | Status |
|---|---|---|---|---|---|
| PARA-2026-001 | DKI123456789 | SN-PR-0001 | Apotek | 2 | Berlaku |
| PARA-2026-002 | DKI123456789 | SN-PR-0002 | Distributor | 1 | Berlaku |
| AMOX-2026-014 | DKI998877665 | SN-AM-0014 | Distributor | 1 | **Recall** |
| VITA-2026-003 | DKI554433221 | SN-VT-0003 | Pabrik | 0 | Berlaku, belum berpindah |

---

## Bagian 1 - Pasien memeriksa obat tanpa wallet (pembuka demo)

**Tujuan:** menunjukkan sistem bisa dipakai orang biasa tanpa akun apa pun.

1. Dari beranda, klik menu **Periksa Batch**.
2. Biarkan mode **Pakai data kemasan** yang aktif. Isi tiga kolom sesuai tulisan di kemasan:
   - NIE: `DKI123456789`
   - Kode batch: `PARA-2026-001`
   - Nomor serial: `SN-PR-0001`
3. Perhatikan kolom **Batch ID hasil hitungan kontrak** terisi sendiri. Jelaskan:
   *"ID ini bukan dibuat website, tapi dihitung smart contract lewat `computeBatchId()` dengan
   keccak256 dari ketiga data tadi."*
4. Klik **Periksa batch**.
5. Hasil yang muncul:
   - Kode batch `PARA-2026-001` dengan segel **BERLAKU**
   - `Berlaku 730 hari lagi`, dengan bilah masa edar
   - Pemegang kini: akun Apotek
   - Tiga kolom keterangan: **Diisi** (alamat pabrik), **Diperiksa kontrak**
     (`onlyRole(Manufacturer)`), **Tercatat pada blok** (nomor blok pencatatan)
   - Tabel **Riwayat mutasi**: baris "Dicatat pabrik", lalu dua baris perpindahan custody, lengkap
     dengan kolom Masuk, Keluar, Saldo pemegang, dan Blok
6. Di kartu **Tautan tetap & kode QR**, klik **Tampilkan QR** untuk menunjukkan tautan verifikasi
   yang bisa ditempel di kemasan obat.
7. Ulangi dengan batch bermasalah: NIE `DKI998877665`, kode batch `AMOX-2026-014`, serial
   `SN-AM-0014`. Hasilnya segel merah **RECALL** beserta alasan penarikannya.
8. Untuk menunjukkan data tidak bisa dipalsukan: klik **Pakai Batch ID**, tempel ID sembarang
   berawalan `0x` sepanjang 66 karakter, lalu periksa. Muncul "Batch tidak ditemukan".

**Poin yang ditekankan:** halaman ini tidak membutuhkan MetaMask, dan semua angka di layar adalah
hasil pembacaan langsung dari blockchain.

---

## Bagian 2 - Pengajuan peran, lalu BPOM yang mendaftarkan

**Tujuan:** menunjukkan bahwa peran tidak bisa dipilih sendiri oleh pengguna. Ini aturan penting
pada laporan.

### Langkah A: calon aktor mengajukan (pakai akun `Tanpa Role`)

1. Di MetaMask, pilih akun **Tanpa Role**.
2. Buka menu **Pengajuan Aktor**.
3. Isi formulir:
   - Nama instansi: `PT Kimia Farma Plant Cikarang`
   - Peran yang diajukan: pilih **Pabrik (Manufacturer)**. Pilihannya hanya tiga, yaitu Pabrik,
     Distributor/PBF, dan Apotek/Rumah Sakit. Peran BPOM tidak bisa diajukan sendiri, karena BPOM
     adalah pihak yang menyetujui.
   - Alamat wallet: klik **Pakai wallet yang terhubung**, atau tempel
     `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`
4. Klik **Simpan pengajuan**.
5. Perhatikan notifikasinya: pengajuan hanya tersimpan sebagai catatan pada peramban, **belum masuk
   blockchain**. Ini disengaja.

### Langkah B: BPOM memproses pengajuan

6. Di MetaMask, ganti ke akun **BPOM**.
7. Buka menu **Ruang Kerja**. Perhatikan menu yang muncul hanya untuk BPOM: **Tarik batch**,
   **Aktor**, **Permintaan peran**, **Log blok**.
8. Buka tab **Permintaan peran**. Pengajuan tadi muncul di daftar, dengan tombol **Salin** dan
   **Daftarkan**. Di bawah judulnya ada catatan penting: daftar ini hanya catatan kerja pada
   peramban, bukan data blockchain.
9. Klik **Daftarkan**. Muncul dialog **Konfirmasi pendaftaran aktor** yang menyebut nama peran dan
   alamat wallet yang akan didaftarkan. Klik **Kirim transaksi**, lalu setujui di MetaMask.
10. Setelah transaksi selesai, status baris itu berubah dari **MENUNGGU** menjadi **TERDAFTAR**.

**Poin yang ditekankan:** kalau pengguna bisa memilih peran sendiri, sistem tidak ada artinya.
Karena itu kontrak hanya mengizinkan BPOM memanggil `registerActor()`, dan halaman Pengajuan Aktor
hanya menjembatani permintaan.

---

## Bagian 3 - Pabrik mencatat batch baru

**Tujuan:** memenuhi fungsi wajib `registerBatch()`.

1. Di MetaMask, ganti ke akun **Pabrik**.
2. Buka **Ruang Kerja**. Menunya sekarang berbeda: **Batch saya**, **Catat batch**,
   **Pindahkan custody**, **Tarik batch**, **Aktor**, **Log blok**. Tab **Permintaan peran** sudah
   tidak ada, karena itu kewenangan BPOM.
3. Buka tab **Catat batch**.
4. Isi formulir dengan data berikut:
   - NIE: `DKI111222333`
   - Kode batch: `PARA-2026-003`
   - Nomor serial: `SN-PR-0003`
   - Tanggal produksi: `2026-11-28`
   - Tanggal kedaluwarsa: `2028-11-28`
5. Klik **Kirim transaksi pencatatan**, lalu setujui di MetaMask.
6. Setelah selesai, buka tab **Batch saya**. Batch `PARA-2026-003` muncul paling atas dengan status
   **BERLAKU**, perpindahan `0`, dan pemegang Pabrik.

**Dua kegagalan yang sengaja diperlihatkan (ini bagian penilaian):**

7. **Tanggal tidak masuk akal.** Isi tanggal kedaluwarsa **lebih awal** daripada tanggal produksi,
   lalu kirim. Formulir langsung menolak sebelum transaksi dikirim.
8. **Batch ganda.** Coba catat ulang data yang sudah ada: NIE `DKI123456789`, kode batch
   `PARA-2026-001`, serial `SN-PR-0001`. Transaksi berjalan, tetapi kontrak menolak dengan pesan
   *"Batch dengan kombinasi NIE/kode batch/serial ini sudah terdaftar"*.

---

## Bagian 4 - Memindahkan custody (pabrik ke distributor)

**Tujuan:** memenuhi fungsi wajib `transferCustody()`, termasuk penolakannya.

1. Masih sebagai **Pabrik**, buka tab **Pindahkan custody**.
2. Pada pilihan **Pilih dari batch yang Anda pegang**, pilih `PARA-2026-003`. Pratinjau muncul dan
   menandai **ANDA** sebagai pemegang saat ini.
3. **Perlihatkan penolakan dulu.** Isi kolom alamat penerima dengan akun `Tanpa Role`
   (`0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`), lalu kirim. Kontrak menolak:
   *"Penerima belum terdaftar sebagai aktor rantai pasok"*. Perhatikan nomor blok tidak bertambah.
4. Sekarang ganti alamat penerima menjadi akun **Distributor**
   (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`).
5. Klik **Kirim transaksi perpindahan**, setujui di MetaMask.
6. **Perlihatkan penolakan kedua.** Sebagai Pabrik, coba kirim batch itu sekali lagi. Kontrak
   menolak: *"Anda bukan pemegang batch saat ini"*. Ini membuktikan aturan kepemilikan berlaku.

**Langkah lanjutan, distributor meneruskan ke apotek:**

7. Ganti akun MetaMask ke **Distributor**, buka **Ruang Kerja**.
8. Tab **Batch dipegang** sekarang memuat `PARA-2026-003`, bersama `PARA-2026-002` dan
   `AMOX-2026-014`.
9. Buka tab **Pindahkan custody**, pilih `PARA-2026-003`, isi alamat **Apotek**
   (`0x90F79bf6EB2c4f870365E785982E1f101E93b906`), kirim dan setujui.

**Poin yang ditekankan:** setiap perpindahan tercatat permanen pada blok. Buka tab **Log blok**
untuk melihat rangkaian event `BatchRegistered`, `CustodyTransferred`, dan `BatchRecalled` beserta
nomor blok dan hash transaksinya.

---

## Bagian 5 - Recall, dan bukti batch recall tidak bisa dipindahkan

**Tujuan:** memenuhi fungsi wajib `flagRecall()` dan aturan setelah recall.

1. Ganti akun ke **BPOM**, buka **Ruang Kerja**, tab **Tarik batch**.
2. Tempel Batch ID batch `PARA-2026-003`. ID ini 66 karakter dan bisa disalin dari tab
   **Pindahkan custody** (tombol Salin pada Batch ID), atau ketik dari catatan.
3. Pratinjau muncul dengan kotak hijau **Dapat ditarik**.
4. Isi alasan: `Hasil uji stabilitas tidak memenuhi syarat`.
5. Klik **Kirim transaksi penarikan**. Muncul dialog konfirmasi peringatan bahwa recall
   **tidak dapat dibatalkan**, klik **Ya, tarik batch**, lalu setujui di MetaMask.
6. **Buktikan efeknya.** Ganti akun ke **Distributor** (pemegang batch itu), buka tab
   **Pindahkan custody**. Pada daftar batch, `PARA-2026-003` tidak lagi menawarkan tombol Pindah.
   Kalau tetap dikirim lewat kontrak, pesannya: *"Batch berstatus recall, tidak dapat
   dipindahtangankan"*.
7. **Buktikan tidak bisa recall dua kali.** Sebagai BPOM, buka tab **Tarik batch** dan masukkan batch
   yang sama lagi. Ditolak: *"Batch sudah berstatus recall sebelumnya"*.
8. Buka **Periksa Batch** sebagai pengunjung biasa, masukkan data batch itu. Sekarang segelnya
   **RECALL** dengan alasannya.

**Poin yang ditekankan:** aturan ini bukan ditegakkan halaman web, melainkan `require()` di dalam
smart contract. Mengubah berkas HTML tidak bisa melewatinya.

---

## Bagian 6 - Kasus yang wajib ditunjukkan

| Yang ditunjukkan | Caranya | Hasil yang muncul |
|---|---|---|
| Wallet belum terhubung | Buka **Ruang Kerja** tanpa menghubungkan wallet | Layar ajakan menghubungkan wallet, menu tidak tampil |
| Wallet tanpa peran | Hubungkan akun `Tanpa Role` | Layar "Wallet ini belum memiliki peran" beserta penjelasan cara mengajukan |
| Jaringan salah | Pindahkan MetaMask ke jaringan lain, misalnya Ethereum Mainnet | Peringatan jaringan beserta tombol pindah jaringan, transaksi dinonaktifkan |
| Transaksi dibatalkan | Kirim transaksi apa pun, lalu klik **Reject** di MetaMask | Notifikasi transaksi dibatalkan, nomor blok tidak bertambah |
| Tanggal tidak valid | Catat batch dengan kedaluwarsa sebelum produksi | Formulir menolak, dan kontrak juga akan menolak |
| Pendaftaran ganda | Catat batch dengan NIE/batch/serial yang sudah ada | Ditolak kontrak: "sudah terdaftar" |
| Transfer ke aktor tak terdaftar | Kirim custody ke akun `Tanpa Role` | Ditolak kontrak |
| Transfer batch recall | Bagian 5 langkah 6 | Ditolak kontrak |
| Recall dua kali | Bagian 5 langkah 7 | Ditolak kontrak |
| Tampilan ponsel | Kecilkan jendela browser sampai sempit | Menu berubah jadi tombol lipat, tabel bisa digulir sendiri, halaman tidak melebar |

---

## Mengakhiri demo

Tekan `Ctrl+C` di **kedua** terminal, mulai dari Terminal 2 (server web), lalu Terminal 1 (node).

Kalau hanya menutup jendela terminal tanpa `Ctrl+C`, proses bisa tetap hidup dan membuat
`npm run node` berikutnya gagal dengan `EADDRINUSE`.

---

## Kalau ada yang bermasalah

| Gejala | Tindakan cepat |
|---|---|
| Angka pada beranda masih "—" | Tunggu 3 sampai 5 detik, lalu muat ulang. Pastikan Terminal 1 masih hidup. |
| Daftar batch kosong di Ruang Kerja | Pastikan `npm run seed:local` sudah dijalankan, lalu klik **Pindai ulang** |
| Peringatan jaringan tidak dikenal | Klik tombol pindah jaringan, atau ganti MetaMask ke **Hardhat Local** |
| Tombol Hubungkan wallet tidak bereaksi | Pastikan membuka lewat `http://127.0.0.1:5173/`, bukan mengklik dua kali berkas HTML |
| Transaksi gagal dengan pesan nonce | MetaMask: **Pengaturan → Lanjutan → Clear activity tab data** |
| `npm run deploy:local` gagal `EADDRINUSE` | Ada node lama yang belum mati. Lihat bagian berikut. |
| Data kacau, ingin mulai bersih | `Ctrl+C` di Terminal 1, jalankan ulang `npm run node`, lalu di Terminal 2 `npm run deploy:local` dan `npm run seed:local` |

### Memastikan port 8545 benar-benar bebas

Perintah `netstat -ano | findstr :8545` bisa menampilkan baris `TIME_WAIT` sehingga port terlihat
terpakai padahal sudah bebas, dan sebaliknya bisa tampak kosong padahal ada node yang masih hidup.
Cara paling dapat dipercaya adalah menanyakan langsung ke node:

```
curl -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_blockNumber\",\"params\":[]}" http://127.0.0.1:8545
```

- Ada jawaban berisi `"result":"0x..."` berarti **masih ada node hidup**, port dipakai.
- Tidak ada jawaban atau `Connection refused` berarti **port bebas**, aman menjalankan
  `npm run node`.

Kalau masih terpakai, cari PID pemegang port yang sebenarnya lalu hentikan:

```
powershell -Command "Get-NetTCPConnection -LocalPort 8545 | Select-Object OwningProcess"
powershell -Command "Stop-Process -Id <PID> -Force"
```

Catatan: saat menjalankan `npx hardhat node`, PID yang tampil di jendela terminal belum tentu PID
yang benar-benar memegang port. Pakai angka dari `Get-NetTCPConnection` di atas.

---

## Kalimat penutup untuk presentasi

1. Website ini antarmuka, bukan pengganti aturan. Semua keputusan sah atau tidaknya sebuah transaksi
   tetap dibuat smart contract di blockchain.
2. Pemisahan hak akses sudah diuji memakai beberapa wallet berbeda, bukan hanya satu akun.
3. Proyek UTS yang tadinya hanya bisa dijalankan lewat Remix IDE sekarang bisa dipakai pengguna lain
   sesuai perannya masing-masing, termasuk pasien yang hanya ingin memeriksa obat tanpa wallet.

---

## Berkas pendukung

| Berkas | Isi |
|---|---|
| `docs/DEPLOY.md` | Cara deploy ke Sepolia dan publikasi online |
| `docs/LAPORAN_UAS.docx` | Laporan UAS lengkap, siap cetak |
| `DESIGN.md` | Sistem desain tampilan |
| `README.md` | Ringkasan proyek dan daftar perintah |