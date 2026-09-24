# Roadmap & Prompt OpenCode — Sistem SPD & DPD

**Stack:** Laravel 11 (API + Sanctum) + React JS (SPA) + MySQL (Laragon)
**Pendekatan kerja:** Full-stack developer dibantu AI (opencode CLI), dikerjakan bertahap per milestone.

---

## 0. Ringkasan Keputusan Bisnis (acuan tetap)

Simpan bagian ini sebagai referensi — semua prompt di bawah merujuk ke sini.

| Area | Keputusan |
|---|---|
| Hierarki approval | Role tetap: User → Team Manager → Manager → General Manager, disimpan di tabel `role_hierarchy` (bukan hardcode) |
| GM mengajukan dinas | Auto-approved (SPD & DPD) — tahap awal |
| SPD 1 departemen | 1 rantai approval, mengikuti **level pengikut tertinggi** |
| SPD lintas departemen | Approval **dipecah per karyawan**, tiap pengikut mengikuti rantai atasannya sendiri. SPD approved kalau semua rantai selesai |
| Reject SPD/DPD | Masuk histori pemohon berstatus `rejected` dengan `rejection_reason`. Revisi = ajukan baru dari awal |
| Delegasi approval | Berbasis periode waktu. Selama periode, semua approval yang masuk ke atasan otomatis diarahkan ke delegate. Yang mengatur: **General Manager** |
| Auto-numbering SPD | Format `SPD/{DEPT_CODE}/{URUTAN}/{BULAN_ROMAWI}/{TAHUN}`, reset tiap tahun, kode dept dari **departemen pemohon utama** |
| Budget | SPD tanpa budget diajukan di awal. DPD punya kategori pengeluaran + nominal per item |
| Validasi DPD | Total nominal DPD divalidasi terhadap jumlah hari dinas di SPD |
| Batas waktu pengajuan DPD | Dapat diatur (konfigurasi) oleh role approver tertinggi dari perjalanan dinas (GM) |
| Notifikasi | Belum dibutuhkan (skip dulu) |
| Dashboard | Dibutuhkan |
| Hak akses SPD | Admin departemen bisa membuat SPD lintas departemen (dinas gabungan) |
| Master data | Dikelola oleh Super Admin |
| Log approval | Tabel `approval_logs` generik untuk SPD & DPD (polymorphic) |
| Auth | Laravel Sanctum (SPA React terpisah dari Laravel API) |
| Reusable component | Frontend dibangun dari komponen generik (DataTable, Modal, FormField, Button, StatusBadge, ConfirmDialog) yang dipakai ulang di semua modul, bukan komponen sekali-pakai per halaman |
| Caching | Backend: cache master data & dashboard aggregate pakai Laravel Cache (file/database driver dulu), invalidasi otomatis saat data berubah. Frontend: pakai TanStack Query (React Query) untuk semua data-fetching agar otomatis caching + revalidation |

---

## 1. Skema Database (acuan)

Gunakan ini sebagai dasar migration Laravel. Sesuaikan detail tipe data saat implementasi.

```
roles
- id, name (super_admin, admin_departemen, user, team_manager, manager, general_manager)
- level (integer, urutan hierarki, makin besar makin tinggi)

role_hierarchy
- id, role_id (FK), next_approver_role_id (FK, nullable jika top level)
  -> mendefinisikan role apa yang meng-approve role tertentu

departments
- id, name, code (untuk numbering, misal "HRD", "FIN")

employees
- id, user_id (FK ke users/auth), nip, name, email, phone
- department_id (FK)
- role_id (FK)
- supervisor_id (FK ke employees, self-reference, nullable)
- is_active (boolean)

users (Laravel default + Sanctum)
- id, email, password, dst

spd (surat_perjalanan_dinas)
- id, nomor_surat (unique, hasil auto-numbering)
- requester_id (FK employees, admin pembuat)
- main_department_id (FK departments, departemen pemohon utama)
- destination, purpose, start_date, end_date
- status (enum: pending, approved, rejected)
- is_cross_department (boolean)
- created_at, updated_at

spd_employees (pivot: karyawan yang ikut dalam 1 SPD)
- id, spd_id (FK), employee_id (FK)
- status_role_in_spd (pemohon_utama / pengikut)
- approval_status (pending, approved, rejected) -- khusus utk kasus lintas departemen (approval per-karyawan)
- rejection_reason (nullable)

spd_approval_chain (rantai approval yang harus dilalui, generated saat SPD dibuat)
- id, spd_id (FK), spd_employee_id (FK, nullable jika approval gabungan/1 rantai)
- approver_employee_id (FK employees)
- level_order (1 = Team Manager, 2 = Manager, dst)
- status (pending, approved, rejected)
- acted_at (nullable)

approval_logs (polymorphic, dipakai SPD & DPD)
- id
- approvable_type (Spd::class / Dpd::class)
- approvable_id
- spd_employee_id (nullable, untuk kasus approval per-karyawan)
- approver_employee_id (FK employees)
- role_at_approval (snapshot nama role saat approve)
- action (approved / rejected / delegated_approved / delegated_rejected)
- rejection_reason (nullable)
- acted_on_behalf_of (FK employees, nullable — diisi jika ini delegasi)
- level_order
- notes (nullable)
- created_at

delegations
- id, delegator_id (FK employees, harus role GM atau atasan terkait)
- delegate_id (FK employees)
- start_date, end_date
- created_by (FK employees, harus GM)
- is_active (boolean)

dpd (deklarasi_perjalanan_dinas)
- id, spd_id (FK, harus berstatus approved)
- nomor_dpd (auto numbering, format serupa SPD)
- created_by (FK employees)
- deadline_config_days (nullable, override dari config global jika ada)
- status (pending, approved, rejected)
- total_nominal (computed/cache)
- created_at, updated_at

dpd_reports (dokumentasi kegiatan/MoM/notulen)
- id, dpd_id (FK), title, description, file_path, created_at

dpd_expense_categories (master kategori pengeluaran, dikelola super admin)
- id, name (transport, akomodasi, konsumsi, lain-lain)

dpd_expenses (item nota/reimbursement)
- id, dpd_id (FK), category_id (FK dpd_expense_categories)
- description, nominal, expense_date, file_path (foto/scan nota)
- created_at

dpd_approval_chain (sama pola dengan spd_approval_chain)
- id, dpd_id (FK), approver_employee_id (FK), level_order, status, acted_at

app_settings (config global, diatur GM)
- id, key (dpd_submission_deadline_days), value
```

