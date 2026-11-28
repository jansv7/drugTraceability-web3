# Audit Proyek DrugTraceability (Tahap 1)

Dokumen ini adalah hasil audit terhadap berkas proyek UTS yang tersedia sebelum pengembangan
dilakukan, disusun mengikuti urutan yang diminta pada dokumen panduan (bagian 10, Instruksi
pertama yang harus dikerjakan AI Agent).

Sumber yang diperiksa:

| Berkas | Keterangan |
|---|---|
| `Downloads/DrugTraceability.sol` | Berkas smart contract versi ringkas (satu berkas, 1926 token) |
| `Downloads/TUGAS KELOMPOK BLOCKCHAIN 1.docx` | Laporan UTS, memuat lampiran versi tiga berkas |
| `Downloads/Panduan_Pengembangan_UAS_DrugTraceability.md` | Arahan pengembangan untuk UAS |

Catatan penting: laporan UTS memuat **dua versi** struktur kontrak. Bagian naratif dan berkas
`Downloads/DrugTraceability.sol` memakai satu kontrak tunggal, sedangkan lampiran laporan
(BAB V, baris 352-547) memakai tiga berkas: `DrugTypes.sol`, `DrugAccessControl.sol`, dan
`DrugTraceability.sol`. Keduanya memiliki perilaku identik karena kontrak tunggal hanya menggabungkan
isi ketiga berkas tersebut. Implementasi UAS memakai **versi tiga berkas** karena itulah yang
terlampir pada laporan yang dikumpulkan.

---

## 1. Struktur folder dan file penting

### Kondisi awal (sebelum pengembangan)

```
Downloads/
├── DrugTraceability.sol                              <- kontrak versi satu berkas
├── Panduan_Pengembangan_UAS_DrugTraceability.md      <- arahan UAS
└── TUGAS KELOMPOK BLOCKCHAIN 1.docx                  <- laporan UTS (memuat lampiran 3 berkas)
```

Tidak ada proyek, repositori, berkas konfigurasi, maupun dependensi. Semua interaksi sejauh ini
dilakukan melalui Remix IDE dengan Remix VM, sehingga tidak ada alamat kontrak tetap, tidak ada
berkas ABI tersimpan, dan tidak ada kode frontend.

### Struktur setelah pengembangan

```
Projects/DrugTraceabilityWeb/
├── contracts/                    Solidity; isi lampiran laporan UTS
│   ├── DrugTypes.sol             enum Role + struct Batch + struct TransferRecord
│   ├── DrugAccessControl.sol     role, registerActor(), modifier
│   └── DrugTraceability.sol      logika utama batch, transfer, verifikasi, recall
├── test/DrugTraceability.test.js 15 pengujian otomatis
├── scripts/
│   ├── deploy.js                 deploy + tulis ABI dan konfigurasi kontrak untuk antarmuka
│   ├── seed.js                   isi data contoh pada node lokal
│   ├── serve.js                  server statis untuk folder web
│   └── test-serve.js             uji berkas server statis
├── web/                          aplikasi web (lihat bagian 7)
├── docs/                         dokumentasi dan laporan
└── hardhat.config.js, package.json, .gitignore
```

---

## 2. Fungsi smart contract yang tersedia

Seluruh nama fungsi, tipe parameter, dan urutan nilai kembalian di bawah ini diambil langsung dari
kode, bukan dari ringkasan laporan.

| Fungsi | Parameter | Nilai kembali | Visibility | Pembatasan |
|---|---|---|---|---|
| `registerActor` | `address _actor`, `Role _role` | - | external | `onlyRegulator`, `_role != Role.None` |
| `registerBatch` | `string _nie`, `string _batchCode`, `uint256 _manufactureDate`, `uint256 _expiryDate`, `string _serialNumber` | `bytes32 batchId` | external | `onlyRole(Manufacturer)` |
| `computeBatchId` | `string _nie`, `string _batchCode`, `string _serialNumber` | `bytes32` | public pure | tidak ada |
| `transferCustody` | `bytes32 _batchId`, `address _to` | - | external | lihat bagian 3 |
| `verifyAuthenticity` | `bytes32 _batchId` | `(bool isAuthentic, string nie, string batchCode, uint256 expiryDate, address currentHolder, bool recalled, uint256 totalPerpindahan)` | external view | tidak ada |
| `getTransferHistory` | `bytes32 _batchId` | `TransferRecord[]` | external view | tidak ada |
| `flagRecall` | `bytes32 _batchId`, `string _reason` | - | external | regulator atau Manufacturer |

