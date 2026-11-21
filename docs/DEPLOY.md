# Panduan Deployment DrugTraceability

Dokumen ini menjelaskan tiga cara menjalankan aplikasi: lokal (cara utama untuk demo UAS),
Sepolia Testnet, dan publikasi online sehingga pengguna lain bisa membuka lewat tautan.

---

## 1. Lokal: node Hardhat + server statis

Cara ini yang dipakai untuk demo di kelas. Tidak butuh ETH, tidak butuh internet.

**Terminal pertama** - node blockchain lokal:

```bash
npm run node
```

Terminal akan mencetak 20 akun beserta private key-nya. Biarkan proses ini berjalan.

**Terminal kedua** - deploy dan isi data contoh:

```bash
npm run deploy:local
npm run seed:local
npm run web
```

Buka `http://127.0.0.1:5173/`.

**MetaMask** - tambahkan jaringan dengan data berikut:

| Kolom | Nilai |
|---|---|
| Nama jaringan | Hardhat Local |
| RPC URL | http://127.0.0.1:8545 |
| Chain ID | 31337 |
| Simbol mata uang | ETH |

Impor akun uji memakai private key dari output `npm run node`. Setiap akun mewakili satu peran
(BPOM, pabrik, distributor, apotek, dan satu akun yang sengaja dibiarkan tanpa role).

Catatan: `npm run deploy:local` otomatis memperbarui `web/abi/DrugTraceability.js` dan
`web/contract-config.js`. Jika kontrak di-deploy ulang, muat ulang halaman agar alamat baru terbaca.

---

## 2. Sepolia Testnet

Dipakai bila dosen meminta jaringan publik dan setiap transaksi dapat diverifikasi melalui block explorer.

### 2.1 Menyiapkan berkas .env

Buat berkas `.env` pada folder proyek (tidak ikut ter-commit, sudah masuk `.gitignore`):

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/KUNCI_PROYEK_ANDA
DEPLOYER_PRIVATE_KEY=0xKUNCI_PRIVATE_AKUN_UJI
```

Keterangan:

- `SEPOLIA_RPC_URL`: alamat RPC penyedia node. Bisa dari Infura, Alchemy, atau penyedia lain.
- `DEPLOYER_PRIVATE_KEY`: kunci akun uji yang dipakai untuk deploy. Akun ini otomatis menjadi
  regulator. Buat akun khusus untuk keperluan ini, jangan pakai akun utama.

Berkas `.env` tidak boleh dibagikan atau dimasukkan ke repositori.

### 2.2 Mengambil ETH uji

Ambil ETH Sepolia gratis dari faucet, misalnya `https://sepoliafaucet.com` atau
`https://www.alchemy.com/faucets/ethereum-sepolia`. Satu deploy kontrak dan beberapa transaksi
pengujian cukup dengan sekitar 0,05 ETH.

### 2.3 Deploy

```bash
npm run deploy:sepolia
```

Setelah selesai, `web/contract-config.js` akan berisi entri untuk chainId 11155111 (Sepolia) di
samping entri jaringan lokal. Antarmuka memilih alamat kontrak sesuai jaringan wallet yang aktif,
jadi pengguna dapat berpindah antara jaringan lokal dan Sepolia tanpa mengubah kode.

Pastikan variabel `SEPOLIA_RPC_URL` sudah terisi sebelum deploy agar kolom `rpcUrl` pada berkas
konfigurasi ikut terisi. Kolom itu dipakai halaman verifikasi publik untuk membaca batche tanpa wallet.

---

## 3. Publikasi online

Sasaran: pengguna lain dapat membuka website dan mencoba sendiri. Yang dipublikasikan hanya folder
`web`, karena aplikasi ini tidak memerlukan server backend. Semua logika berada pada smart contract
dan seluruh berkas bersifat statis.

### 3.1 Publikasi frontend

**Opsi A: Netlify Drop (paling cepat)**

1. Jalankan `npm run deploy:sepolia` lebih dahulu agar `web/contract-config.js` menunjuk ke kontrak Sepolia.
2. Buka `https://app.netlify.com/drop`.
3. Seret folder `web` ke halaman tersebut.
4. Netlify memberi tautan publik, misalnya `https://drugtraceability-kelompok4.netlify.app`.

**Opsi B: Vercel**

```bash
npx vercel --prod
```

Saat diminta, arahkan direktori keluaran ke `web`.

**Opsi C: GitHub Pages**

1. Unggah isi folder `web` ke repositori GitHub.
2. Aktifkan Pages pada pengaturan repositori, pilih branch dan folder tersebut.
3. Tautan publik berbentuk `https://<pengguna>.github.io/<repositori>/`.

Perlu diperhatikan: beberapa penyedia hosting hanya melayani permintaan berkas, bukan direktori.
Pada Netlify dan Vercel hal ini sudah ditangani otomatis. Untuk GitHub Pages, gunakan berkas
`index.html` sebagai halaman utama seperti yang sudah tersedia pada folder `web`.

### 3.2 Catatan penting setelah publikasi

- **Wallet pengguna harus berada pada jaringan yang sama dengan kontrak.** Jika kontrak di Sepolia,
  pengguna juga harus memasang Sepolia di MetaMask. Dashboard akan menampilkan peringatan bila
  jaringan tidak sesuai, lengkap dengan tombol berpindah jaringan.
- **Verifikasi kontrak di Etherscan (opsional).** Setelah deploy ke Sepolia, kontrak dapat
  diverifikasi agar kode sumbernya terbaca publik. Cara termudah memakai Etherscan dengan mengunggah
  berkas pada `contracts/`.
- **Data contoh pada Sepolia tidak otomatis ada.** Jalankan `npm run seed:local` dengan jaringan
  Sepolia memakai perintah `npx hardhat run scripts/seed.js --network sepolia` bila ingin batch
  contoh tersedia pada jaringan publik. Perlu diingat setiap transaksi memerlukan ETH uji.
- **Jangan pernah menaruh private key pada frontend.** Kunci hanya ada pada berkas `.env` di komputer
  Anda, dan hanya dipakai oleh skrip deploy di sisi Node.js.

---

## 4. Pemecahan masalah

| Gejala | Penyebab dan tindakan |
|---|---|
| Tombol Hubungkan Wallet tidak berfungsi | MetaMask belum terpasang, atau halaman dibuka langsung sebagai berkas (`file://`) dan peramban memblokir wallet. Jalankan `npm run web` lalu buka lewat `http://127.0.0.1:5173/`. |
| Peringatan jaringan tidak sesuai | Wallet berada pada chainId berbeda dari kontrak. Klik tombol pindah jaringan, atau tambahkan jaringan secara manual. |
| Halaman verifikasi gagal membaca batch | Node lokal belum berjalan (`npm run node`), atau RPC pada `web/contract-config.js` salah. |
| Transaksi gagal dengan pesan nonce | Bersihkan aktivitas akun di MetaMask: Pengaturan, Lanjutan, Clear activity tab data. |
| Daftar batch kosong padahal ada | Kontrak di-deploy ulang sehingga nomor blok deployment berubah. Klik Pindai ulang pada tab batch. |