**Catatan desain:**
- `spd_approval_chain` dan `dpd_approval_chain` di-generate otomatis via Observer/Service saat SPD/DPD dibuat, berdasarkan `role_hierarchy` + `supervisor_id` masing-masing karyawan.
- Untuk SPD 1 departemen: 1 chain saja (level tertinggi pengikut menentukan sampai level mana chain dibuat), `spd_employee_id` di `spd_approval_chain` diisi `null` (berlaku untuk semua pengikut).
- Untuk SPD lintas departemen: chain dibuat per `spd_employee_id`, SPD keseluruhan baru `approved` jika semua chain per karyawan selesai.

---

## 2. Struktur Milestone

| # | Milestone | Fokus |
|---|---|---|
| M0 | Setup Environment & Project Skeleton | Laragon, Laravel 11, React, koneksi dasar |
| M1 | Master Data | Roles, Role Hierarchy, Departments, Employees (CRUD + relasi) |
| M2 | Auth & Otorisasi | Sanctum, login, middleware role-based |
| M3 | Modul SPD — Core | Form SPD, multi-pengikut, auto-numbering |
| M4 | Modul SPD — Approval Engine | Generate chain, approve/reject, log, kasus lintas departemen |
| M5 | Delegasi Approval | CRUD delegasi oleh GM, redirect approval otomatis |
| M6 | Modul DPD — Core | Form DPD, laporan kegiatan, item nota/expense |
| M7 | Modul DPD — Approval Engine | Reuse approval engine dari SPD, validasi nominal vs hari dinas |
| M8 | Dashboard | Dashboard admin, karyawan, approver |
| M9 | Pengaturan Sistem | Config deadline DPD oleh GM |
| M10 | Polish, Testing, Deployment prep | Testing, seed data, dokumentasi |

Kerjakan berurutan. Jangan lompat ke M3 sebelum M1-M2 solid, karena semua modul bergantung pada data master & auth.

---

## 3. Prompt OpenCode per Milestone

Jalankan `opencode` di root project pada VS Code, lalu paste prompt di bawah satu per satu (per milestone). Prompt ini ditulis agar opencode paham konteks penuh proyek tanpa anda perlu menjelaskan ulang.

### M0 — Setup Environment & Project Skeleton

```
Saya membangun sistem "SPD & DPD" (Surat Perjalanan Dinas & Deklarasi Perjalanan Dinas)
untuk kebutuhan korporat. Stack: Laravel 11 (REST API only, tanpa Blade) + React JS (SPA
terpisah, Vite) + MySQL (dijalankan via Laragon di local). Auth pakai Laravel Sanctum
(SPA authentication, bukan token API biasa).

Tolong bantu saya:
1. Buat project Laravel 11 baru di folder "backend" dengan konfigurasi API-only
   (php artisan install:api jika tersedia di Laravel 11, aktifkan Sanctum).
2. Konfigurasi .env untuk koneksi ke MySQL Laragon (host 127.0.0.1, port 3306,
   database "spd_dpd_db", user "root", password kosong — default Laragon).
3. Setup CORS agar bisa diakses dari React dev server (biasanya localhost:5173).
4. Buat project React baru di folder "frontend" menggunakan Vite (template react),
   install axios, react-router-dom, dan siapkan struktur folder dasar:
   src/pages, src/components, src/services (untuk axios instance), src/context (auth context).
5. Buat axios instance di frontend yang sudah dikonfigurasi withCredentials:true
   untuk kebutuhan Sanctum SPA auth, base URL mengarah ke backend Laravel.
6. Jelaskan juga langkah manual yang perlu saya lakukan di Laragon (membuat database
   lewat HeidiSQL/phpMyAdmin bawaan Laragon, memastikan Apache/Nginx virtual host
   jika diperlukan, atau cukup pakai `php artisan serve` untuk backend + `npm run dev`
   untuk frontend tanpa perlu virtual host Laragon).
7. Buat README.md ringkas di root berisi cara menjalankan project ini (backend & frontend).

Jangan buat fitur bisnis apapun dulu di tahap ini — murni skeleton & koneksi dasar
yang bisa saya jalankan dan pastikan backend-frontend-database sudah terhubung.
```

