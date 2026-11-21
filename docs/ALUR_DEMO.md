# Alur Demo DrugTraceability (untuk presentasi UAS)

Panduan langkah demi langkah dari nol sampai selesai. Perkirakan waktu 10 sampai 15 menit.
Urutannya sengaja disusun mengikuti alur nyata distribusi obat: pabrik, distributor, apotek, lalu pasien.

---

## Persiapan (sekali saja, sebelum masuk kelas)

Buka **dua terminal** di folder proyek `C:\Users\USER\Projects\DrugTraceabilityWeb`.

**Terminal 1** - node blockchain lokal. Biarkan terbuka selama demo, jangan di-Ctrl+C:

```
npm run node
```

Tunggu sampai muncul tulisan:

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

Terminal ini juga mencetak 20 akun uji beserta **private key**-nya. Biarkan terlihat, nanti dipakai untuk impor ke MetaMask.

**Terminal 2** - siapkan kontrak dan data:

```
npm run deploy:local
npm run seed:local
npm run web
```

Perintah terakhir mencetak alamat `http://127.0.0.1:5173/`.

**Browser** - buka `http://127.0.0.1:5173/`.

**MetaMask** - siapkan jaringan dan akun:

1. Tambah jaringan: nama `Hardhat Local`, RPC `http://127.0.0.1:8545`, Chain ID `31337`, simbol `ETH`.
2. Impor 5 akun memakai private key dari Terminal 1 (akun ke-0 sampai ke-4).
3. Ganti nama tiap akun supaya mudah saat demo: `BPOM`, `Pabrik`, `Distributor`, `Apotek`, `Tanpa Role`.

Setelah semua siap, **lantai dasar data demo** sudah terisi otomatis oleh `npm run seed:local`:

| Kode batch | NIE | Serial | Pemegang sekarang | Status |
|---|---|---|---|---|
| PARA-2026-001 | DKI123456789 | SN-PR-0001 | Apotek | Terdaftar, ada 2 perpindahan |
| PARA-2026-002 | DKI123456789 | SN-PR-0002 | Distributor | Terdaftar, 1 perpindahan |
| AMOX-2026-014 | DKI998877665 | SN-AM-0014 | Distributor | **Status recall** |
| VITA-2026-003 | DKI554433221 | SN-VT-0003 | Pabrik | Terdaftar, belum berpindah |

---

## Bagian 1 - Verifikasi tanpa wallet (pembuka)

**Tujuan:** menunjukkan bahwa pasien bisa memakai sistem tanpa akun apa pun.

1. Dari beranda, klik **Verifikasi kode batch**.
2. Isi NIE `DKI123456789`, kode batch `PARA-2026-001`, serial `SN-PR-0001`.
3. Batch ID muncul otomatis di kolom ketiga. Jelaskan: *"ID ini bukan dibuat website, tapi dihitung smart contract lewat fungsi `computeBatchId()` dengan keccak256."*
4. Klik **Verifikasi batch**.
5. Hasil yang muncul: status **Terdaftar dan berlaku**, sisa masa berlaku, pemegang saat ini (Apotek), dan **Riwayat distribusi** berisi 2 perpindahan (Pabrik ke Distributor, Distributor ke Apotek) lengkap dengan waktu.
6. Klik **Tampilkan QR** untuk menunjukkan tautan verifikasi siap ditempel di kemasan.
7. Ulangi dengan batch **AMOX-2026-014** (NIE `DKI998877665`, serial `SN-AM-0014`) supaya terlihat kotak merah **Status recall** beserta alasannya.
8. Kalau mau menunjukkan bahwa data tidak bisa dipalsukan, tempel Batch ID sembarang yang 64 karakter heksadesimal di tab **Pakai Batch ID**: muncul pesan "Batch tidak ditemukan pada kontrak".

**Poin yang ditekankan:** halaman ini tidak butuh MetaMask, dan semua angka di layar adalah hasil pembacaan langsung dari blockchain.

---

## Bagian 2 - Regulator mendaftarkan aktor baru (pengajuan, bukan pilih sendiri)

**Tujuan:** menunjukkan bahwa role tidak bisa dipilih sendiri pengguna, sesuai aturan pada smart contract.

**Langkah A - calon aktor mengajukan (pakai akun `Tanpa Role`):**

1. Ganti akun MetaMask ke `Tanpa Role`.
2. Buka menu **Pendaftaran Aktor**.
3. Isi nama instansi, pilih role **Pabrik**, tempel alamat wallet akun `Tanpa Role` (atau klik **Pakai wallet yang terhubung**), klik **Simpan pengajuan**.
4. Perhatikan notifikasi: pengajuan tersimpan sebagai catatan, belum masuk blockchain.