Getter otomatis dari variabel publik:

| Getter | Nilai kembali |
|---|---|
| `regulator()` | `address` akun yang men-deploy kontrak |
| `roles(address)` | `Role` (enum, dikembalikan sebagai uint8) |
| `batches(bytes32)` | seluruh 10 field struct `Batch` sebagai tuple |
| `transferHistory(bytes32, uint256)` | satu `TransferRecord` pada indeks tertentu |

Poin integrasi penting: `batches()` mengembalikan tuple, bukan objek bernama. Urutan kolomnya adalah
`nie, batchCode, manufactureDate, expiryDate, serialNumber, manufacturer, currentHolder, recalled,
recallReason, exists`. Antarmuka membaca berdasarkan urutan ini.

Catatan yang ditemukan saat audit: **laporan UTS menyebut satu fungsi lagi, `verifyAuthenticity()`
saja, tetapi tabel fungsi pada BAB III juga mencantumkan `computeBatchId()`** dengan pengguna
"Manufacture/Pengguna". Fungsi ini memang ada dan bersifat `pure` sehingga aman dipanggil siapa saja,
termasuk dari antarmuka sebelum wallet terhubung.

---

## 3. Role dan hak akses masing-masing

Enum `Role { None, Manufacturer, Distributor, Pharmacy, Regulator }`. Nilai numeriknya berurutan
0 sampai 4 dan **urutan ini tidak boleh diubah** karena antarmuka membandingkan angka hasil
`roles(address)`.

| Role | Nilai | Hak akses |
|---|---|---|
| None | 0 | Tidak dapat menjalankan fungsi apa pun yang dibatasi role. Dapat membaca data. |
| Manufacturer | 1 | `registerBatch()`, `transferCustody()` saat memegang batch, `flagRecall()` |
| Distributor | 2 | Menerima custody, `transferCustody()` saat memegang batch |
| Pharmacy | 3 | Menerima custody, `transferCustody()` saat memegang batch |
| Regulator | 4 | `registerActor()`, `flagRecall()`, seluruh fungsi baca |

Tiga aturan akses yang tidak terlihat dari daftar role saja:

1. `regulator` ditetapkan pada konstruktor sebagai `msg.sender` akun yang men-deploy. Tidak ada
   fungsi untuk memindahkan jabatan regulator.
2. `registerActor()` dapat **menimpa** role yang sudah ada. Ini bukan bug, tetapi perlu diketahui
   regulator agar tidak salah menimpa. Antarmuka menampilkan peringatan saat alamat yang dimasukkan
   sudah memiliki role.
3. `flagRecall()` memakai pemeriksaan berbeda dari fungsi lain: bukan memakai modifier, melainkan
   `msg.sender == regulator || roles[msg.sender] == Role.Manufacturer`. Artinya seorang pabrik dapat
   menarik **batch milik pabrik lain**. Ini celah wewenang yang perlu disebut pada laporan dan
   dipertimbangkan perbaikannya. Antarmuka tetap membatasi tampilan sesuai aturan kontrak, dan
   menampilkan peringatan bila pabrik mencoba recall batch yang bukan miliknya.

---

## 4. Data yang disimpan pada blockchain

Struct `Batch` (10 field):

| Field | Tipe | Keterangan |
|---|---|---|
| `nie` | string | Nomor izin edar |
| `batchCode` | string | Kode batch pabrik |
| `manufactureDate` | uint256 | Unix timestamp |
| `expiryDate` | uint256 | Unix timestamp |
| `serialNumber` | string | Nomor serialisasi |
| `manufacturer` | address | Pendaftar batch, pemegang pertama |
| `currentHolder` | address | Pemegang batch saat ini |
| `recalled` | bool | Status recall |
| `recallReason` | string | Alasan recall |
| `exists` | bool | Penanda batch terdaftar |

Struct `TransferRecord` (3 field): `from` (address), `to` (address), `timestamp` (uint256).

Struktur penyimpanan: `mapping(bytes32 => Batch) public batches` dan
`mapping(bytes32 => TransferRecord[]) public transferHistory`.

Batch ID: `keccak256(abi.encodePacked(_nie, _batchCode, _serialNumber))`. Karena memakai
`encodePacked` tanpa pemisah, dua kombinasi berbeda secara teori dapat menghasilkan hash yang sama
misalnya `("AB","C","D")` dan `("A","BC","D")`. Risiko ini kecil dan dapat diterima untuk purwarupa,
tetapi layak disebut sebagai catatan pada laporan.