---

### M1 — Master Data (Roles, Role Hierarchy, Departments, Employees)

```
Lanjutan dari project SPD & DPD (Laravel 11 API + React SPA + MySQL) yang sudah
di-setup sebelumnya. Sekarang buatkan modul Master Data.

PENTING — fondasi frontend & performa yang harus ditanamkan MULAI dari milestone
ini (bukan nanti-nanti), karena seluruh modul berikutnya akan memakainya:

A. Reusable component. Sebelum membuat halaman CRUD Departments & Employees,
   buatkan dulu set komponen generik di src/components/common (atau folder serupa),
   minimal:
   - DataTable: menerima props kolom, data, loading state, pagination, dan slot
     untuk action buttons per baris. Dipakai ulang nanti untuk semua list
     (Employees, SPD, DPD, dst) — jangan buat tabel custom per halaman.
   - Modal: generik untuk form create/edit maupun konfirmasi.
   - FormField: wrapper input/select/date/textarea dengan label & pesan error
     yang konsisten (integrasi dengan react-hook-form jika dipakai, atau state
     form biasa — pilih salah satu pendekatan dan pakai konsisten ke depannya).
   - Button, StatusBadge (untuk status pending/approved/rejected dengan warna
     konsisten, akan dipakai lagi di SPD/DPD), ConfirmDialog (untuk konfirmasi
     approve/reject/delete).
   Halaman CRUD Departments & Employees di milestone ini WAJIB dibangun
   menggunakan komponen-komponen di atas, bukan markup custom, sebagai contoh
   pola yang akan diikuti modul-modul berikutnya.

B. Caching untuk performa loading data:
   - Frontend: install & konfigurasi TanStack Query (React Query). Buat
     QueryClientProvider di root App, dan gunakan useQuery/useMutation untuk
     semua pemanggilan API mulai dari modul ini (list Departments, list
     Employees) — jangan pakai useEffect+useState manual untuk fetch data.
     Set staleTime yang wajar untuk data master (data master jarang berubah,
     staleTime bisa lebih lama, misal 5 menit) supaya tidak fetch ulang terus-
     menerus saat pindah halaman.
   - Backend: cache response endpoint index Roles, RoleHierarchy, dan Departments
     (data yang jarang berubah) menggunakan Laravel Cache facade. Buat cache
     key yang jelas, dan pastikan cache di-invalidate (Cache::forget) otomatis
     via Model Observer setiap kali data terkait di-create/update/delete, supaya
     data tidak basi. Endpoint Employees tidak perlu dicache dulu (lebih sering
     berubah), tapi siapkan strukturnya agar mudah ditambahkan cache nanti kalau
     data karyawan sudah banyak.

Konteks bisnis modul Master Data:

Konteks bisnis penting:
- Ada 5 role: super_admin, admin_departemen, user, team_manager, manager, general_manager
  (6 role sebenarnya, tolong sesuaikan). Role punya "level" (angka urutan hierarki,
  makin besar makin tinggi jabatannya).
- Tabel role_hierarchy mendefinisikan role apa yang meng-approve role tertentu
  (misal: user -> team_manager -> manager -> general_manager). Ini HARUS dinamis
  dari database, tidak boleh hardcode di kode aplikasi, karena ke depan hierarki
  bisa berubah/bertambah levelnya.
- Setiap employee (karyawan) punya supervisor_id (self-reference ke tabel employees
  sendiri) untuk merepresentasikan struktur organisasi riil, PLUS role_id untuk
  menentukan levelnya secara umum.
- Employee terhubung ke satu department dan satu user (akun login).
- Semua master data (roles, role_hierarchy, departments, employees) HANYA bisa
  dikelola (create/update/delete) oleh role super_admin.

Tolong buatkan:
1. Migration untuk tabel: roles, role_hierarchy, departments, employees
   (relasi sesuai konteks di atas, termasuk foreign key & index yang wajar).
2. Model Eloquent lengkap dengan relasi (Role hasMany Employee, Employee belongsTo
   supervisor via self-reference, Department hasMany Employee, dst). Tambahkan
   relasi RoleHierarchy yang menunjuk ke "next approver role".
3. Seeder untuk data awal: 6 role di atas dengan level 1-6, dan role_hierarchy
   yang merepresentasikan alur user->team_manager->manager->general_manager
   (general_manager tidak punya next approver / auto-approved).
4. API Resource Controller (CRUD) untuk Departments dan Employees, dengan validasi
   Form Request yang proper. Endpoint roles & role_hierarchy cukup index (read-only
   dulu, karena jarang berubah, tapi tetap sediakan struktur CRUD-nya untuk masa depan).
5. Routing API di routes/api.php, dikelompokkan dengan prefix /api/master,
   dan siapkan middleware placeholder "role:super_admin" (implementasinya nanti
   di milestone Auth, tapi terapkan strukturnya sekarang biar tidak perlu refactor).
6. Di frontend React: buatkan halaman CRUD sederhana (tabel + modal form) untuk
   Departments dan Employees, memanggil API di atas via axios service yang sudah ada.
   Termasuk dropdown untuk memilih supervisor & department saat create/edit employee.

Ikuti best practice Laravel (Form Request untuk validasi, API Resource untuk response
JSON yang konsisten, gunakan Service class jika logic mulai kompleks).
```

