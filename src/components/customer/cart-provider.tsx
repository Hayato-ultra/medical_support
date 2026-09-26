'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface CartItem {
  medicineId: string
  name: string
  price: number
  quantity: number
  requiresPrescription?: boolean
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (medicineId: string) => void
  updateQuantity: (medicineId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
  itemCount: 0,
})

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addToCart = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.medicineId === item.medicineId)
      if (existing) {
        return prev.map((i) =>
          i.medicineId === item.medicineId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...prev, item]
    })
  }, [])

  const removeFromCart = useCallback((medicineId: string) => {
    setItems((prev) => prev.filter((i) => i.medicineId !== medicineId))
  }, [])

  const updateQuantity = useCallback((medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(medicineId)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.medicineId === medicineId ? { ...i, quantity } : i))
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
