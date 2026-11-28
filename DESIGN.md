---
name: DrugTraceability
description: Kartu stok obat pada blockchain
colors:
  ink: "#191919"
  ink-2: "#5d5a52"
  ink-3: "#66635c"
  paper: "#f6f7f6"
  paper-2: "#eef0ee"
  paper-3: "#e6e9e7"
  rule: "#c6cbc7"
  rule-soft: "#dfe3e0"
  moss: "#3a5741"
  moss-hover: "#2d4433"
  moss-soft: "#e8eee7"
  moss-hover: "#2d4433"
  stamp: "#8c2f24"
  stamp-soft: "#f7e9e6"
  ochre: "#7a5309"
  ochre-soft: "#f8efdc"
  sheet: "#ffffff"
  field-line: "#b8b3a1"
  row-hover: "#f7f5ea"
  row-flagged-hover: "#f2ddd8"
  bone: "#efece0"
  bone-2: "#e3dfd0"
  bone-3: "#e9e5d8"
  rail: "#1f2a24"
  rail-ink: "#eef1ec"
  rail-ink-2: "#a2b0a6"
  rail-line: "#465247"
  rail-line-2: "#78857a"
  rail-hover-bg: "#26332c"
  rail-hover-line: "#6f8076"
  rail-dot-idle: "#7f8c81"
  rail-dot-ok: "#79c79a"
  rail-dot-warn: "#d9a44a"
  scroll-thumb: "#bdb8a6"
  scroll-thumb-hover: "#a8a390"
  stamp-hover: "#72241b"
  white: "#ffffff"
  black: "#000000"
typography:
  display:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 1.2rem + 1.6vw, 2.35rem)"
    fontWeight: 660
    lineHeight: 1.12
    letterSpacing: "-0.018em"
  headline:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.2rem, 1.05rem + 0.6vw, 1.42rem)"
    fontWeight: 660
    lineHeight: 1.12
  title:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 660
    lineHeight: 1.2
  body:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 680
    letterSpacing: "0.13em"
  data:
    fontFamily: "Azeret Mono, Cascadia Mono, Consolas, monospace"
    fontSize: "0.86rem"
    fontWeight: 400
    lineHeight: 1.5
  lead:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  note:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  none: "0px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "26px"
  xl: "44px"
components:
  button-primary:
    backgroundColor: "{colors.moss}"
    textColor: "#ffffff"
    rounded: "{rounded.none}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.moss-hover}"
    textColor: "#ffffff"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 18px"
  button-danger:
    backgroundColor: "{colors.stamp}"
    textColor: "#ffffff"
    rounded: "{rounded.none}"
    padding: "10px 18px"
  chip-filter-active:
    backgroundColor: "{colors.moss}"
    textColor: "#ffffff"
    rounded: "{rounded.none}"
    padding: "6px 11px"
  chip-filter-idle:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 11px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "9px 11px"
  status-seal:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.moss}"
    rounded: "{rounded.none}"
    padding: "3px 8px"
  record-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px 16px"
---

# Design System: DrugTraceability

## Overview

**Creative North Star: "Kartu Stok Apotek"**

Sistem ini meniru satu benda yang sudah dikenal siapa pun yang pernah bekerja di gudang atau apotek:
lembar kartu stok. Ia punya kepala berisi identitas barang, badan berisi kolom mutasi masuk dan
keluar dengan saldo pemegang, kaki berisi kolom tanda tangan, dan satu segel tanggal kedaluwarsa
yang ditempel miring di sudut. Seluruh halaman adalah lembar itu, bukan halaman pemasaran.

Karena itu permukaannya adalah kertas terang bersuhu netral sejuk (bukan krem hangat), tinta hampir
hitam, dan satu warna aksen lumut untuk tindakan. Warna tidak dipakai sebagai hiasan: lumut berarti
aman atau dapat dijalankan, stamp merah berarti bahaya atau penarikan, oker berarti menunggu. Angka
selalu memakai huruf monospace dengan lebar digit tetap sehingga kolom angka sejajar baris demi baris,
persis seperti buku besar yang diisi tangan. Tema gelap tidak ada; berkas ini hanya punya mode terang,
sebagaimana dinding gudang tidak berubah gelap.

