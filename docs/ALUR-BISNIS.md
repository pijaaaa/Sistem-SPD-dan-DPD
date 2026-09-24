# ALUR BISNIS SPD & DPD (Non-Teknis)

Dokumen ini menjelaskan cara kerja sistem **SPD & DPD** dari sudut pandang pengguna, supaya mudah dipahami oleh admin departemen dan karyawan yang baru memakai sistem.

---

## Istilah Singkat

| Istilah | Arti |
|---|---|
| **SPD** | Surat Perjalanan Dinas — izin resmi bepergian untuk urusan kantor |
| **DPD** | Deklarasi Perjalanan Dinas — pelaporan klaim/biaya setelah perjalanan selesai |
| **Pemohon Utama** | Karyawan yang bertanggung jawab atas perjalanan dinas |
| **Pengikut** | Karyawan lain yang ikut dalam perjalanan yang sama |
| **Approver** | Atasan yang berhak menyetujui/menolak (Team Manager → Manager → General Manager) |

---

## Alur End-to-End

### 1. Login

- Buka aplikasi di browser.
- Masukkan email dan password.
- Setelah masuk, dashboard menampilkan ringkasan sesuai jabatan Anda.

### 2. Membuat SPD (oleh Admin Departemen)

1. Dari menu **SPD**, klik **Buat SPD**.
2. Isi: tujuan, keperluan, tanggal mulai & selesai perjalanan.
3. Pilih karyawan yang ikut. Salah satu ditandai sebagai **pemohon utama**.
4. Sistem otomatis:
   - Membuat nomor surat: `SPD/IT/001/IX/2026` (format: `SPD/KODE_DEPT/NOMOR/BULAN_ROMAWI/TAHUN`)
   - Menentukan apakah perjalanan **lintas departemen** (ada peserta dari dept lain)
   - Membuat rantai persetujuan sesuai jabatan tertinggi peserta

### 3. Approval SPD (oleh Atasan)

- Menu **Approval SPD** menampilkan SPD yang menunggu persetujuan Anda.
- Klik **Detail** untuk melihat rincian.
- **Approve** jika setuju, atau **Reject** dengan menulis alasan.
- Jika **lintas departemen**, tiap peserta punya rantai sendiri — SPD baru disetujui jika SEMUA rantai selesai.
- Jika salah satu di-reject, SPD otomatis ditolak dan masuk histori pemohon (tidak bisa direvisi, buat baru).

> Jika pemohon adalah General Manager, SPD **otomatis disetujui**.

### 4. Delegasi Approval (oleh General Manager)

- Menu **Delegasi** hanya untuk GM.
- GM bisa mendelegasikan wewenang approve ke karyawan lain untuk periode tertentu.
- Selama periode cela aktif, semua approval yang ditujukan ke atasan asli otomatis diarahkan ke delegate. Nota approval menampilkan **"atas nama [delegator]"**.

### 5. Membuat DPD (setelah SPD disetujui)

1. Dari halaman detail SPD yang **approved**, klik **Buat DPD**.
2. DPD hanya bisa dibuat **selama masih dalam batas waktu** setelah SPD selesai (diatur GM di Pengaturan).
3. Isi:
   - **Laporan Kegiatan** (judul, deskripsi, file MoM/notulen — opsional)
   - **Item Nota** (kategori: Transport/Akomodasi/Konsumsi/Lainnya, deskripsi, nominal, tanggal, file nota) — minimal 1 item
4. Sistem menghitung **total nominal** otomatis dari semua item.

### 6. Approval DPD (oleh Atasan)

- Menu **Approval DPD** menampilkan DPD yang menunggu persetujuan.
- Approver melihat detail laporan & rincian nota.
- Jika total nominal per hari melebihi batas yang ditetapkan GM, muncul **peringatan** (tapi tidak menghalangi approve).
- **Approve** atau **Reject** dengan alasan.
- Jika DPD di-reject, tidak bisa direvisi — buat DPD baru.

### 7. Riwayat & Status

- Status SPD: `pending` → `approved` / `rejected`
- Status DPD: `draft` → `approved` / `rejected`
- Pemohon melihat riwayat di menu **SPD & DPD Saya** atau Dashboard.

---

## Aturan Penting

1. **1 SPD = 1 DPD** — satu perjalanan dinas hanya boleh satu deklarasi.
2. **DPD hanya setelah SPD approved.**
3. **Tidak ada revisi** setelah reject — buat ulang dari awal.
4. **Delegasi** berlaku untuk approval SPD maupun DPD.
5. **GM diatur**: batas waktu pengajuan DPD & maksimal nominal per hari (menu Pengaturan).

---

## Pertanyaan Umum

**Q: Kenapa menu Approval kosong?**
Tidak ada approval yang menunggu Anda. Mintalah admin departemen membuat SPD yang melibatkan Anda.

**Q: Kenapa tidak bisa buat DPD?**
Pastikan: SPD sudah approved, belum ada DPD untuk SPD itu, dan masih dalam batas waktu pengajuan.

**Q: Kenapa ada peringatan nominal saat approve DPD?**
Total nominal dibagi jumlah hari perjalanan melebihi batas maksimal yang ditetapkan GM. Anda tetap bisa approve, tapi harap diteliti dulu.

---

*Dokumen ini untuk onboarding pengguna. Untuk teknis (API, deployment) lihat `README.md`.*