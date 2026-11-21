# Pengembangan Proyek UTS Blockchain menjadi Website DrugTraceability

## 1. Latar Belakang

Pada UTS, kelompok telah membuat prototype **DrugTraceability**, yaitu
sistem pelacakan distribusi obat berbasis blockchain. Smart contract
ditulis menggunakan Solidity dan diuji melalui Remix IDE dengan Remix
VM.

Untuk UAS, proyek ini akan dikembangkan menjadi aplikasi berbasis
website agar pengguna lain dapat membuka dan mencoba sistem melalui
antarmuka yang lebih mudah digunakan, tanpa harus berinteraksi langsung
dengan fungsi smart contract melalui Remix IDE.

**Tujuan utama pengembangan:** menghubungkan website dengan smart
contract DrugTraceability yang sudah dibuat, sehingga fitur registrasi
aktor, pencatatan batch obat, perpindahan custody, verifikasi, riwayat
distribusi, dan recall dapat digunakan melalui website.

> Catatan: arahan dosen dipahami sebagai pengembangan prototype menjadi
> aplikasi website yang dapat dicoba pengguna lain. Apakah aplikasi
> wajib dipublikasikan secara online atau cukup didemonstrasikan secara
> lokal masih perlu dikonfirmasi kepada dosen.

------------------------------------------------------------------------

## 2. Kondisi Proyek Saat UTS

### 2.1 Smart Contract

Proyek menggunakan smart contract bernama `DrugTraceability`, ditulis
dalam Solidity.

Fungsi utama yang telah dijelaskan dalam proyek UTS:

  -----------------------------------------------------------------------
  Fungsi                              Kegunaan
  ----------------------------------- -----------------------------------
  `registerActor()`                   Mendaftarkan aktor dan menetapkan
                                      role

  `registerBatch()`                   Mendaftarkan batch obat

  `transferCustody()`                 Mencatat perpindahan tanggung
                                      jawab/kepemilikan batch

  `verifyAuthenticity()`              Memeriksa keberadaan dan status
                                      batch

  `getTransferHistory()`              Mengambil riwayat perpindahan batch

  `flagRecall()`                      Memberikan tanda recall pada batch
                                      obat
  -----------------------------------------------------------------------

### 2.2 Role Pengguna

Sistem memiliki empat role utama:

1.  **Regulator** --- mendaftarkan aktor dan melakukan recall.
2.  **Manufacturer** --- mendaftarkan batch obat.
3.  **Distributor** --- menerima dan meneruskan custody obat.
4.  **Pharmacy** --- menerima custody obat pada tahap distribusi
    berikutnya.

Hak akses setiap role diatur oleh smart contract.

### 2.3 Data Batch

Berdasarkan laporan UTS, informasi batch mencakup:

-   NIE
-   Kode batch
-   Tanggal produksi
-   Tanggal kedaluwarsa
-   Nomor serial
-   Manufacturer
-   Pemegang saat ini (`currentHolder`)
-   Status recall
-   Alasan recall
-   Status keberadaan batch

Riwayat perpindahan (`TransferRecord`) mencatat alamat pengirim, alamat
penerima, dan waktu transaksi.

### 2.4 Keterbatasan Prototype UTS

-   Smart contract diuji menggunakan Remix VM, bukan jaringan blockchain
    produksi.
-   Interaksi dilakukan melalui Remix IDE, belum melalui website khusus.
-   Belum terintegrasi langsung dengan sistem BPOM.
-   Belum terintegrasi dengan QR code atau 2D barcode.

Laporan UTS menyarankan pengembangan antarmuka aplikasi agar proses
registrasi, perpindahan, verifikasi, dan recall dapat dilakukan lebih
mudah oleh pihak yang terlibat dalam rantai distribusi obat.

------------------------------------------------------------------------

## 3. Gambaran Aplikasi UAS

Aplikasi yang akan dikembangkan bernama **DrugTraceability**.

Website bukan hanya landing page atau halaman informasi. Website harus
menjadi antarmuka yang benar-benar berinteraksi dengan smart contract.

Gambaran alur penggunaan:

