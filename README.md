# SPD & DPD System Skeleton

Sistem ini terdiri dari dua bagian terpisah: backend (Laravel 11) dan frontend (React + Vite). Keduanya sudah dikonfigurasi untuk saling terhubung menggunakan **Laravel Sanctum SPA Authentication**.

## Kebutuhan Sistem
- PHP (minimal 8.2/8.3, direkomendasikan PHP 8.3 sesuai bawaan Laragon Anda)
- Composer
- Node.js & npm
- Laragon (untuk MySQL & web server lokal jika perlu)

---

## 1. Persiapan Database (di Laragon)

1. Buka Laragon dan klik **Start All** (pastikan MySQL berjalan).
2. Buka **HeidiSQL** atau **phpMyAdmin** (bawaan Laragon).
3. Buat database baru bernama `spd_dpd_db` (tanpa password, user: `root`).
4. Selesai. Struktur database akan dibuat otomatis oleh Laravel migration nantinya.

---

## 2. Menjalankan Backend (Laravel 11)

Buka terminal (bisa pakai bawaan Windows / VSCode) dan jalankan:

```bash
cd backend
php artisan migrate
php artisan serve
```

*Catatan: `php artisan serve` akan menjalankan backend di `http://localhost:8000`. Jika menggunakan fitur auto virtual host Laragon (misal: `http://backend.test`), pastikan URL di `.env` frontend (`VITE_API_BASE_URL`) disesuaikan.*

---

## 3. Menjalankan Frontend (React JS)

Buka tab terminal baru:

```bash
cd frontend
npm install
npm run dev
```

*Ini akan menjalankan React dev server di `http://localhost:5173`.*

---

## Tentang Konfigurasi yang Sudah Disiapkan

- **Backend (`backend/.env` & `config/cors.php`)**:
  - `SESSION_DOMAIN=localhost`
  - `SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173`
  - CORS sudah diizinkan (credentials: `true`) untuk `localhost:5173`.
  
- **Frontend (`frontend/src/services/api.js`)**:
  - Axios instance otomatis melampirkan *cookies* (`withCredentials: true`) yang diperlukan untuk autentikasi Sanctum SPA.
  - Endpoint base diatur melalui file `frontend/.env` (`VITE_API_BASE_URL`).

---

## Alur Singkat SPA Auth Sanctum (Untuk Nanti)
Saat membuat fitur login, frontend harus hit endpoint ini secara berurutan:
1. `GET /sanctum/csrf-cookie` (untuk mendapatkan CSRF token di cookie).
2. `POST /api/login` (mengirim kredensial username/password).
3. Jika sukses, request berikutnya ke endpoint berpelindung middleware `auth:sanctum` otomatis berjalan tanpa perlu menyisipkan token secara manual di header (berbasis cookie).

## Akun Login Default
- **Email:** `superadmin@example.com`
- **Password:** `password`
- **Role:** Super Admin (Akses penuh Master Data)