---

## 5. Event yang tersedia

| Event | Parameter | Dipancarkan oleh |
|---|---|---|
| `ActorRegistered` | `address indexed actor`, `Role role` | konstruktor dan `registerActor()` |
| `BatchRegistered` | `bytes32 indexed batchId`, `string nie`, `string batchCode`, `address indexed manufacturer` | `registerBatch()` |
| `CustodyTransferred` | `bytes32 indexed batchId`, `address indexed from`, `address indexed to`, `uint256 timestamp` | `transferCustody()` |
| `BatchRecalled` | `bytes32 indexed batchId`, `string reason` | `flagRecall()` |

Peran event pada antarmuka: tidak ada fungsi di kontrak yang mengembalikan daftar seluruh batch.
Satu-satunya cara menyusun daftar tersebut adalah memindai event `BatchRegistered` lalu membaca setiap
batch dengan `batches()`. Karena itu event bukan sekadar catatan, melainkan sumber data utama bagi
dashboard. `ActorRegistered` juga dipancarkan pada konstruktor, sehingga regulator selalu muncul pada
daftar aktor.

---

## 6. Dependensi dan konfigurasi proyek

Pada tingkat kontrak, tidak ada dependensi eksternal sama sekali. Kontrak hanya memakai pustaka
bawaan Solidity. Versi pragma `^0.8.19` pada ketiga berkas, dan kontrak juga kompatibel dengan
0.8.20 ke atas.

Dependensi yang ditambahkan untuk pengembangan dan pengujian:

| Paket | Versi | Kegunaan |
|---|---|---|
| `hardhat` | ^2.29 | Kompilasi, jaringan uji lokal, pengujian |
| `ethers` | ^6.17 | Klien blockchain; juga dipakai antarmuka melalui berkas browser |
| `@nomicfoundation/hardhat-ethers` | ^3 | Penghubung Hardhat dan ethers |
| `@nomicfoundation/hardhat-chai-matchers` | ^2 | Pengujian `revertedWith` |
| `chai` | ^4 | Rangka pengujian |
| `qrcode-generator` | ^1.5 | Membuat QR tautan verifikasi |

Hal yang belum tersedia dan perlu disiapkan: berkas ABI hasil kompilasi, alamat kontrak, jaringan
tujuan, dan wallet pengujian. Keempatnya sekarang dihasilkan otomatis oleh `scripts/deploy.js`.

---

## 7. Kebutuhan integrasi frontend

| Kebutuhan | Cara dipenuhi |
|---|---|
| ABI | `scripts/deploy.js` menulis `web/abi/DrugTraceability.js` (dapat dimuat berkas langsung) dan `web/abi/DrugTraceability.json` |
| Alamat kontrak per jaringan | `web/contract-config.js`, dipilih berdasarkan `chainId` wallet |
| Koneksi wallet | MetaMask melalui `window.ethereum`, dibungkus `ethers.BrowserProvider` |
| Pemeriksaan role | `roles(address)` dibaca ulang setiap halaman dimuat dan setiap akun berganti |
| Pembacaan tanpa wallet | `ethers.JsonRpcProvider` baca-saja untuk halaman verifikasi publik |
| Pemetaan tuple `batches()` | Dibaca berdasarkan urutan kolom, dibungkus menjadi objek bernama di `DT.loadBatch()` |
| Daftar batch | Pemindaian event dari blok deployment sampai blok terakhir |
| Daftar aktor | Pemindaian event `ActorRegistered` |
| Penanganan error | Penerjemah pesan `require()` menjadi notifikasi yang dapat dibaca |
| Status transaksi | Tiga tahap: menunggu konfirmasi wallet, transaksi dikirim, masuk ke blok |

Halaman dan panel yang dibangun mengikuti pembagian role pada BAB III laporan: Regulator,
Manufacturer, Distributor, Pharmacy, ditambah halaman verifikasi untuk pengunjung umum.

---

## 8. Potensi masalah atau kekurangan yang ditemukan

Daftar ini disusun sebelum perubahan dilakukan. Nomor 1 sampai 4 adalah temuan pada kontrak,
dan sesuai aturan kerja nomor 6 pada panduan, **kontrak tidak diubah**; temuan dilaporkan dan
solusinya ditempatkan pada sisi antarmuka atau dokumentasi.