**Langkah B - regulator memproses (pakai akun `BPOM`):**

5. Ganti akun MetaMask ke `BPOM`. Buka menu **Dashboard**.
6. Tunjukkan menu yang tersedia hanya untuk regulator: **Recall batch**, **Aktor rantai pasok**, **Permintaan pendaftaran**, **Log aktivitas**.
7. Buka tab **Permintaan pendaftaran**. Baris pengajuan tadi muncul dengan tombol **Salin** dan **Daftarkan**.
8. Klik **Daftarkan**, muncul konfirmasi, lalu setujui di MetaMask.
9. Ketika muncul notifikasi berhasil, status di baris itu berubah menjadi **Terdaftar**.

**Poin yang ditekankan:** kalau pengguna bisa memilih role sendiri, sistem tidak ada artinya. Jadi kontrak hanya mengizinkan regulator memanggil `registerActor()`, dan halaman ini hanya menjembatani pengajuan.

---

## Bagian 3 - Pabrik mendaftarkan batch baru

**Tujuan:** memenuhi fungsi wajib `registerBatch()`.

1. Ganti akun MetaMask ke `Pabrik`. Buka **Dashboard**.
2. Tunjukkan menu berubah: **Batch yang saya daftarkan**, **Registrasi batch**, **Transfer custody**, **Recall batch**, **Aktor rantai pasok**, **Log aktivitas**. Tidak ada lagi menu Permintaan pendaftaran.
3. Buka tab **Registrasi batch**.
4. Isi data berikut (contoh):
   - NIE: `DKI111222333`
   - Kode batch: `PARA-2026-003`
   - Tanggal produksi: hari ini
   - Tanggal kedaluwarsa: dua tahun dari sekarang
   - Nomor serial: `SN-PR-0003`
5. Klik **Hitung Batch ID** supaya terlihat pratinjau ID-nya.
6. Klik **Kirim transaksi registrasi**, lalu setujui di MetaMask.
7. Setelah berhasil, buka tab **Batch yang saya daftarkan**: batch baru muncul di paling atas.

**Kegagalan yang sengaja diperlihatkan (bagian penting penilaian):**

8. Isi tanggal kedaluwarsa **lebih awal** dari tanggal produksi, lalu submit. Formulir menolak sebelum dikirim, dan ada keterangan bahwa kontrak juga akan menolaknya.
9. Coba daftarkan kombinasi yang **sudah ada** (NIE `DKI123456789`, batch `PARA-2026-001`, serial `SN-PR-0001`). Transaksi jalan, tapi ditolak kontrak dengan pesan: *"Batch dengan kombinasi NIE/kode batch/serial ini sudah terdaftar"*.

---

## Bagian 4 - Perpindahan custody (pabrik ke distributor)

**Tujuan:** memenuhi fungsi wajib `transferCustody()`, termasuk penolakannya.

1. Masih sebagai `Pabrik`, buka tab **Transfer custody**.
2. Pilih dari daftar **Pilih dari batch yang Anda kuasai** batch `PARA-2026-003` (yang baru dibuat). Pratinjau batch muncul dan menandai **Anda** sebagai pemegang saat ini.
3. **Perlihatkan penolakan lebih dulu:** isi alamat penerima dengan akun `Tanpa Role`. Muncul peringatan merah bahwa alamat itu belum terdaftar. Klik kirim, transaksi ditolak dengan pesan *"Penerima belum terdaftar sebagai aktor rantai pasok"*.
4. Sekarang isi alamat akun `Distributor`. Keterangan berubah menjadi *"Penerima terdaftar sebagai Distributor"*.
5. Kirim transaksi dan setujui di MetaMask.
6. **Perlihatkan penolakan kedua:** sebagai `Pabrik`, coba kirim batch itu lagi. Ditolak dengan *"Anda bukan pemegang batch saat ini"*. Ini membuktikan aturan kepemilikan berlaku.

**Langkah lanjutan - distributor meneruskan ke apotek:**

7. Ganti akun ke `Distributor`. Buka **Dashboard**.
8. Tunjukkan bahwa batch yang tadi dikirim pabrik **sudah muncul** di daftar "Batch yang sedang Anda pegang", bersama batch lain yang di-seed.
9. Buka tab **Transfer custody**, pilih batch tersebut, isi alamat `Apotek`, kirim dan setujui.

**Poin yang ditekankan:** setiap perpindahan tercatat permanen. Cek tab **Log aktivitas** untuk melihat rangkaian event `BatchCreated`, `CustodyTransferred`, `BatchRecalled` beserta nomor blok dan hash transaksi.

---

## Bagian 5 - Recall dan pembuktian batch recall tidak bisa dipindahkan

**Tujuan:** memenuhi fungsi wajib `flagRecall()` dan aturan pemindahan setelah recall.

