// Membuat akun admin pertama.
//   npm run create-admin -- "Nama Lengkap" "password" [--super]
// --super membuat SUPER ADMIN (boleh menambah admin lain lewat API).
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const isSuper = process.argv.includes('--super')
const [nama, password] = args

if (!nama || !password || password.length < 6) {
  console.error('Pemakaian: npm run create-admin -- "Nama Lengkap" "password-min-6" [--super]')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum diatur (isi di file .env).')
  process.exit(1)
}

const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: local ? false : { rejectUnauthorized: false } })
await db.connect()
try {
  const role = isSuper ? 'SUPER ADMIN' : 'ADMIN'
  const hash = await bcrypt.hash(password, 10)
  const found = await db.query('SELECT id_user FROM users WHERE LOWER(nama_lengkap) = LOWER($1)', [nama])
  if (found.rowCount) {
    await db.query('UPDATE users SET role = $1, password = $2 WHERE id_user = $3', [role, hash, found.rows[0].id_user])
    console.log(`Akun "${nama}" diperbarui menjadi ${role}.`)
  } else {
    await db.query(`INSERT INTO users (nama_lengkap, kelas, password, role) VALUES ($1, 'Staf', $2, $3)`, [nama, hash, role])
    console.log(`Akun ${role} "${nama}" dibuat.`)
  }
} finally {
  await db.end()
}
