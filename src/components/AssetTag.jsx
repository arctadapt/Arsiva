import { kodeAset } from '../lib/format.js'

export default function AssetTag({ jenis, id, code }) {
  return <span className="asset-tag" title="Kode aset">{code ?? kodeAset(jenis, id)}</span>
}
