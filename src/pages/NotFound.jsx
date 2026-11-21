import { Link } from 'react-router-dom'
import AssetTag from '../components/AssetTag.jsx'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-sm text-center">
        <AssetTag code="ARV-404" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Halaman ini tidak ada di katalog</h1>
        <p className="mt-2 text-muted">Alamatnya mungkin salah ketik, atau halamannya sudah dipindah.</p>
        <Link to="/" className="btn-primary mt-6">Kembali ke beranda</Link>
      </div>
    </div>
  )
}