1.  Pengguna membuka website.
2.  Pengguna menghubungkan wallet blockchain, misalnya MetaMask.
3.  Website memeriksa alamat wallet dan role yang dimiliki.
4.  Pengguna diarahkan ke dashboard sesuai role.
5.  Pengguna menjalankan fitur yang diizinkan oleh smart contract.
6.  Transaksi diproses melalui wallet dan dicatat pada blockchain.
7.  Pengguna dapat melihat hasil transaksi dan informasi batch.

### 3.1 Alur Sistem

``` text
Pengguna membuka website
          |
          v
Menghubungkan wallet (MetaMask)
          |
          v
Website memeriksa alamat dan role
          |
          v
Dashboard sesuai role
          |
          v
Pengguna menjalankan fitur
          |
          v
Website memanggil smart contract
          |
          v
Wallet meminta konfirmasi transaksi
          |
          v
Transaksi diproses oleh blockchain
          |
          v
Website menampilkan hasil transaksi
```

### 3.2 Dashboard Berdasarkan Role

**Regulator** - Melihat ringkasan sistem. - Mendaftarkan Manufacturer. -
Mendaftarkan Distributor. - Mendaftarkan Pharmacy. - Melakukan recall
terhadap batch.

**Manufacturer** - Melihat batch yang didaftarkan. - Mendaftarkan batch
obat baru. - Melakukan transfer custody sesuai aturan smart contract. -
Melihat informasi batch.

**Distributor** - Melihat batch yang sedang menjadi tanggung jawabnya. -
Menerima atau meneruskan custody batch. - Melihat riwayat perpindahan.

**Pharmacy** - Melihat batch yang diterima. - Memeriksa informasi dan
status batch. - Melihat riwayat distribusi.

**Pengunjung umum/pasien** - Membuka halaman verifikasi tanpa harus
memiliki role operasional. - Memasukkan Batch ID atau identitas batch. -
Melihat informasi batch, status recall, dan riwayat distribusi sesuai
data yang dapat dibaca dari smart contract.

Ketersediaan dan detail akses setiap fitur harus mengikuti fungsi dan
aturan yang benar-benar tersedia di smart contract.

------------------------------------------------------------------------

## 4. Contoh Skenario Penggunaan

### 4.1 Regulator Mendaftarkan Aktor

1.  Regulator membuka website dan menghubungkan wallet yang memiliki hak
    Regulator.
2.  Regulator membuka menu manajemen aktor.
3.  Regulator memasukkan alamat wallet pengguna dan role yang akan
    diberikan.
4.  Regulator mengirim transaksi.
5.  Website memanggil `registerActor()`.
6.  Setelah transaksi berhasil, pengguna tersebut dapat menggunakan
    fitur sesuai role yang diberikan.

### 4.2 Manufacturer Mendaftarkan Batch Obat

1.  Manufacturer menghubungkan wallet yang sudah terdaftar.
2.  Manufacturer membuka menu registrasi batch.
3.  Manufacturer mengisi data yang diminta smart contract, misalnya NIE,
    kode batch, tanggal produksi, tanggal kedaluwarsa, dan nomor serial.
4.  Manufacturer menekan tombol submit.
5.  Website memanggil `registerBatch()`.
6.  Pengguna mengonfirmasi transaksi melalui wallet.
7.  Website menampilkan status transaksi dan informasi batch setelah
    transaksi berhasil.

### 4.3 Distributor Memindahkan Custody

1.  Distributor menghubungkan wallet.
2.  Distributor membuka menu transfer batch.
3.  Distributor memilih atau memasukkan identitas batch.
4.  Distributor memasukkan alamat wallet penerima.
5.  Website memanggil `transferCustody()`.
6.  Pengguna mengonfirmasi transaksi melalui wallet.
7.  Website menampilkan hasil transaksi dan perubahan pemegang batch.

### 4.4 Pengunjung Memverifikasi Obat

1.  Pengunjung membuka halaman verifikasi.
2.  Pengunjung memasukkan Batch ID atau identitas batch.
3.  Website memanggil fungsi pembacaan data seperti
    `verifyAuthenticity()`.
4.  Website menampilkan informasi batch dan statusnya.
5.  Jika tersedia, website juga menampilkan riwayat dari
    `getTransferHistory()`.

### 4.5 Regulator Melakukan Recall