---

### M2 — Auth & Otorisasi

```
Lanjutan project SPD & DPD. Sekarang implementasikan authentication & authorization
menggunakan Laravel Sanctum (SPA authentication mode, bukan token/Bearer biasa,
karena frontend React berjalan sebagai SPA terpisah dengan cookie-based session).

Tolong buatkan:
1. Konfigurasi Sanctum SPA auth yang benar di Laravel (SANCTUM_STATEFUL_DOMAINS,
   session domain, CORS supports_credentials: true).
2. Endpoint: POST /api/login, POST /api/logout, GET /api/user (current authenticated
   user beserta data employee & role-nya, karena kita butuh info role di frontend
   untuk menentukan menu apa yang tampil).
3. Middleware custom "role" (atau gunakan Gate/Policy) yang mengecek role employee
   milik user yang login, terapkan ke route master data dari milestone sebelumnya
   (hanya super_admin yang boleh CRUD master data).
4. Di React: buatkan AuthContext yang menyimpan current user + employee + role,
   fungsi login/logout, dan ProtectedRoute component yang redirect ke halaman login
   jika belum authenticated, atau menolak akses jika role tidak sesuai kebutuhan
   halaman tertentu.
5. Halaman Login sederhana di React.
6. Buatkan juga struktur navigasi sidebar yang menu-nya muncul berbeda tergantung
   role user (misal: super_admin melihat menu Master Data, admin_departemen melihat
   menu "Buat SPD", approver melihat menu "Approval Saya" — menu approval & SPD
   belum ada implementasinya, cukup siapkan placeholder routing untuk di milestone
   berikutnya).

Pastikan flow login-nya sesuai standar Sanctum SPA (ambil CSRF cookie dulu via
GET /sanctum/csrf-cookie sebelum POST /api/login).
```

---

### M3 — Modul SPD (Surat Perjalanan Dinas) — Core

```
Lanjutan project SPD & DPD. Sekarang buatkan modul inti Surat Perjalanan Dinas (SPD),
BELUM termasuk approval engine (itu di milestone berikutnya) — fokus dulu ke
pembuatan data SPD.

Konteks bisnis:
- SPD dibuat oleh admin_departemen untuk satu atau lebih karyawan (satu jadi
  "pemohon_utama", sisanya berstatus "pengikut").
- SPD bisa lintas departemen (dinas gabungan) — flag is_cross_department dihitung
  otomatis berdasarkan apakah semua pengikut berasal dari departemen yang sama
  dengan pemohon utama atau tidak.
- Nomor surat harus auto-generate dengan format:
  SPD/{KODE_DEPT}/{URUTAN_3_DIGIT}/{BULAN_ROMAWI}/{TAHUN}
  Contoh: SPD/HRD/001/IX/2026
  KODE_DEPT diambil dari department milik pemohon utama. Urutan reset setiap
  tahun berjalan, dihitung per kombinasi department+tahun.
- Field SPD lainnya: destination (tujuan), purpose (keperluan), start_date, end_date.
  Silakan tambahkan field lain yang menurutmu wajar untuk dokumen dinas resmi
  (misal transportasi yang digunakan, nomor referensi internal, dsb) — beri saran,
  saya akan sesuaikan.
- Status SPD: pending, approved, rejected (transisi status detailnya baru
  diimplementasi di milestone approval engine — untuk sekarang set default "pending"
  saat dibuat).

Tolong buatkan:
1. Migration untuk tabel spd dan spd_employees (pivot dengan kolom tambahan
   status_role_in_spd, approval_status, rejection_reason sesuai skema).
2. Model Spd dan SpdEmployee dengan relasi lengkap (Spd hasMany SpdEmployee,
   SpdEmployee belongsTo Employee, dst), termasuk relasi ke Department pemohon utama.
3. Service class (misal SpdNumberGeneratorService) khusus untuk generate nomor
   surat sesuai format di atas, dengan locking/transaction yang aman dari race
   condition (dua request bersamaan tidak boleh menghasilkan nomor urut yang sama).
4. Form Request validasi untuk create SPD: pastikan minimal ada 1 karyawan (pemohon
   utama), tidak ada duplikat employee dalam 1 SPD, start_date sebelum end_date, dst.
5. Controller dengan endpoint: create SPD (sekaligus daftar pengikutnya dalam satu
   request), list SPD (dengan filter status, filter "SPD milik departemen saya" untuk
   admin_departemen, "riwayat pengajuan saya" untuk karyawan biasa), detail SPD.
6. Di React: buatkan form pembuatan SPD dengan kemampuan menambah beberapa karyawan
   sebagai pengikut (multi-select atau tabel dinamis tambah/hapus baris), pilih
   pemohon utama, isi tujuan/tanggal/keperluan. Buatkan juga halaman daftar SPD
   (tabel dengan status badge) dan halaman detail SPD.

Simpan logic penentuan is_cross_department di backend (bukan di frontend), dihitung
otomatis saat SPD disimpan.
```

---

### M4 — Modul SPD — Approval Engine

