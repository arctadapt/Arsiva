-- Arsiva 1.1: jalankan pada branch Neon pengujian dahulu.
BEGIN;
ALTER TABLE request ADD COLUMN IF NOT EXISTS tanggal_mulai timestamptz;
ALTER TABLE request ADD COLUMN IF NOT EXISTS tanggal_selesai timestamptz;
ALTER TABLE request ADD COLUMN IF NOT EXISTS keperluan text;
ALTER TABLE request ADD COLUMN IF NOT EXISTS catatan text;
ALTER TABLE request ADD COLUMN IF NOT EXISTS workflow_status varchar(40);
ALTER TABLE request ADD COLUMN IF NOT EXISTS pic_phone varchar(20);
ALTER TABLE request ADD COLUMN IF NOT EXISTS pic_status varchar(20) DEFAULT 'PENDING';
ALTER TABLE request ADD COLUMN IF NOT EXISTS pic_contacted_at timestamptz;
ALTER TABLE request ADD COLUMN IF NOT EXISTS pic_confirmed_at timestamptz;
ALTER TABLE request ADD COLUMN IF NOT EXISTS pic_notes text;
ALTER TABLE request ADD COLUMN IF NOT EXISTS handled_by integer;
ALTER TABLE request ADD COLUMN IF NOT EXISTS final_decided_at timestamptz;
ALTER TABLE request ADD COLUMN IF NOT EXISTS final_reason text;
CREATE TABLE IF NOT EXISTS arsiva_class_pic (
  kelas varchar(100) PRIMARY KEY,
  phone varchar(20) NOT NULL CHECK (phone ~ '^628[0-9]{7,12}$'),
  updated_by integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS arsiva_request_audit (
  id bigserial PRIMARY KEY,
  request_id integer NOT NULL,
  actor_id integer NOT NULL,
  event varchar(50) NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS arsiva_request_audit_req_idx ON arsiva_request_audit(request_id, created_at);
CREATE INDEX IF NOT EXISTS arsiva_request_schedule_idx ON request(id_ruangan,tanggal_mulai,tanggal_selesai)
 WHERE id_ruangan IS NOT NULL;

-- v1.1 finalisasi: jadwal booking tersimpan pada riwayat pinjam.
ALTER TABLE pinjam ADD COLUMN IF NOT EXISTS tanggal_mulai timestamptz;
ALTER TABLE pinjam ADD COLUMN IF NOT EXISTS tanggal_selesai timestamptz;
ALTER TABLE pinjam ADD COLUMN IF NOT EXISTS request_asal_id integer;
CREATE INDEX IF NOT EXISTS arsiva_pinjam_jadwal_idx ON pinjam(id_ruangan,tanggal_mulai,tanggal_selesai) WHERE id_ruangan IS NOT NULL;
COMMIT;
