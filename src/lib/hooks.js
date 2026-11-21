import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.js'

/** Ambil data GET dan simpan statusnya. `reload()` mengambil ulang tanpa menampilkan skeleton. */
export function useFetch(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const seq = useRef(0)

  const load = useCallback(async () => {
    const mine = ++seq.current
    try {
      const data = await api.get(path)
      if (mine === seq.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (mine === seq.current) setState((s) => ({ ...s, error, loading: false }))
    }
  }, [path])

  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    load()
    return () => { seq.current++ }
  }, [load])

  return { ...state, reload: load }
}

/** Beri tahu Layout untuk menyegarkan angka badge (notifikasi, permintaan). */
export const refreshCounts = () => window.dispatchEvent(new Event('arsiva:refresh'))