1.  Regulator membuka menu recall.
2.  Regulator memasukkan identitas batch dan alasan recall.
3.  Website memanggil `flagRecall()`.
4.  Regulator mengonfirmasi transaksi.
5.  Website menampilkan status recall setelah transaksi berhasil.
6.  Batch yang sudah recall harus tetap mengikuti pembatasan transfer
    yang telah diterapkan dalam smart contract.

------------------------------------------------------------------------

## 5. Aturan Registrasi dan Hak Akses yang Perlu Diperhatikan

Berdasarkan implementasi UTS yang telah dijelaskan, `registerActor()`
hanya dapat dijalankan oleh Regulator.

Karena itu, alur yang sesuai dengan smart contract saat ini adalah:

1.  Pengguna menghubungkan wallet.
2.  Pengguna mengajukan permintaan pendaftaran kepada pihak Regulator
    melalui mekanisme yang disediakan website.
3.  Regulator memeriksa permintaan.
4.  Regulator menjalankan `registerActor()` untuk mendaftarkan alamat
    wallet dan memberikan role.
5.  Pengguna memperoleh akses sesuai role.

**Jangan membuat fitur yang memungkinkan pengguna langsung memilih role
istimewa untuk dirinya sendiri**, kecuali smart contract memang diubah
dan aturan keamanannya dirancang ulang.

Wallet MetaMask berfungsi sebagai identitas alamat blockchain dan sarana
menandatangani transaksi. Wallet bukan otomatis akun email/password.
Jika ingin menambahkan sistem akun biasa, rancang hal tersebut sebagai
fitur terpisah dan jangan sampai menggantikan pemeriksaan hak akses di
smart contract.

------------------------------------------------------------------------

## 6. Rekomendasi Teknologi

Berikut teknologi yang dapat dipertimbangkan untuk membangun website:

  Teknologi          Peran
  ------------------ ------------------------------------------------
  React.js           Membangun antarmuka website
  Solidity           Smart contract yang mengatur aturan sistem
  MetaMask           Menghubungkan wallet pengguna
  Ethers.js          Menghubungkan aplikasi React dengan blockchain
  Ethereum Testnet   Lingkungan pengujian blockchain bersama

Teknologi tersebut merupakan rekomendasi implementasi, bukan ketentuan
yang sudah dipastikan oleh dosen.

### 6.1 Arsitektur Sederhana

``` text
React Frontend
      |
      | Ethers.js
      v
MetaMask Wallet
      |
      | Signed transaction / read request
      v
Ethereum Testnet
      |
      v
DrugTraceability Smart Contract
      |
      v
Data batch, role, custody, recall, transfer history
```

### 6.2 Hal yang Perlu Disiapkan

-   File Solidity proyek UTS beserta seluruh dependensinya.
-   ABI smart contract hasil kompilasi.
-   Alamat kontrak setelah deployment.
-   Jaringan blockchain yang dipilih.
-   Wallet untuk deployment dan pengujian.
-   ETH testnet untuk biaya transaksi pengujian jika menggunakan testnet
    publik.
-   Konfigurasi frontend untuk terhubung ke jaringan dan kontrak yang
    benar.

Jangan menganggap alamat kontrak atau ABI dari Remix VM otomatis berlaku
di jaringan lain. Jika berpindah jaringan, kontrak perlu di-deploy pada
jaringan tujuan dan frontend harus menggunakan alamat kontrak serta ABI
yang sesuai.

------------------------------------------------------------------------

## 7. Target Fitur Website

### 7.1 Fitur Prioritas Utama

  -----------------------------------------------------------------------
  Prioritas               Fitur                   Keterangan
  ----------------------- ----------------------- -----------------------
  Wajib                   Landing page            Menjelaskan
                                                  DrugTraceability

  Wajib                   Connect Wallet          Menghubungkan wallet
                                                  pengguna

  Wajib                   Pemeriksaan role        Menentukan hak akses
                                                  berdasarkan smart
                                                  contract

  Wajib                   Dashboard role          Menampilkan fitur
                                                  sesuai role

  Wajib                   Registrasi aktor        Regulator mendaftarkan
                                                  aktor

  Wajib                   Registrasi batch        Manufacturer
                                                  mendaftarkan batch

  Wajib                   Transfer custody        Memindahkan custody
                                                  batch

  Wajib                   Verifikasi batch        Memeriksa
                                                  keaslian/keberadaan dan
                                                  status batch

  Wajib                   Riwayat distribusi      Menampilkan perjalanan
                                                  batch

  Wajib                   Recall                  Regulator menandai
                                                  batch bermasalah
  -----------------------------------------------------------------------