```
Lanjutan project SPD & DPD. Ini bagian paling kompleks: approval engine untuk SPD.
Tolong baca konteks bisnis berikut dengan teliti sebelum membuat kode.

ATURAN APPROVAL:
1. SPD dalam SATU departemen (semua pengikut dari departemen yang sama):
   - Buat SATU rantai approval (spd_approval_chain, kolom spd_employee_id = null,
     berlaku untuk seluruh SPD).
   - Rantai ditentukan dari LEVEL TERTINGGI di antara semua pengikut (termasuk
     pemohon utama). Contoh: kalau ada pengikut dengan role team_manager, maka
     rantai approval-nya: Manager saja (karena next approver dari team_manager
     adalah manager, sesuai role_hierarchy) — bukan mulai dari team_manager lagi.
   - Ambil approver aktual dengan menelusuri supervisor_id dari karyawan berlevel
     tertinggi tersebut ke atas, sejumlah level yang dibutuhkan sesuai role_hierarchy,
     BUKAN sekadar role_hierarchy semata — approver harus orang riil (employee)
     yang merupakan supervisor berjenjang dari karyawan tsb.
   - Jika karyawan levelnya general_manager, SPD auto-approved (tanpa chain).
2. SPD LINTAS departemen (dinas gabungan):
   - Rantai approval DIPECAH PER KARYAWAN. Setiap spd_employees punya
     spd_approval_chain sendiri (kolom spd_employee_id diisi), mengikuti hierarki
     supervisor masing-masing karyawan tsb secara independen.
   - SPD keseluruhan baru berstatus "approved" jika SEMUA rantai per karyawan
     sudah selesai (semua approved). Jika SALAH SATU karyawan di-reject oleh
     atasannya, maka SPD keseluruhan menjadi "rejected", dan seluruh proses approval
     karyawan lain otomatis dibatalkan/tidak relevan lagi (set status cancelled atau
     sejenisnya, beri saran field yang tepat).
3. Approve/reject dilakukan oleh approver yang login, terhadap chain miliknya yang
   levelnya sedang "giliran jalan" (level_order berurutan — approver level 2 tidak
   bisa approve sebelum level 1 selesai approve).
4. Setiap aksi approve/reject WAJIB dicatat ke tabel approval_logs (polymorphic,
   dipakai juga nanti oleh DPD), termasuk snapshot role_at_approval, rejection_reason
   jika reject.
5. Jika di-reject di level manapun, status SPD (atau status spd_employees terkait,
   untuk kasus lintas departemen) menjadi "rejected" dan otomatis masuk histori
   pemohon. Tidak ada revisi — pemohon harus membuat SPD baru dari awal.
6. PENTING: sistem delegasi approval BELUM diimplementasikan di milestone ini
   (menyusul di milestone berikutnya), tapi desain kode approval engine ini harus
   mudah di-extend nanti untuk mengecek "apakah approver sedang mendelegasikan
   wewenangnya ke orang lain" sebelum menentukan siapa yang berhak approve.
   Buatkan sudah sebuah method/interface kosong seperti resolveActualApprover()
   yang untuk sekarang cukup return approver aslinya, supaya nanti tinggal diisi
   logic delegasi tanpa mengubah struktur besar.

Tolong buatkan:
1. Migration untuk spd_approval_chain dan approval_logs (polymorphic morphs).
2. Service class SpdApprovalService yang menangani:
   - generateApprovalChain(Spd $spd) -> dipanggil setelah SPD dibuat, membuat
     chain sesuai 2 skenario di atas.
   - approve(SpdApprovalChain $chain, Employee $actor)
   - reject(SpdApprovalChain $chain, Employee $actor, string $reason)
   - method resolveActualApprover(Employee $originalApprover) sebagai placeholder
     delegasi seperti dijelaskan di atas.
3. Controller/endpoint: list "approval saya" (chain yang levelnya sedang giliran
   jalan dan approver_employee_id = employee yang login), endpoint approve,
   endpoint reject (dengan body rejection_reason wajib diisi).
4. Update status SPD/spd_employees otomatis via Observer atau di dalam Service
   setelah approve/reject terjadi (cek apakah semua chain terkait sudah selesai).
5. Di React: halaman "Approval SPD Saya" (list chain yang perlu ditindaklanjuti
   oleh user yang login), dengan tombol approve/reject (reject munculkan modal
   input alasan). Update juga halaman detail SPD agar menampilkan progress
   approval (misal: stepper/timeline siapa sudah approve, siapa masih pending).

Tulis unit test untuk SpdApprovalService khususnya untuk 2 skenario (satu
departemen vs lintas departemen) karena ini logic paling kritis di sistem ini.
```

---

### M5 — Delegasi Approval