Sudut seluruh komponen tajam, tanpa pengecualian. Garis pemisah tipis satu piksel berdiri di antara
baris data, dan setiap lembar diapit garis kepala yang lebih tebal. Tidak ada kartu bersudut membulat,
tidak ada gradasi, tidak ada bayangan dekoratif, dan tidak ada hero yang diletakkan di tengah halaman.

**Key Characteristics:**
- Satu arah visual: lembar kartu stok dengan kepala, kolom mutasi, dan kaki tanda tangan.
- Angka tabular monospace sebagai warga kelas satu; NIE, serial, alamat, hash, dan nomor blok selalu sejajar.
- Warna sebagai makna, bukan hiasan: lumut aman, stamp bahaya, oker tunggu.
- Sudut 0px di seluruh komponen, satu skala bentuk.
- Bidang gelap hanya satu: rel tindakan di kepala halaman.

## Colors

Palet kartu stok: kertas netral sejuk, tinta hampir hitam, satu aksen lumut, dan dua warna semantik
yang hanya muncul saat ada artinya.

### Primary
- **Lumut Arsip** (#3a5741): tindakan utama dan semua keadaan aman. Dipakai pada tombol utama, chip
  filter aktif, garis fokus, dan segel status berlaku. Inilah satu-satunya warna yang boleh muncul
  sebagai bidang penuh.

### Tertiary
- **Stamp Penarikan** (#8c2f24): bahaya dan penarikan. Dipakai pada segel recall, kotak peringatan,
  baris batch bermasalah, tombol penarikan, dan pesan kesalahan. Tidak pernah dipakai untuk hiasan.
- **Oker Tunggu** (#7a5309): keadaan peralihan dan peringatan lunak, misalnya batch yang mendekati
  kedaluwarsa atau permintaan yang belum diproses.

### Neutral
- **Kertas Kartu** (#f6f7f6): tanah seluruh halaman.
- **Kertas Kedua** (#eef0ee): panel samping dan baris kepala lembar.
- **Kertas Ketiga** (#e6e9e7): bilah kepala bagian dan jalur bilah masa edar.
- **Tinta Ledger** (#191919): seluruh teks utama dan garis kepala yang tebal.
- **Tinta Sekunder** (#5d5a52): keterangan, label, dan teks pendukung.
- **Tinta Redup** (#66635c): catatan kecil; masih lolos kontras AA di atas ketiga tingkat kertas.
- **Garis Rak** (#c6cbc7) dan **Garis Lembut** (#dfe3e0): pemisah baris dan tepi kotak.
- **Rel Tindakan** (#1f2a24): satu-satunya bidang gelap, dipakai di kepala halaman dengan tinta
  terang (#eef1ec) dan tinta redup (#a2b0a6).

### Named Rules
**The Meaning Rule.** Sebuah warna semantik hanya muncul bila ada keadaannya. Halaman tanpa batch
recall tidak menampilkan satu pun piksel merah.

**The One Dark Field Rule.** Hanya rel tindakan yang boleh berupa bidang gelap. Kartu, tabel, panel
samping, dan dialog seluruhnya terang.

## Typography

**Display Font:** Archivo (dengan Segoe UI, system-ui)
**Body Font:** Archivo (keluarga yang sama; hierarki dibentuk oleh ukuran, bobot, dan pelacakan)
**Label/Mono Font:** Azeret Mono (dengan Cascadia Mono, Consolas)

**Character:** Grotesque sempit yang tenang dan sedikit kaku, dipasangkan dengan monospace bergurat
teknis. Pasangannya membaca sebagai dokumen kerja yang dicetak, bukan sebagai antarmuka produk digital.
Ukuran kecil tidak dipakai di bawah 12px karena halaman ini diproyeksikan di ruang kelas.

### Hierarchy
- **Display** (660, clamp 1.7rem sampai 2.35rem, 1.12, tracking -0.018em): judul halaman dan kepala kartu batch.
- **Headline** (660, clamp 1.2rem sampai 1.42rem, 1.12): judul bagian di dalam lembar.
- **Title** (660, 1.05rem): judul panel samping dan nama batch pada pratinjau.
- **Body** (400, 15px, 1.55, lebar maksimum 68ch): seluruh kalimat penjelas.
- **Label** (680, 0.8rem, tracking 0.13em, huruf besar): kepala kolom, label formulir, dan nama bagian.
- **Data** (400 hingga 600, 0.8rem sampai 0.86rem, lebar digit tetap): NIE, nomor serial, alamat wallet,
  hash, tanggal ringkas, dan nomor blok.

### Named Rules
**The Tabular Rule.** Setiap angka yang dibandingkan antar baris memakai monospace dengan
`font-variant-numeric: tabular-nums`. Angka proporsional dilarang pada tabel dan daftar fakta.

**The No-Smallprint Rule.** Tidak ada teks fungsional di bawah 0.75rem (12px). Huruf mungil yang
hanya bertahan karena terlihat rapi membuat halaman ini tidak terbaca dari baris belakang kelas.

## Layout

Wadah tunggal selebar 1240px dengan padding 28px; pada layar sempit turun ke 16px. Halaman disusun
dari dua model:

- **Model lembar penuh**: kepala halaman, bilah angka, lalu satu atau beberapa lembar bertumpuk
  dengan jarak 22px. Dipakai di Beranda dan Panduan.
- **Model dua kolom**: kolom kerja lebar di kiri, panel pendamping 336px di kanan, dengan celah 26px.
  Dipakai di Ruang Kerja dan Pengajuan Peran. Halaman Periksa Batch memakai varian `.cols.search`
  dengan kolom kiri 372px agar hasil pemeriksaan mendapat lebar penuh.

Irama jarak: 6px di dalam kelompok rapat, 10 sampai 16px antar elemen, 22 sampai 26px antar lembar,
44px antar bagian besar. Selalu lebih banyak ruang di atas judul bagian daripada di bawahnya.

Titik henti: 1080px (dua kolom menumpuk), 900px (navigasi menjadi menu lipat), 760px (presisi lembar
berubah: kaki tanda tangan dan daftar fakta menjadi satu kolom).

## Elevation & Depth

Kedalaman dibentuk oleh garis, bukan oleh bayangan. Seluruh permukaan rata terhadap halaman: tidak
ada `box-shadow` pada kartu, tabel, panel, atau tombol. Yang membuat kedalaman adalah tiga tingkat
kertas, garis kepala 2px di atas setiap lembar, dan garis pemisah 1px antar baris. Satu-satunya
bayangan di sistem ini adalah pada notifikasi dan dialog, karena keduanya memang mengambang di atas
halaman.

### Shadow Vocabulary
- **Notifikasi** (`0 10px 28px rgba(25, 25, 25, 0.13)`): hanya untuk kartu notifikasi di sudut layar.
- **Dialog** (`0 10px 28px rgba(25, 25, 25, 0.13)`): hanya untuk dialog konfirmasi yang menutupi halaman dengan tirai.

### Named Rules
**The Flat Sheet Rule.** Lembar data tidak pernah melayang. Kalau sebuah elemen perlu terlihat
terpisah, tambahkan satu garis atau ubah tingkat kertasnya, jangan tambahkan bayangan.

## Shapes

Satu bahasa bentuk: **sudut 0px di seluruh komponen**, termasuk tombol, kolom isian, pilihan, segel,
notifikasi, dan dialog. Tidak ada pengecualian dan tidak ada skala radius kedua. Ketajaman ini yang
membuat halaman terbaca sebagai dokumen tercetak.

Garis adalah bentuk utama: 1px untuk pemisah baris, 1.5px untuk garis bawah kepala tabel, 2px untuk
garis kepala lembar, dan 3px untuk bilah garis di bawah rel atas. Segel status berbentuk kotak
bergurat 1px; segel tanggal memakai garis 2px dan diputar -1.5derajat, satu-satunya bentuk yang tidak
tegak di seluruh sistem.

## Components

### Buttons
- **Shape:** kotak tajam (0px), garis 1px, huruf besar dengan pelacakan 0.07em, bobot 620.
- **Primary:** latar lumut (#3a5741) dengan teks putih; hover menjadi lumut gelap (#2d4433).
- **Outline:** latar kertas dengan garis tinta; hover membalik menjadi latar tinta dengan teks kertas.
- **Danger:** latar stamp (#8c2f24) dengan teks putih; hanya untuk tindakan yang tidak dapat dibatalkan.
- **Focus:** garis fokus 2px lumut dengan jarak 2px di luar tombol.

### Chips (baris menu dan saringan)
- **Style:** kotak tajam, garis 1px. Keadaan tidak aktif memakai latar kertas dengan garis samar;
  keadaan aktif memakai latar lumut penuh dengan teks putih.
- **State:** dipakai sebagai menu ruang kerja dan saringan daftar; selalu satu yang aktif.

### Cards / Containers
- **Corner Style:** 0px.
- **Background:** Kertas Kartu (#f6f7f6) di atas tanah yang sama; panel samping memakai Kertas Kedua (#eef0ee).
- **Shadow Strategy:** tidak ada; lihat The Flat Sheet Rule.
- **Border:** 1px Garis Rak (#c6cbc7) di semua sisi, ditambah garis atas 2px Tinta Ledger (#191919).
- **Internal Padding:** 20px pada badan, 10px 16px pada kepala lembar.

### Inputs / Fields
- **Style:** latar putih, garis 1px (#b8b3a1), sudut 0px, padding 9px 11px. Kolom isian angka dan
  tanggal memakai monospace.
- **Focus:** garis fokus 2px lumut dengan jarak 1px, plus garis tepi berubah menjadi lumut.
- **Error:** garis tepi menjadi stamp merah ditambah garis dalam 2px stamp di sisi bawah; pesan
  kesalahan muncul di bawah kolom, menggantikan teks petunjuk.

### Navigation
- **Style:** rel gelap (#1f2a24) setinggi 62px, nama produk dalam huruf besar 1rem dengan label
  monospace kecil di sampingnya.
- **Default / hover / active:** tautan memakai tinta redup (#a2b0a6); hover menjadi putih dengan garis
  bawah 2px; halaman aktif memakai tinta terang penuh dengan garis bawah 2px putih.
- **Mobile:** tombol lipat muncul di bawah 900px; menu terbuka menjadi daftar tegak dengan penanda
  garis 2px di sisi kiri untuk halaman aktif.

### Status Seal (signature)
Komponen penanda status: kotak bergurat 1px dengan huruf besar 0.71rem, sebuah titik kecil di dalamnya,
dan warna dari maknanya. Berlakuk memakai lumut, recall memakai stamp, kedaluwarsa memakai oker, belum
terdaftar memakai tinta redup. Status tidak pernah dibedakan oleh warna saja: teksnya selalu menyebut
keadaannya.

### Record Sheet (signature)
Lembar kartu stok: kepala berisi judul dan segel masa berlaku, badan berisi bilah masa edar, daftar
fakta, dan hash Batch ID satu baris, lalu tabel mutasi dengan kolom tanggal, uraian, masuk, keluar,
saldo pemegang, dan nomor blok. Ditutup blok tanda tangan tiga kolom berisi alamat wallet, nama
modifier kontrak, dan jumlah perpindahan.

### Track List (signature)
Daftar jejak berhenti untuk riwayat custody dan langkah kerja: garis tegak 1px di sisi kiri dengan
kotak kecil di setiap titik; titik yang sudah dilalui berisi penuh lumut, yang belum berongga.

## Do's and Don'ts

### Do:
- **Do** pakai monospace dengan lebar digit tetap untuk seluruh angka, alamat, dan hash.
- **Do** bedakan status dengan teks plus warna, jangan warna saja.
- **Do** tampilkan sebab dari setiap penolakan kontrak apa adanya, karena itulah bukti utama bagi penguji.
- **Do** taruh angka yang dibaca dari kontrak sedekat mungkin dengan keterangan sumbernya.
- **Do** pertahankan sudut 0px dan garis 1px sebagai satu-satunya sistem bentuk.

### Don't:
- **Don't** menambahkan sudut membulat, gradasi, atau bayangan pada lembar data.
- **Don't** menampilkan larik angka yang tidak dibaca dari kontrak, termasuk angka contoh sebagai pengganti.
- **Don't** memakai krem hangat, serif, atau aksen ungu: ketiganya membawa halaman ke tampilan template.
- **Don't** memakai warna selain lumut sebagai aksen, atau stamp untuk hal yang bukan bahaya.
- **Don't** menaruh teks fungsional di bawah 12px, sekalipun tampak lebih rapi.
- **Don't** menyembunyikan perbedaan hak akses di balik pesan peringatan saja; menu yang bukan
  kewenangan pengguna tidak dibangun.
