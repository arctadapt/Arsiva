-- Naikkan database proyek lama (hasil pg_restore db/pinjam.dump) ke skema Arsiva.
-- Aman dijalankan berulang: psql "$DATABASE_URL" -f db/upgrade-dari-versi-lama.sql

BEGIN;

-- Kolom baru: jumlah barang dipinjam, batas pengembalian, alasan penolakan.
ALTER TABLE pinjam
  ADD COLUMN IF NOT EXISTS jumlah_barang integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS jatuh_tempo   timestamptz,
  ADD COLUMN IF NOT EXISTS alasan        text;

-- Kolom ID lama bertipe smallint (maks 32.767). Lebarkan ke integer.
ALTER TABLE barang     ALTER COLUMN id_barang  TYPE integer;
ALTER TABLE ruangan    ALTER COLUMN id_ruangan TYPE integer;
ALTER TABLE request    ALTER COLUMN id_request TYPE integer;
ALTER TABLE notifikasi ALTER COLUMN id_notif   TYPE integer;
ALTER TABLE pinjam     ALTER COLUMN id_pinjam  TYPE integer;
ALTER SEQUENCE barang_id_barang_seq AS integer;
ALTER SEQUENCE pinjam_id_pinjam_seq NO MAXVALUE;

-- Tabel yang dulu memakai MAX(id)+1 sekarang memakai sequence (aman dari tabrakan ID).
CREATE SEQUENCE IF NOT EXISTS ruangan_id_ruangan_seq OWNED BY ruangan.id_ruangan;
CREATE SEQUENCE IF NOT EXISTS request_id_request_seq OWNED BY request.id_request;
CREATE SEQUENCE IF NOT EXISTS notifikasi_id_notif_seq OWNED BY notifikasi.id_notif;
ALTER TABLE ruangan    ALTER COLUMN id_ruangan SET DEFAULT nextval('ruangan_id_ruangan_seq');
ALTER TABLE request    ALTER COLUMN id_request SET DEFAULT nextval('request_id_request_seq');
ALTER TABLE notifikasi ALTER COLUMN id_notif   SET DEFAULT nextval('notifikasi_id_notif_seq');

-- Sinkronkan semua sequence dengan ID terbesar yang sudah ada.
SELECT setval('users_id_user_seq',             COALESCE((SELECT MAX(id_user)    FROM users), 0) + 1, false);
SELECT setval('barang_id_barang_seq',          COALESCE((SELECT MAX(id_barang)  FROM barang), 0) + 1, false);
SELECT setval('ruangan_id_ruangan_seq',        COALESCE((SELECT MAX(id_ruangan) FROM ruangan), 0) + 1, false);
SELECT setval('request_id_request_seq',        COALESCE((SELECT MAX(id_request) FROM request), 0) + 1, false);
SELECT setval('notifikasi_id_notif_seq',       COALESCE((SELECT MAX(id_notif)   FROM notifikasi), 0) + 1, false);
SELECT setval('pinjam_id_pinjam_seq',          COALESCE((SELECT MAX(id_pinjam)  FROM pinjam), 0) + 1, false);

-- Batas pengembalian lama tersimpan di tabel kembali; salin ke pinjam.
UPDATE pinjam p SET jatuh_tempo = k."tanggal kembali"
  FROM kembali k WHERE k.id_pinjam = p.id_pinjam AND p.jatuh_tempo IS NULL;

-- Indeks unik nama (hanya dibuat jika belum ada nama ganda; kalau gagal, abaikan).
CREATE INDEX IF NOT EXISTS users_nama_idx ON users (LOWER(nama_lengkap));

COMMIT;

-- Catatan: password lama masih berupa teks polos. Tidak perlu diubah manual:
-- setiap akun otomatis di-hash saat pemiliknya berhasil masuk pertama kali.
