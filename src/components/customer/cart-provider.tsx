'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'

export interface CartItem {
  medicineId: string
  name: string
  price: number
  quantity: number
  requiresPrescription?: boolean
}

interface CartContextValue {
  items: CartItem[]
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  replaceAll: (items: CartItem[]) => void
  removeFromCart: (medicineId: string) => void
  updateQuantity: (medicineId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
  hasPrescriptionItems: boolean
  deliveryFee: number
  grandTotal: number
  hydrated: boolean
}

const MAX_QTY = 10
const FREE_DELIVERY_ABOVE = 500
const DELIVERY_FEE = 40
const STORAGE_KEY = 'medical-support-cart'

const CartContext = createContext<CartContextValue>({
  items: [],
  addToCart: () => {},
  replaceAll: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
  itemCount: 0,
  hasPrescriptionItems: false,
  deliveryFee: 0,
  grandTotal: 0,
  hydrated: false,
})

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage full or unavailable
    }
  }, [items, hydrated])

  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      const quantity = item.quantity ?? 1
      setItems((prev) => {
        const existing = prev.find((i) => i.medicineId === item.medicineId)
        if (existing) {
          return prev.map((i) =>
            i.medicineId === item.medicineId
              ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QTY) }
              : i
          )
        }
        return [...prev, { ...item, quantity: Math.min(quantity, MAX_QTY) }]
      })
    },
    []
  )

  const replaceAll = useCallback((next: CartItem[]) => {
    setItems(next.map((i) => ({ ...i, quantity: Math.min(i.quantity, MAX_QTY) })))
  }, [])

  const removeFromCart = useCallback((medicineId: string) => {
    setItems((prev) => prev.filter((i) => i.medicineId !== medicineId))
  }, [])

  const updateQuantity = useCallback((medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.medicineId !== medicineId))
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.medicineId === medicineId
          ? { ...i, quantity: Math.min(quantity, MAX_QTY) }
          : i
      )
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
    const deliveryFee =
      total === 0 || total >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE
    return {
      items,
      addToCart,
      replaceAll,
      removeFromCart,
      updateQuantity,
      clearCart,
      total,
      itemCount,
      hasPrescriptionItems: items.some((i) => i.requiresPrescription),
      deliveryFee,
      grandTotal: total + deliveryFee,
      hydrated,
    }
  }, [items, addToCart, replaceAll, removeFromCart, updateQuantity, clearCart, hydrated])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}

export { MAX_QTY, FREE_DELIVERY_ABOVE, DELIVERY_FEE }
