-- Skema Arsiva untuk database BARU (kosong).
-- Jalankan sekali: psql "$DATABASE_URL" -f db/schema.sql
-- Kalau kamu sudah punya data dari proyek lama, pakai db/upgrade-dari-versi-lama.sql.

CREATE TABLE IF NOT EXISTS users (
  id_user      serial PRIMARY KEY,
  nama_lengkap varchar(100) NOT NULL,
  kelas        varchar(100) NOT NULL,
  password     varchar(255) NOT NULL,
  role         varchar(50)  NOT NULL DEFAULT 'USER'
);
CREATE UNIQUE INDEX IF NOT EXISTS users_nama_unik ON users (LOWER(nama_lengkap));

CREATE TABLE IF NOT EXISTS barang (
  id_barang     serial PRIMARY KEY,
  nama_barang   varchar(255) NOT NULL UNIQUE,
  status_barang varchar(255) NOT NULL DEFAULT 'true',
  jumlah_barang integer NOT NULL CHECK (jumlah_barang >= 0),
  tipe_barang   varchar(255) NOT NULL DEFAULT 'Umum'
);

CREATE TABLE IF NOT EXISTS ruangan (
  id_ruangan     serial PRIMARY KEY,
  nama_ruangan   varchar(100) NOT NULL UNIQUE,
  status_ruangan boolean DEFAULT true,
  updatedat      timestamptz,
  tipe_ruangan   varchar NOT NULL DEFAULT 'Kelas'
);

CREATE TABLE IF NOT EXISTS request (
  id_request     serial PRIMARY KEY,
  id_user        integer NOT NULL,
  id_barang      integer,
  id_ruangan     integer,
  jumlah_barang  integer,
  tanggal_pinjam timestamptz DEFAULT CURRENT_TIMESTAMP,
  status         boolean DEFAULT false,
  kelas          varchar(100),
  reason         text
);

CREATE TABLE IF NOT EXISTS notifikasi (
  id_notif   serial PRIMARY KEY,
  id_user    integer NOT NULL,
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedat  timestamptz,
  is_read    boolean DEFAULT false,
  id_barang  integer,
  id_kelas   integer
);
CREATE INDEX IF NOT EXISTS notifikasi_user_idx ON notifikasi (id_user, created_at DESC);

CREATE TABLE IF NOT EXISTS pinjam (
  id_pinjam        serial PRIMARY KEY,
  id_user          integer NOT NULL,
  id_barang        integer,
  id_ruangan       integer,
  tanggal_pinjam   timestamptz,
  tanggal_kembali  timestamptz,
  status_pinjam    boolean DEFAULT true,
  kelas            varchar,
  jenis_peminjaman varchar,
  id_request       integer,
  id_notif         integer,
  jumlah_barang    integer DEFAULT 1,
  jatuh_tempo      timestamptz,
  alasan           text
);
CREATE INDEX IF NOT EXISTS pinjam_user_idx ON pinjam (id_user, tanggal_pinjam DESC);

-- Contoh data awal (hapus kalau tidak perlu).
INSERT INTO barang (nama_barang, jumlah_barang, tipe_barang) VALUES
  ('Bola basket', 3, 'Olahraga'),
  ('Bola futsal', 2, 'Olahraga'),
  ('Matras', 2, 'Olahraga'),
  ('Proyektor', 6, 'Elektronik')
ON CONFLICT (nama_barang) DO NOTHING;
