# Arsiva

Sistem peminjaman inventaris dan aset sekolah. Siswa mengajukan peminjaman barang atau ruangan, admin menyetujui atau menolak, dan pengembalian tercatat otomatis.

Frontend (React + Vite + Tailwind) dan API (Express + PostgreSQL) sekarang **satu proyek**, jadi cukup satu kali deploy ke Vercel.

```
api/index.js      pintu masuk serverless Vercel (membungkus server/app.js)
server/           API Express: routes, middleware, koneksi database
src/              aplikasi React
db/schema.sql     skema untuk database baru
db/upgrade-dari-versi-lama.sql   untuk database proyek lama (dari pinjam.dump)
scripts/create-admin.js          membuat akun admin pertama
```

## Deploy ke Vercel

Vercel tidak punya database sendiri yang bisa dipakai langsung dari proyek lama (Postgres lokal tidak bisa diakses dari internet), jadi siapkan dulu database PostgreSQL online. Neon dan Supabase punya paket gratis. Atau di Vercel: Storage → Marketplace → Neon.

**1. Siapkan database**

Pilih salah satu:

- **Database baru (kosong):**
  `psql "$DATABASE_URL" -f db/schema.sql`
- **Mau membawa data lama** (dari `db/pinjam.dump`):
  ```
  pg_restore --no-owner --no-privileges -d "$DATABASE_URL" db/pinjam.dump
  psql "$DATABASE_URL" -f db/upgrade-dari-versi-lama.sql
  ```
  Password lama yang masih berupa teks polos otomatis di-hash saat pemiliknya berhasil masuk.

**2. Buat admin pertama**

```
npm install
npm run create-admin -- "Nama Admin" "password-kuat" --super
```
(isi `DATABASE_URL` di file `.env` dulu, lihat `.env.example`)

**3. Upload ke Vercel**

Push folder ini ke satu repo GitHub, lalu *Add New Project* di Vercel dan pilih repo itu. Preset Vite terdeteksi otomatis. Tambahkan dua Environment Variable:

| Nama | Isi |
|---|---|
| `DATABASE_URL` | connection string PostgreSQL (dengan `sslmode=require`) |
| `JWT_SECRET` | string acak panjang (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |

Klik Deploy. Frontend dan `/api/*` berjalan di domain yang sama, jadi tidak perlu CORS atau `FRONTEND_URL`.

> `db/pinjam.dump` berisi data pengguna lama. Sudah masuk `.gitignore`; jangan di-push ke repo publik.

## Jalan di komputer sendiri

```
cp .env.example .env     # isi DATABASE_URL dan JWT_SECRET
npm install
npm run dev              # web di :5173, API di :3001 (otomatis diproxy)
```

## Peran

| Peran | Bisa |
|---|---|
| `USER` (siswa) | lihat katalog, ajukan dan batalkan permintaan, lihat riwayat dan notifikasi sendiri, catat pengembalian miliknya |
| `ADMIN` | semua milik siswa, plus setujui/tolak permintaan, kelola barang dan ruangan, lihat seluruh riwayat |
| `SUPER ADMIN` | semua milik admin, plus menambah admin lewat `POST /api/users/admin` |

Pendaftaran lewat halaman daftar selalu menghasilkan `USER`.

## Catatan teknis

- Stok berkurang sebanyak jumlah yang diminta saat disetujui, dan pulih sebanyak itu saat dikembalikan. Stok dicek saat mengajukan dan saat menyetujui.
- Semua perubahan multi-langkah (setujui, tolak, kembalikan) berjalan dalam satu transaksi database.
- Kolom `kembali` dari skema lama tidak dipakai lagi; batas pengembalian kini ada di `pinjam.jatuh_tempo`.
- Token login berlaku 7 hari. Keluar = hapus token di browser.