```
Lanjutan project SPD & DPD. Sekarang implementasikan sistem delegasi approval
yang sudah disiapkan placeholder-nya di SpdApprovalService (method
resolveActualApprover).

Konteks bisnis:
- Delegasi berbasis PERIODE WAKTU (start_date - end_date), bukan per-surat manual.
- Selama periode delegasi aktif, SEMUA approval yang seharusnya masuk ke
  delegator (atasan asli) otomatis diarahkan ke delegate (orang yang menerima
  delegasi) — delegate yang approve/reject atas nama delegator.
- Yang berhak MENGATUR delegasi (create/update/cancel) adalah role
  general_manager saja (mengatur delegasi untuk siapapun di organisasi, bukan
  cuma untuk dirinya sendiri).
- approval_logs harus mencatat jika sebuah approval terjadi lewat delegasi
  (field acted_on_behalf_of diisi employee_id delegator asli, approver_employee_id
  diisi delegate yang benar-benar melakukan aksi).

Tolong buatkan:
1. Migration tabel delegations sesuai skema (delegator_id, delegate_id, start_date,
   end_date, created_by, is_active).
2. Model Delegation + validasi bisnis: tidak boleh ada 2 delegasi aktif yang
   overlap periode untuk delegator yang sama, delegate tidak boleh sama dengan
   delegator.
3. Update method resolveActualApprover() di SpdApprovalService: cek apakah
   originalApprover punya delegasi aktif pada tanggal saat ini (atau tanggal
   approval sedang dibutuhkan), jika ada return delegate-nya, jika tidak return
   approver asli. Pastikan approval_logs mencatat acted_on_behalf_of dengan benar.
4. Controller CRUD untuk delegations, dibatasi hanya bisa diakses role
   general_manager.
5. Di React: halaman khusus (menu hanya muncul untuk role general_manager)
   untuk mengatur delegasi — pilih delegator (dropdown employee), pilih delegate,
   set periode tanggal, list delegasi aktif/riwayat.
6. Tambahkan indikator di halaman "Approval Saya": jika suatu approval item
   sebenarnya didelegasikan dari orang lain, tampilkan info "atas nama [nama
   delegator]" agar delegate paham konteksnya.

Tulis unit test untuk memastikan resolveActualApprover() bekerja benar saat ada
delegasi aktif maupun tidak ada.
```

---

### M6 — Modul DPD — Core

```
Lanjutan project SPD & DPD. Sekarang buatkan modul inti Deklarasi Perjalanan Dinas
(DPD), belum termasuk approval engine (menyusul di milestone berikutnya).

Konteks bisnis:
- DPD hanya bisa dibuat jika SPD terkait sudah berstatus "approved". DPD wajib
  berelasi ke SPD (satu SPD bisa punya lebih dari satu DPD? Diskusikan/beri saran
  — default asumsikan 1 SPD hanya boleh 1 DPD aktif, tapi beri saya rekomendasi
  jika ada pertimbangan lain).
- Nomor DPD auto-generate dengan format serupa SPD tapi prefix "DPD", reset per
  tahun, kode departemen mengikuti departemen pemohon utama SPD terkait.
- Isi form DPD:
  a. Laporan kegiatan: bisa lebih dari satu entry (dokumentasi rapat/kegiatan,
     upload file MoM/Notulen, judul, deskripsi).
  b. Item nota/reimbursement: bisa lebih dari satu entry, tiap item punya
     kategori pengeluaran (dari master dpd_expense_categories: transport,
     akomodasi, konsumsi, lain-lain — kelola sebagai master data khusus
     super_admin), deskripsi, nominal, tanggal, upload file nota (gambar/PDF).
- total_nominal DPD dihitung otomatis dari penjumlahan semua item nota (simpan
  sebagai cache column yang di-update tiap kali ada perubahan item, untuk
  mempermudah query/report).
- Validasi total nominal DPD terhadap jumlah hari dinas di SPD terkait akan
  diimplementasikan di milestone berikutnya (butuh business rule lebih detail,
  untuk sekarang cukup siapkan data yang dibutuhkan: jumlah hari dinas dihitung
  dari end_date - start_date SPD).
- Batas waktu pengajuan DPD (berapa hari setelah SPD selesai) diambil dari
  app_settings (key dpd_submission_deadline_days), yang diatur oleh general_manager
  di milestone Pengaturan Sistem — untuk sekarang siapkan strukturnya saja
  (tabel app_settings, service kecil untuk membaca setting ini), validasi
  penuhnya boleh disiapkan sebagai TODO/comment dulu jika settingnya belum ada.

Tolong buatkan:
1. Migration untuk: dpd, dpd_reports, dpd_expense_categories, dpd_expenses,
   app_settings, sesuai skema.
2. Model Eloquent lengkap dengan relasi (Dpd belongsTo Spd, hasMany DpdReport,
   hasMany DpdExpense; DpdExpense belongsTo DpdExpenseCategory).
3. Seeder untuk dpd_expense_categories (transport, akomodasi, konsumsi, lain-lain).
4. Service class DpdNumberGeneratorService (mirip pola SPD, reuse logic jika masuk
   akal dengan extract ke base class/trait bersama).
5. Form Request validasi create DPD: SPD harus approved, employee yang membuat
   harus terkait dengan SPD tsb (pemohon utama atau pengikut, atau admin
   departemen terkait), minimal ada beberapa data (boleh fleksibel: laporan
   kegiatan opsional tapi minimal 1 item nota, atau sebaliknya — beri saran
   validasi wajar untuk dokumen reimbursement resmi).
6. Controller endpoint: create DPD dengan nested laporan kegiatan & item nota
   dalam satu request (atau endpoint terpisah untuk tambah laporan/item setelah
   DPD dibuat — pilih pendekatan yang lebih rapi dan jelaskan alasannya), list DPD,
   detail DPD, endpoint tambah/edit/hapus laporan kegiatan, endpoint tambah/edit/
   hapus item nota (dengan upload file, gunakan Laravel Storage, simpan di
   storage/app/public dan buat symlink).
7. Di React: form pembuatan DPD terhubung dari halaman detail SPD (tombol
   "Buat DPD" hanya muncul jika SPD approved dan belum ada DPD), form dinamis
   tambah-hapus baris laporan kegiatan (dengan upload file) dan item nota
   (dengan kategori dropdown, nominal, tanggal, upload file), tampilkan running
   total nominal di form. Halaman list & detail DPD.

Gunakan Laravel Storage untuk semua file upload (jangan simpan base64 di database).
```

