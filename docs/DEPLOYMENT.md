# Checklist Deployment

Panduan men-deploy sistem SPD & DPD untuk skala internal (intranet/on-premise).

---

## Arsitertur yang Direkomendasikan

Untuk sistem internal skala kecil-menengah (10-1000 user), **web server terpisah** adalah pilihan terbaik dibandingkan menyajikan React build dari Laravel:

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| **Web server terpisah (Nginx)** — frontend di `/var/www/html`, backend di subdomain `api.domain` | Isolasi bersih, SSL mudah, cache static, jika backend down frontend tetap jalan | Dua konfigurasi server |
| Laravel serve React build sebagai static | Satu server saja | File React ikut dikelola Laravel, kurang fleksibel |

> Rekomendasi: **Nginx + dua vhost** (asal `spd.example.com` → frontend static, `api.example.com` → Laravel).

---

## Checklist Backend

1. **Environment production**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
   Edit `.env`:
   ```
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://api.example.com
   FRONTEND_URL=https://spd.example.com
   SANCTUM_STATEFUL_DOMAINS=spd.example.com,api.example.com
   SESSION_DOMAIN=.example.com
   DB_*
   ```

2. **Optimasi Laravel**
   ```bash
   composer install --optimize-autoloader --no-dev
   php artisan migrate --force --seed
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   php artisan storage:link
   ```

3. **Struktur storage writable**:
   ```bash
   chmod -R 775 storage bootstrap/cache
   ```

4. **Crontab (jika ada job terjadwal)**:
   ```
   * * * * * php /path/artisan schedule:run >> /dev/null 2>&1
   ```

5. **Queue** (jika menggunakan queue worker):
   ```
   php artisan queue:work --daemon
   ```

---

## Checklist Frontend

1. **Build production**:
   ```bash
   cd frontend
   npm ci
   ```
   Buat `.env.production`:
   ```
   VITE_API_BASE_URL=https://api.example.com
   ```
   ```bash
   npm run build
   ```
   Hasil build di `dist/` — upload ke `/var/www/html`.

2. **Nginx config (dasar)**:

   Frontend (`spd.example.com`):
   ```nginx
   server {
       listen 80;
       server_name spd.example.com;
       root /var/www/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

   API (`api.example.com`):
   ```nginx
   server {
       listen 80;
       server_name api.example.com;
       root /var/www/backend/public;

       location / {
           try_files $uri @php;
       }
       location @php {
           include fastcgi_params;
           fastcgi_param SCRIPT_FILENAME /var/www/backend/public/index.php;
           fastcgi_pass unix:/run/php/php8.2-fpm.sock;
       }
   }
   ```

---

## Checklist Keamanan

- [ ] `APP_DEBUG=false` di production
- [ ] HTTPS aktif (Let's Encrypt: `certbot --nginx`)
- [ ] Password default `password` diganti sebelum dipakai nyata
- [ ] Rate limit login aktif (`throttle:5,1`)
- [ ] Validasi upload file (PDF/JPG/PNG, max 10MB) — sudah diterapkan
- [ ] Backup database berkala + snapshot storage
- [ ] `.env` tidak masuk git (sudah di `.gitignore`)

---

## Checklist Pasca-Deploy

1. Login semua role (superadmin, GM, admin, manager, user) — pastikan dashboard per role tampil.
2. Buat SPD → approval → buat DPD → approval, tes alur lengkap.
3. Tes delegasi approval (GM mengatur, delegation aktif).
4. Tes upload file (PDF/gambar) untuk laporan & nota.
5. Cek riwayat perubahan setting di menu Pengaturan.
6. Cek error log: `tail -f backend/storage/logs/laravel.log`.

---

*Baca juga `docs/ALUR-BISNIS.md` untuk alur pengguna, dan `README.md` untuk setup lokal.*