### 7.2 Fitur Tambahan

-   QR code untuk mempermudah akses halaman verifikasi.
-   Dashboard statistik jumlah batch dan distribusi.
-   Riwayat transaksi dengan tautan ke block explorer jika jaringan yang
    digunakan mendukungnya.
-   Halaman permintaan pendaftaran aktor.
-   Filter dan pencarian batch.

Fitur tambahan dikerjakan setelah fitur utama berjalan dengan benar.

------------------------------------------------------------------------

## 8. Kriteria Keberhasilan

Website dapat dianggap memenuhi tujuan dasar pengembangan jika:

-   Pengguna dapat membuka website.
-   Pengguna dapat menghubungkan wallet.
-   Website dapat mendeteksi jaringan dan alamat wallet.
-   Website dapat membedakan akses berdasarkan role yang tersimpan di
    smart contract.
-   Regulator dapat mendaftarkan aktor.
-   Manufacturer dapat mendaftarkan batch.
-   Perpindahan custody dapat dilakukan sesuai aturan smart contract.
-   Pengunjung dapat memverifikasi batch.
-   Riwayat perpindahan dapat ditampilkan.
-   Regulator dapat melakukan recall.
-   Batch yang sudah recall tidak dapat ditransfer jika aturan tersebut
    memang diterapkan oleh smart contract.
-   Website menampilkan status transaksi, termasuk ketika transaksi
    gagal atau dibatalkan.

Pengujian harus dilakukan menggunakan lebih dari satu wallet agar
skenario beberapa pengguna benar-benar terbukti, bukan hanya menggunakan
satu akun.

------------------------------------------------------------------------

## 9. Hal yang Belum Dipastikan dan Perlu Dikonfirmasi

Sebelum implementasi, pastikan beberapa hal berikut:

1.  Apakah dosen mewajibkan website dapat diakses secara online melalui
    link, atau cukup dijalankan secara lokal?
2.  Apakah dosen mengharuskan penggunaan blockchain testnet publik, atau
    Remix VM masih diperbolehkan?
3.  Apakah setiap pengguna wajib menghubungkan MetaMask?
4.  Apakah dosen mengharapkan fitur pendaftaran akun biasa, atau cukup
    pendaftaran alamat wallet oleh Regulator?
5.  Apakah semua fitur UTS wajib dipindahkan ke website atau ada fitur
    tertentu yang menjadi fokus penilaian?

Jangan menganggap jawaban atas pertanyaan tersebut sudah diketahui
sebelum mendapat arahan dosen.

------------------------------------------------------------------------

# 10. Instruksi untuk AI Agent

Gunakan dokumen ini sebagai gambaran kebutuhan dan arah pengembangan
proyek UAS DrugTraceability.

## Tugas AI Agent

Bantu mengembangkan proyek UTS DrugTraceability menjadi aplikasi website
yang benar-benar terhubung dengan smart contract Solidity yang telah
dibuat.

### Aturan kerja

1.  **Periksa kode proyek terlebih dahulu.** Jangan langsung membuat
    ulang proyek atau mengganti teknologi tanpa memeriksa file yang
    tersedia.
2.  Identifikasi seluruh file Solidity, struktur data, fungsi, modifier,
    event, dan aturan access control.
3.  Pastikan nama fungsi dan parameter yang dipanggil frontend sesuai
    dengan implementasi smart contract aktual.
4.  Pertahankan logika bisnis dan keamanan smart contract yang sudah
    benar.
5.  Jangan mengarang fungsi atau field yang belum tersedia.
6.  Jika menemukan kekurangan pada smart contract, jelaskan terlebih
    dahulu dan usulkan perubahan sebelum menerapkannya.