---

### M7 — Modul DPD — Approval Engine

```
Lanjutan project SPD & DPD. Sekarang buatkan approval engine untuk DPD. Ini
sebagian besar REUSE logic dari SpdApprovalService (milestone M4) — pertimbangkan
untuk extract logic bersama (misal ApprovalChainGenerator trait/base class) yang
dipakai baik oleh SPD maupun DPD, supaya tidak duplikasi kode.

Aturan approval DPD:
- Prinsipnya SAMA seperti SPD: dalam satu departemen 1 rantai approval mengikuti
  level tertinggi pengikut yang tercantum di SPD terkait; lintas departemen
  dipecah per karyawan mengikuti SPD-nya.
- Jika pemohon (atau pengikut level tertinggi) adalah general_manager, DPD
  auto-approved.
- Delegasi approval (dari M5) HARUS berlaku juga untuk DPD — reuse
  resolveActualApprover() yang sama, jangan buat ulang logic delegasi terpisah.
- Approval log DPD juga masuk ke tabel approval_logs yang sama (polymorphic),
  dibedakan lewat approvable_type = Dpd::class.
- Reject DPD -> masuk histori, tidak ada revisi (harus buat DPD baru, dengan
  catatan SPD terkait masih approved dan belum ada DPD approved lain untuk SPD
  yang sama — sesuaikan dengan keputusan di M6 soal 1 SPD boleh berapa DPD).

Tambahan business rule khusus DPD yang perlu diimplementasikan sekarang:
1. VALIDASI NOMINAL vs HARI DINAS: sebelum DPD bisa disubmit untuk approval,
   validasi total_nominal terhadap jumlah hari dinas (end_date - start_date SPD).
   Karena belum ada aturan plafon per hari yang pasti dari saya, buatkan
   sebagai konfigurasi (misal app_settings key "max_nominal_per_day" yang bisa
   diatur GM), jika total_nominal / jumlah_hari melebihi batas ini, tampilkan
   WARNING (bukan block keras, kecuali saya minta block) ke approver saat mereka
   me-review, agar mereka sadar sebelum approve. Jelaskan pendekatan ini ke saya
   dan saya akan koreksi jika mau dibuat block keras (hard validation).
2. BATAS WAKTU PENGAJUAN: gunakan app_settings key "dpd_submission_deadline_days"
   (sudah disiapkan strukturnya di M6). Saat create DPD, validasi apakah
   tanggal hari ini masih dalam batas (end_date SPD + deadline_days). Jika lewat,
   tolak pembuatan DPD dengan pesan error yang jelas.
3. Buatkan halaman Pengaturan sederhana (menu hanya untuk general_manager) untuk
   mengatur kedua app_settings ini (dpd_submission_deadline_days, max_nominal_per_day).

Tolong buatkan:
1. Migration tambahan untuk dpd_approval_chain (pola sama dengan spd_approval_chain).
2. Refactor jika perlu: extract shared logic approval chain generation dari
   SpdApprovalService ke trait/base class, lalu buat DpdApprovalService yang
   menggunakannya.
3. Service AppSettingService kecil untuk baca/tulis app_settings dengan caching
   sederhana.
4. Implementasikan validasi nominal vs hari dinas dan batas waktu pengajuan
   seperti dijelaskan di atas.
5. Controller endpoint approve/reject DPD (pola sama seperti SPD), list
   "approval DPD saya".
6. CRUD app_settings dibatasi role general_manager.
7. Di React: halaman "Approval DPD Saya" (mirip approval SPD, tampilkan detail
   laporan kegiatan & rincian nota saat approver membuka detail, plus warning
   nominal jika melebihi batas), halaman Pengaturan Sistem untuk GM.

Tulis unit test untuk validasi nominal vs hari dinas dan validasi batas waktu
pengajuan DPD.
```

---

### M8 — Dashboard

```
Lanjutan project SPD & DPD. Buatkan dashboard yang kontennya berbeda tergantung
role user yang login.

Kebutuhan per role:
- super_admin: ringkasan jumlah total employee, department, SPD & DPD per status
  (pending/approved/rejected) secara keseluruhan sistem.
- admin_departemen: ringkasan SPD/DPD yang dia buat untuk departemennya, status
  masing-masing, mungkin grafik sederhana per bulan.
- user/team_manager/manager biasa: ringkasan SPD/DPD miliknya sendiri (sebagai
  pemohon utama maupun pengikut), status terkini, riwayat singkat.
- approver (team_manager/manager/general_manager yang punya approval pending):
  widget "menunggu approval saya" dengan jumlah SPD & DPD yang perlu ditindak,
  link cepat ke halaman approval.
- general_manager: tambahan ringkasan delegasi aktif yang sedang berjalan.

Tolong buatkan:
1. Endpoint API dashboard yang mengembalikan data sesuai role user yang login
   (satu endpoint /api/dashboard yang responsnya adaptif berdasarkan role, atau
   beberapa endpoint terpisah — pilih pendekatan yang lebih rapi dan jelaskan
   kenapa).
2. Query yang efisien (hindari N+1, gunakan eager loading/aggregate query,
   pertimbangkan caching ringan jika query berat).
3. Di React: halaman Dashboard sebagai landing page setelah login, dengan
   card-card ringkasan angka dan mungkin chart sederhana (boleh pakai library
   chart ringan seperti recharts atau chart.js, pilih salah satu dan gunakan
   konsisten).

Buat komponen dashboard modular per role supaya mudah dikembangkan lagi nanti.
```