1. **Pabrik dapat melakukan recall atas batch pabrik lain.** `flagRecall()` hanya memeriksa apakah
   pemanggil regulator atau ber-role Manufacturer, tanpa memeriksa apakah batch tersebut didaftarkan
   oleh pemanggil. Dampak: dalam skenario multi-pabrik, satu pabrik dapat menghentikan distribusi
   produk pabrik lain.
   Tindakan yang diambil: kontrak dibiarkan sesuai proyek UTS agar tidak mengubah aturan bisnis yang
   sudah dinilai. Antarmuka menampilkan peringatan eksplisit saat pabrik memilih batch milik pabrik
   lain, dan laporan UAS mencantumkan rekomendasi perbaikan: menambahkan syarat
   `b.currentHolder == msg.sender || msg.sender == b.manufacturer` atau memisahkan fungsi khusus regulator.

2. **Tidak ada fungsi untuk mengambil daftar seluruh batch.** Tidak ada penghitung jumlah batch
   maupun array indeks batch. Dampak: antarmuka harus memindai event. Pemindaian bergantung pada
   berkas event node; pada Sepolia penyedia RPC biasanya membatasi rentang blok yang dapat dipindai
   dalam satu permintaan.
   Tindakan: nomor blok deployment disimpan pada `web/contract-config.js`, sehingga pemindaian hanya
   mencakup blok setelah kontrak dibuat. Untuk jaringan publik, rentang blok dapat dibatasi pada
   dokumentasi bila diperlukan.

3. **`registerActor()` dapat menimpa role tanpa konfirmasi tambahan** dan tanpa event khusus yang
   menandai pencabutan role. Dampak: pada sistem nyata, perubahan role perlu jejak audit yang jelas.
   Tindakan: antarmuka menampilkan role yang sedang berlaku pada kolom input, dan menyebutkan pada
   teks konfirmasi bahwa transaksi akan menimpa role lama.

4. **`encodePacked` tanpa pemisah pada `computeBatchId()`.** Dampak teoretis: tabrakan hash untuk
   kombinasi data yang berbeda susunannya. Tindakan: dicatat pada laporan sebagai rekomendasi
   penggunaan `abi.encode` pada versi berikutnya. Perubahan tidak dilakukan agar Batch ID yang sudah
   terbentuk pada demonstrasi UTS tetap sama.

5. **Tidak ada batas atas panjang string.** NIE, kode batch, nomor serial, dan alasan recall tidak
   dibatasi panjangnya. Dampak: pengisian data yang sangat panjang menaikkan biaya gas secara
   tidak perlu. Tindakan: antarmuka membatasi panjang masukan dan menyebutkannya pada formulir.

6. **Tanggal disimpan sebagai Unix timestamp tanpa validasi rentang.** Kontrak hanya memastikan
   `expiryDate > manufactureDate`. Tanggal produksi di masa depan tetap diterima. Tindakan:
   antarmuka menampilkan pratinjau tanggal dalam bentuk yang mudah dibaca dan menandai tanggal
   produksi yang melewati hari ini.

7. **Kontrak belum diuji dengan dua pabrik berbeda pada Remix VM.** Pengujian UTS memakai satu akun
   pabrik. Tindakan: pengujian otomatis yang dibuat sekarang menjalankan skenario multi-aktor,
   termasuk memastikan distributor tidak dapat melakukan recall.

---

## 9. Rekomendasi tahapan implementasi

| Tahap | Isi | Status |
|---|---|---|
| 1 | Audit proyek (dokumen ini) | Selesai |
| 2 | Perencanaan: struktur halaman, navigasi per role, alur pengguna | Selesai |
| 3 | Pembangunan antarmuka: beranda, koneksi wallet, pemeriksaan role, dashboard, verifikasi publik | Selesai |
| 4 | Integrasi kontrak: ABI, alamat per jaringan, pemanggilan baca dan tulis, penanganan error | Selesai |
| 5 | Pengujian: 15 pengujian kontrak dan 9 pemeriksaan antarmuka dengan beberapa akun | Selesai |
| 6 | Deployment dan dokumentasi: konfigurasi jaringan, panduan, laporan | Selesai untuk lokal; Sepolia dan publikasi perlu keputusan dosen |

Keputusan yang masih menunggu arahan dosen, sesuai bagian 9 panduan: apakah website wajib online,
apakah wajib memakai testnet publik, dan apakah perlu akun email/password. Antarmuka dibangun
sehingga ketiga kemungkinan itu tidak memerlukan perubahan besar: publikasi cukup mengunggah
folder `web`, dan pemindahan ke testnet cukup menjalankan satu skrip deploy karena alamat kontrak
sudah dipilih berdasarkan jaringan wallet.