1. Ganti akun ke `BPOM`. Buka **Dashboard**, tab **Recall batch**.
2. Tempel Batch ID batch `PARA-2026-003` (salin dari tab Transfer custody / Batch saya, atau ketik ulang dari catatan).
3. Pratinjau muncul, menandai batch valid untuk di-recall.
4. Isi alasan: *"Hasil uji stabilitas tidak memenuhi syarat, batch ditarik dari peredaran"*.
5. Klik **Kirim transaksi recall**, muncul modal konfirmasi peringatan, setujui di MetaMask.
6. **Buktikan efeknya:** ganti akun ke `Distributor` (pemegang batch itu). Buka tab **Transfer custody**, pilih batch tersebut. Pratinjau langsung menampilkan kotak merah *"Batch berstatus recall. Transfer tidak dimungkinkan."* Coba kirim: ditolak dengan *"Batch berstatus recall, tidak dapat dipindahtangankan"*.
7. **Buktikan tidak bisa di-recall dua kali:** sebagai `BPOM`, buka tab Recall batch dan masukkan batch yang sama lagi. Ditolak dengan *"Batch sudah berstatus recall sebelumnya"*.
8. Kembali ke halaman **Verifikasi Obat** sebagai pengunjung, masukkan data batch tersebut. Statusnya sekarang **Status recall** dengan alasannya tampil.

**Poin yang ditekankan:** aturan ini bukan ditegakkan oleh halaman web, melainkan oleh `require()` di dalam smart contract. Memodifikasi berkas HTML tidak bisa melewatinya.

---

## Bagian 6 - Kasus-kasus yang wajib ditunjukkan

| Yang ditunjukkan | Caranya | Hasil yang muncul |
|---|---|---|
| Wallet belum terhubung | Buka Dashboard dengan akun MetaMask yang belum izinkan situs | Layar ajakan menghubungkan wallet, menu tidak tampil |
| Wallet tanpa role | Hubungkan akun `Tanpa Role` | Layar pengajuan pendaftaran aktor, bukan dashboard |
| Jaringan salah | Pindahkan MetaMask ke jaringan lain (misalnya Ethereum Mainnet) | Peringatan jaringan + tombol pindah jaringan, transaksi dinonaktifkan |
| Transaksi dibatalkan | Kirim transaksi apa pun lalu klik Reject di MetaMask | Notifikasi *"Transaksi dibatalkan pada wallet"* |
| Tanggal tidak valid | Registrasi batch dengan kedaluwarsa sebelum produksi | Formulir menolak, kontrak juga akan menolak |
| Pendaftaran ganda | Daftarkan batch dengan kombinasi NIE/batch/serial yang sama | Ditolak kontrak: *"sudah terdaftar"* |
| Transfer batch recall | Lihat bagian 5 langkah 6 | Ditolak kontrak |
| Recall dua kali | Lihat bagian 5 langkah 7 | Ditolak kontrak |
| Tampilan ponsel | Kecilkan jendela browser sampai sempit | Menu berubah jadi tombol lipat, tidak ada gulir horizontal |

---

## Kalau ada yang bermasalah saat demo

| Gejala | Tindakan cepat |
|---|---|
| Dashboard tidak memuat data batch | Pastikan Terminal 1 (`npm run node`) masih hidup, lalu klik **Pindai ulang** |
| Peringatan jaringan tidak dikenal | Klik tombol **Pindah ke jaringan kontrak** |
| Tombol Hubungkan MetaMask tidak bereaksi | Pastikan membuka lewat `http://127.0.0.1:5173/`, bukan klik dua kali berkas HTML |
| Transaksi gagal dengan pesan nonce | MetaMask: Pengaturan, Lanjutan, Clear activity tab data |
| Port 8545 sudah dipakai | Ada node lama yang belum mati: `netstat -ano | findstr :8545` lalu `taskkill /PID <angka> /F` |
| Data kacau, ingin mulai bersih | Tutup Terminal 1 dengan Ctrl+C, jalankan ulang `npm run node`, lalu di Terminal 2 `npm run deploy:local` dan `npm run seed:local` |

---

## Penutup demo

Tiga kalimat yang bisa dipakai untuk menutup:

1. Website ini antarmuka, bukan pengganti aturan. Semua keputusan sah atau tidaknya sebuah transaksi tetap dibuat smart contract di blockchain.
2. Pemisahan hak akses sudah diuji dengan beberapa wallet berbeda, bukan hanya satu akun.
3. Proyek UTS yang tadinya hanya bisa dijalankan lewat Remix IDE sekarang bisa dipakai pengguna lain dengan perannya masing-masing, termasuk pasien yang hanya ingin memverifikasi obat tanpa wallet.