---

### M9 — Pengaturan Sistem (lanjutan/pelengkap)

```
Lanjutan project SPD & DPD. Milestone ini melengkapi halaman Pengaturan Sistem
yang sudah mulai dibuat sebagian di M7 (app_settings untuk dpd_submission_deadline_days
dan max_nominal_per_day, dikelola general_manager).

Tolong review dan lengkapi:
1. Pastikan semua app_settings punya validasi tipe data yang benar (misal
   deadline_days harus integer positif, max_nominal_per_day harus numeric positif).
2. Tambahkan halaman Pengaturan yang lebih terstruktur (bukan cuma raw key-value),
   dengan label yang jelas dan deskripsi tiap setting untuk general_manager.
3. Tambahkan riwayat perubahan setting sederhana (siapa mengubah, kapan, nilai
   lama vs baru) — bisa pakai tabel log kecil atau reuse pola activity log jika
   Laravel package seperti spatie/laravel-activitylog ingin dipakai (opsional,
   beri saya rekomendasi apakah worth it untuk skala sistem ini atau cukup
   manual).
4. Pastikan hanya general_manager yang bisa mengakses menu & endpoint ini,
   double-check middleware/policy sudah benar.
```

---

### M10 — Polish, Testing, Deployment Prep

```
Lanjutan project SPD & DPD. Ini tahap akhir sebelum dianggap siap dipakai
(minimal untuk internal testing/UAT).

Tolong bantu:
1. Review keseluruhan endpoint API, pastikan konsisten dalam format response
   (sukses & error), status code HTTP yang tepat, dan validasi di semua Form
   Request sudah lengkap.
2. Tambahkan Laravel Policy untuk otorisasi yang lebih rapi menggantikan
   middleware role sederhana jika masih ada yang belum konsisten (misal:
   apakah user boleh melihat detail SPD milik orang lain, dsb).
3. Buatkan seeder lengkap dengan data dummy realistis (beberapa department,
   employee dengan hierarki supervisor yang masuk akal 3-4 level, beberapa SPD
   contoh dengan berbagai status, beberapa DPD contoh) supaya saya bisa langsung
   testing end-to-end alur bisnisnya tanpa input manual dari nol.
4. Review keamanan dasar: pastikan file upload divalidasi tipe & ukurannya,
   endpoint approval tidak bisa diakses oleh employee yang bukan approver
   sebenarnya (cek ulang authorization di setiap endpoint sensitif), rate
   limiting dasar di endpoint login.
5. Tulis dokumentasi singkat (README atau file docs/ALUR-BISNIS.md) yang
   menjelaskan alur SPD & DPD end-to-end dengan bahasa non-teknis, supaya
   memudahkan onboarding user/admin departemen yang akan memakai sistem ini.
6. Siapkan checklist deployment dasar (env production, migrate --force,
   storage:link, build React untuk production, config Laravel untuk serve
   React build sebagai static assets atau disarankan pakai web server terpisah
   — jelaskan opsi mana yang lebih baik untuk skala sistem internal seperti ini).

Setelah ini, saya akan lakukan testing manual menyeluruh terhadap seluruh alur
bisnis SPD dan DPD sebelum sistem digunakan.
```

---

## 4. Catatan Penggunaan

- Jalankan prompt secara berurutan, satu milestone selesai dan sudah anda tes secara manual baru lanjut ke prompt berikutnya. Jangan gabungkan beberapa milestone dalam satu sesi opencode — akan sulit di-debug.
- Setiap kali membuka sesi baru opencode untuk milestone lanjutan, beri konteks singkat di awal (opencode biasanya bisa membaca ulang codebase, tapi jika perlu ringkas ulang keputusan bisnis penting dari bagian 0 di atas).
- Mulai M1, fondasi reusable component (DataTable, Modal, FormField, Button,
  StatusBadge, ConfirmDialog) dan caching (TanStack Query di frontend, Laravel
  Cache untuk master data di backend) sudah ditanamkan. Untuk prompt M2 dan
  seterusnya, tambahkan satu baris pengingat di awal prompt seperti:
  "Gunakan komponen reusable yang sudah ada di src/components/common, dan
  gunakan TanStack Query untuk semua data-fetching baru, konsisten dengan
  pola dari M1." — supaya opencode tidak membuat pola baru yang tidak konsisten.
- Karena anda baru pertama kali pakai Laragon: cukup gunakan Laragon untuk menyalakan MySQL saja (klik "Start All" di aplikasi Laragon), lalu jalankan backend dengan `php artisan serve` dan frontend dengan `npm run dev` secara terpisah — anda tidak wajib pakai virtual host Apache/Nginx Laragon kecuali nanti ingin akses lewat domain lokal custom (misal `spd-dpd.test`).
- Simpan file markdown ini di root project (misal sebagai `ROADMAP.md`) supaya jadi acuan bersama antara anda dan AI selama development.
