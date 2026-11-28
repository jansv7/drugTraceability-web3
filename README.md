# DrugTraceability - Aplikasi Web

Antarmuka web untuk smart contract `DrugTraceability`, hasil pengembangan proyek UTS Blockchain
menjadi aplikasi yang dapat dicoba pengguna lain melalui beberapa wallet dengan role berbeda.

Tugas: UAS Blockchain, Kelompok 4E Informatika, Universitas Singaperbangsa Karawang.

---

## Ringkas

| Bagian | Isi |
|---|---|
| `contracts/` | Smart contract Solidity proyek UTS (`DrugTypes.sol`, `DrugAccessControl.sol`, `DrugTraceability.sol`) |
| `test/` | 15 pengujian otomatis kontrak, mencakup 12 skenario pada laporan UTS |
| `scripts/` | Skrip deploy, pengisian data contoh, server statis, uji server |
| `web/` | Aplikasi web: 5 halaman, gaya, skrip, huruf lokal, ABI, dan konfigurasi kontrak |
| `docs/` | Panduan deployment, laporan UAS, alur demo, dan tangkapan layar |
| `DESIGN.md` | Sistem desain: token warna, huruf, tata letak, dan aturan tampilan |

Tampilan memakai satu arah visual: **kartu stok apotek**. Setiap catatan batch adalah lembar kartu
stok dengan kepala identitas, tabel mutasi masuk/keluar/saldo, nomor blok pada setiap baris, dan kaki
tiga kolom tanda tangan. Tema terang saja, sudut 0px, tanpa bayangan pada lembar data, dan seluruh
angka memakai huruf monospace berlebar digit tetap. Aturan lengkapnya ada pada `DESIGN.md`.

Halaman aplikasi:

| Berkas | Kegunaan |
|---|---|
| `web/index.html` | Beranda: penjelasan sistem, hak akses tiap role, ringkasan hasil pengujian |
| `web/verifikasi.html` | Verifikasi publik: tanpa wallet, memeriksa batch dan riwayat distribusinya |
| `web/dashboard.html` | Dashboard sesuai role: registrasi batch, transfer custody, recall, daftar aktor, log aktivitas |
| `web/daftar-aktor.html` | Pengajuan pendaftaran aktor kepada regulator |
| `web/panduan.html` | Panduan penggunaan dan daftar periksa pengujian untuk dosen |

---

## Menjalankan di komputer sendiri

Butuh Node.js 18 atau lebih baru.

```bash
npm install
```

Terminal pertama, jalankan node blockchain lokal dan biarkan tetap berjalan:

```bash
npm run node
```

Terminal kedua, deploy kontrak lalu isi data contoh:

```bash
npm run deploy:local
npm run seed:local
npm run web
```

Buka `http://127.0.0.1:5173/` pada peramban.

`npm run deploy:local` menulis dua berkas secara otomatis sehingga antarmuka selalu memakai kontrak
yang baru saja di-deploy: `web/abi/DrugTraceability.js` dan `web/contract-config.js`.

### Menyiapkan MetaMask

1. Pasang ekstensi MetaMask.
2. Tambahkan jaringan baru:
   - Nama jaringan: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Simbol: `ETH`
3. Impor akun uji. Private key dicetak oleh `npm run node` pada terminal.
   Gunakan hanya untuk pengujian; jangan pernah memakai akun asli atau menyimpan seed phrase di berkas proyek.

### Akun untuk demo

| Akun | Role pada sistem | Cara menyiapkan |
|---|---|---|
| #0 | BPOM (Regulator) | Otomatis menjadi regulator saat kontrak di-deploy |
| #1 | Pabrik | Didaftarkan oleh regulator, sudah dilakukan oleh `npm run seed:local` |
| #2 | Distributor | Idem |
| #3 | Apotek / Rumah Sakit | Idem |
| #4 | Belum terdaftar | Dipakai untuk menguji penolakan akses |

---

## Perintah yang tersedia

| Perintah | Kegunaan |
|---|---|
| `npm test` | Menjalankan 15 pengujian otomatis kontrak |
| `npm run compile` | Mengompilasi kontrak Solidity |
| `npm run node` | Menjalankan node blockchain lokal (chainId 31337) |
| `npm run deploy:local` | Deploy kontrak ke node lokal + memperbarui ABI dan konfigurasi web |
| `npm run seed:local` | Mengisi aktor, batch, perpindahan custody, dan satu batch recall |
| `npm run deploy:sepolia` | Deploy ke Sepolia Testnet (butuh berkas `.env`, lihat `docs/DEPLOY.md`) |
| `npm run web` | Menjalankan server statis untuk folder `web` pada port 5173 |

Huruf Archivo dan Azeret Mono disajikan dari folder `web/assets/fonts/`, bukan diambil dari internet,
sehingga demo tetap berjalan tanpa koneksi.

---

## Aturan yang dipegang aplikasi ini

1. **Tidak ada pemilihan role mandiri.** Kontrak hanya mengizinkan regulator memanggil
   `registerActor()`, jadi pengguna lain mengajukan permintaan melalui halaman Pendaftaran Aktor.
2. **Tidak ada data contoh yang disamarkan sebagai data blockchain.** Semua batch, role, status
   recall, dan riwayat perpindahan dibaca dari kontrak. Data yang dihasilkan `npm run seed:local`
   memang transaksi sungguhan pada node lokal, bukan data palsu di sisi antarmuka.
3. **Permintaan pendaftaran bukan data blockchain.** Pengajuan disimpan pada `localStorage`
   peramban dan ditandai jelas pada antarmuka sebagai catatan kerja, bukan pencatatan on-chain.
4. **Private key tidak pernah disentuh antarmuka.** Tanda tangan transaksi dilakukan oleh wallet
   pengguna; berkas proyek tidak menyimpan kunci apa pun.

Batasan yang jujur perlu disebut ada pada halaman Panduan dan pada `docs/LAPORAN_UAS.md`.

---

## Dokumentasi lain

- `docs/DEPLOY.md` - panduan deployment ke node lokal dan Sepolia Testnet, termasuk cara publikasi online.
- `docs/LAPORAN_UAS.md` - laporan pengembangan: hasil audit proyek UTS, arsitektur, pemetaan fungsi, dan pengujian.
- `docs/LAPORAN_UAS.docx` - versi Word dari laporan tersebut agar tim dapat merevisinya.
- `docs/gambar/` - tangkapan layar antarmuka untuk lampiran laporan.