7.  Bangun antarmuka yang rapi, modern, responsif, dan mudah digunakan.
8.  Pisahkan komponen berdasarkan halaman dan role agar kode mudah
    dipelihara.
9.  Hubungkan frontend dengan wallet dan smart contract menggunakan
    library yang sesuai.
10. Tampilkan loading, keberhasilan, kegagalan, dan status transaksi
    secara jelas.
11. Pastikan pengguna tidak dapat menjalankan fungsi yang tidak
    diizinkan oleh smart contract.
12. Jangan menampilkan data dummy seolah-olah merupakan data blockchain
    sungguhan.
13. Jangan menyimpan private key atau seed phrase pengguna di dalam
    source code maupun frontend.
14. Kerjakan secara bertahap dan uji setiap fitur sebelum melanjutkan ke
    fitur berikutnya.
15. Jangan menghapus atau menimpa file proyek yang sudah ada tanpa
    alasan dan persetujuan.

### Tahapan pengerjaan yang disarankan

**Tahap 1 --- Audit proyek** - Baca seluruh file smart contract. -
Identifikasi fungsi, parameter, return value, event, dan modifier. -
Periksa dependensi dan versi Solidity. - Buat ringkasan arsitektur yang
sudah ada. - Identifikasi apa yang perlu disiapkan untuk integrasi
frontend.

**Tahap 2 --- Perencanaan** - Tentukan struktur halaman. - Tentukan
navigasi dan dashboard setiap role. - Buat rancangan alur pengguna. -
Tentukan cara deployment dan jaringan blockchain berdasarkan kebutuhan
yang sudah dikonfirmasi.

**Tahap 3 --- Pembangunan frontend** - Buat landing page. - Buat koneksi
wallet. - Buat pemeriksaan jaringan dan role. - Buat dashboard
Regulator, Manufacturer, Distributor, dan Pharmacy. - Buat halaman
verifikasi publik.

**Tahap 4 --- Integrasi smart contract** - Hubungkan ABI dan alamat
kontrak. - Implementasikan pemanggilan fungsi baca dan transaksi. -
Implementasikan penanganan error. - Pastikan transaksi meminta
konfirmasi wallet. - Tampilkan hasil transaksi yang benar-benar berasal
dari blockchain.

**Tahap 5 --- Pengujian** - Uji menggunakan beberapa wallet. - Uji akses
berdasarkan role. - Uji registrasi aktor. - Uji registrasi batch. - Uji
transfer yang valid dan tidak valid. - Uji verifikasi dan riwayat. - Uji
recall. - Uji bahwa batch recall tidak dapat ditransfer. - Uji kondisi
wallet tidak terhubung, jaringan salah, transaksi gagal, dan transaksi
dibatalkan.

**Tahap 6 --- Deployment dan dokumentasi** - Siapkan konfigurasi
deployment. - Publikasikan website jika memang diwajibkan. -
Dokumentasikan cara menghubungkan wallet dan mencoba setiap role. - Buat
panduan pengujian untuk dosen dan pengguna lain.

### Instruksi pertama yang harus dikerjakan AI Agent

**Jangan langsung coding. Mulailah dengan mengaudit seluruh file proyek
yang tersedia.**

Berikan hasil audit dalam format:

1.  Struktur folder dan file penting.
2.  Fungsi smart contract yang tersedia.
3.  Role dan hak akses masing-masing.
4.  Data yang disimpan pada blockchain.
5.  Event yang tersedia (jika ada).
6.  Dependensi dan konfigurasi proyek.
7.  Kebutuhan integrasi frontend.
8.  Potensi masalah atau kekurangan yang ditemukan.
9.  Rekomendasi tahapan implementasi.

Setelah audit selesai, tunggu persetujuan sebelum melakukan perubahan
besar pada proyek.

------------------------------------------------------------------------

## Penutup

Fokus utama UAS adalah mengembangkan prototype DrugTraceability dari
sistem yang sebelumnya diuji melalui Remix IDE menjadi aplikasi website
yang dapat digunakan oleh beberapa pengguna dengan role berbeda.

Website harus menjadi antarmuka yang memudahkan pengguna menjalankan
smart contract, sedangkan aturan utama sistem tetap dijalankan dan
diamankan oleh blockchain.
