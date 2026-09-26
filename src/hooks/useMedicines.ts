'use client'

import { useState, useEffect } from 'react'

export function useMedicine(id: string) {
  const [medicine, setMedicine] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/medicines?query=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setMedicine(data.medicines?.[0] || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  return { medicine, loading }
}

export function useMedicines(query?: string, category?: string) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    if (category && category !== 'All') params.set('category', category)

    fetch(`/api/medicines?${params}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [query, category])

  return { data, loading }
}
