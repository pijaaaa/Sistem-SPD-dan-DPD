# SPD & DPD System

Sistem manajemen **Surat Perjalanan Dinas (SPD)** dan **Deklarasi Perjalanan Dinas (DPD)** berbasis `Laravel 11 (API)` + `React (SPA + Vite)` + `MySQL (Laragon)`, menggunakan **Laravel Sanctum SPA Authentication**.

## Kebutuhan Sistem

- PHP >= 8.2 (Laragon)
- Composer
- Node.js & npm
- MySQL (via Laragon)

---

## 1. Persiapan Database (Laragon)

1. Buka Laragon → **Start All**.
2. Buka **HeidiSQL** / **phpMyAdmin**.
3. Buat database: `spd_dpd_db` (user: `root`, password kosong).
4. Struktur tabel dibuat otomatis oleh migration.

---

## 2. Menjalankan Backend

```bash
cd backend
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

> `--seed` otomatis mengisi data master (roles, departments, expense categories) dan data uji (TestDataSeeder).

Backend berjalan di `http://localhost:8000`.

---

## 3. Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

---

## Akun Login Default

| Email | Password | Role |
|---|---|---|
| `superadmin@example.com` | `password` | super_admin |
| `gm@company.com` | `password` | general_manager |
| `andi.manager@company.com` | `password` | manager (IT) |
| `sari.manager@company.com` | `password` | manager (IT) |
| `raka.admin@company.com` | `password` | admin_departemen (IT) |
| `bagus.tm@company.com` | `password` | team_manager (IT) |
| `fajar.user@company.com` | `password` | user (IT) |
| `kiki.user@company.com` | `password` | user (FIN) |

Semua password: `password`.

Data testing lengkap (departemen, hierarki employee, sample SPD, sample DPD, delegasi) sudah dibuat oleh `TestDataSeeder`.

---

## Modul & Role

| Modul | Endpoint | Role yang Boleh |
|---|---|---|
| Login / Logout | `/api/login`, `/api/logout` | Semua |
| Dashboard | `/api/dashboard` | Semua (konten adaptif per role) |
| Master Data | `/api/master/*` | super_admin |
| SPD (CRUD + approval) | `/api/spd/*` | admin_departemen, approver |
| DPD (CRUD + approval) | `/api/dpd/*` | user, admin_departemen, approver |
| Delegasi | `/api/delegations/*` | general_manager |
| Pengaturan | `/api/settings/*` | general_manager |

---

## Lisensi & Catatan

Internal testing/UAT build. Alur bisnis detail ada di `docs/ALUR-BISNIS.md`.