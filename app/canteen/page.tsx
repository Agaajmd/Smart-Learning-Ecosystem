"use client"

import { useCallback, useMemo, useState } from "react"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { 
  mockCanteens,
  mockProducts,
  type Product,
  type Canteen,
  type OrderItem,
} from "@/lib/mock-data"
import { 
  Search,
  Store,
  Star,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Utensils,
  Coffee,
  Cookie,
  Home,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CartItem extends OrderItem {
  canteenId: string
  canteenName: string
}

export default function CanteenPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)

  const activeCanteens = useMemo(() => mockCanteens.filter((canteen) => canteen.isOpen), [])
  
  const allProducts = useMemo(
    () =>
      mockProducts.filter((product) => {
        const canteen = mockCanteens.find((item) => item.id === product.canteenId)
        return canteen?.isOpen && product.isAvailable
      }),
    [],
  )

  const filteredProducts = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase()
    return allProducts.filter((product) => {
      const matchesSearch = !query || product.name.toLowerCase().includes(query)
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      const matchesCanteen = !selectedCanteen || product.canteenId === selectedCanteen.id
      return matchesSearch && matchesCategory && matchesCanteen
    })
  }, [allProducts, selectedCategory, selectedCanteen, debouncedSearchQuery])

  const categories = [
    { value: "all", label: "Semua", icon: Store },
    { value: "MAKANAN", label: "Makanan", icon: Utensils },
    { value: "MINUMAN", label: "Minuman", icon: Coffee },
    { value: "SNACK", label: "Snack", icon: Cookie },
  ]

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + item.price, 0), [cart])
  const cartItemCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart])

  const addToCart = useCallback((product: Product) => {
    const canteen = mockCanteens.find(c => c.id === product.canteenId)
    if (!canteen) return

    // Check if cart has items from different canteen
    if (cart.length > 0 && cart[0].canteenId !== product.canteenId) {
      toast.error("Anda hanya bisa pesan dari satu kantin dalam satu waktu", {
        description: "Kosongkan keranjang terlebih dahulu",
      })
      return
    }

    const existingItem = cart.find((item) => item.productId === product.id)
    if (existingItem) {
      setCart((prev) =>
        prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, price: item.price + product.price }
            : item,
        ),
      )
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          canteenId: product.canteenId,
          canteenName: canteen.name,
        },
      ])
    }
    toast.success(`${product.name} ditambahkan ke keranjang`)
  }, [cart])

  const removeFromCart = useCallback((productId: string) => {
    const existingItem = cart.find(item => item.productId === productId)
    if (existingItem && existingItem.quantity > 1) {
      const product = mockProducts.find(p => p.id === productId)
      if (product) {
        setCart((prev) =>
          prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity - 1, price: item.price - product.price }
              : item,
          ),
        )
      }
    } else {
      setCart((prev) => prev.filter((item) => item.productId !== productId))
    }
  }, [cart])

  const clearCart = useCallback(() => {
    setCart([])
    setShowCart(false)
  }, [])

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return
    toast.success("Pesanan berhasil dibuat!", {
      description: "Pesanan Anda sedang diproses oleh kantin",
    })
    clearCart()
  }, [cart.length, clearCart])

  const quantityByProduct = useMemo(() => {
    return cart.reduce<Record<string, number>>((acc, item) => {
      acc[item.productId] = item.quantity
      return acc
    }, {})
  }, [cart])

  const getItemQuantity = useCallback(
    (productId: string) => quantityByProduct[productId] ?? 0,
    [quantityByProduct],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                <Home className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-2xl">🍽️</span> EduCanteen
                </h1>
                <p className="text-xs text-slate-500">Pesan makanan dari kantin sekolah</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCart(true)}
              className="relative p-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari makanan atau minuman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {/* Category Filter */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6">
          {categories.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium transition-all whitespace-nowrap",
                  selectedCategory === cat.value
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Canteen List */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Kantin Tersedia</h2>
            {selectedCanteen && (
              <button 
                onClick={() => setSelectedCanteen(null)}
                className="text-sm text-orange-500 font-medium"
              >
                Lihat Semua
              </button>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {activeCanteens.map(canteen => (
              <button
                key={canteen.id}
                onClick={() => setSelectedCanteen(selectedCanteen?.id === canteen.id ? null : canteen)}
                className={cn(
                  "min-w-[200px] bg-white rounded-2xl p-4 border-2 transition-all text-left",
                  selectedCanteen?.id === canteen.id 
                    ? "border-orange-500 shadow-lg shadow-orange-500/20" 
                    : "border-transparent shadow hover:shadow-md"
                )}
              >
                <img 
                  src={canteen.image} 
                  alt={canteen.name}
                  className="w-full h-24 object-cover rounded-xl mb-3"
                />
                <h3 className="font-semibold text-slate-800 truncate">{canteen.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">{canteen.rating}</span>
                  </div>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{canteen.totalOrders}+ order</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Products */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            {selectedCanteen ? `Menu ${selectedCanteen.name}` : "Semua Menu"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map(product => {
              const canteen = mockCanteens.find(c => c.id === product.canteenId)
              const quantity = getItemQuantity(product.id)
              
              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-2xl shadow hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="relative">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-28 object-cover"
                    />
                    <span className={cn(
                      "absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium",
                      product.category === "MAKANAN" ? "bg-orange-100 text-orange-700" :
                      product.category === "MINUMAN" ? "bg-blue-100 text-blue-700" :
                      "bg-purple-100 text-purple-700"
                    )}>
                      {product.category}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-slate-500 truncate">{canteen?.name}</p>
                    <h3 className="font-semibold text-slate-800 text-sm truncate mt-0.5">{product.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-1">{product.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="font-bold text-orange-600">Rp {product.price.toLocaleString()}</p>
                      {quantity > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="p-1 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-slate-800 w-6 text-center">{quantity}</span>
                          <button
                            onClick={() => addToCart(product)}
                            className="p-1 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="p-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Utensils className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">Tidak ada menu ditemukan</p>
            </div>
          )}
        </section>
      </main>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && !showCart && (
        <div className="fixed bottom-6 left-4 right-4 z-40">
          <button
            onClick={() => setShowCart(true)}
            className="w-full max-w-4xl mx-auto bg-orange-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold">{cartItemCount} item</p>
                <p className="text-sm text-white/80">{cart[0]?.canteenName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">Rp {cartTotal.toLocaleString()}</p>
              <p className="text-sm text-white/80">Lihat Keranjang</p>
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Keranjang Belanja</h2>
                <button onClick={() => setShowCart(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              {cart.length > 0 && (
                <p className="text-sm text-slate-500 mt-1">dari {cart[0].canteenName}</p>
              )}
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {cart.length > 0 ? (
                <div className="space-y-4">
                  {cart.map(item => {
                    const product = mockProducts.find(p => p.id === item.productId)
                    return (
                      <div key={item.productId} className="flex items-center gap-3">
                        <img 
                          src={product?.image} 
                          alt={item.productName}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-800 truncate">{item.productName}</h4>
                          <p className="text-orange-600 font-bold">Rp {item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-slate-800 w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => product && addToCart(product)}
                            className="p-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Keranjang masih kosong</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total</span>
                  <span className="text-xl font-bold text-slate-800">Rp {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-2xl font-medium hover:bg-slate-200 transition-colors"
                  >
                    Kosongkan
                  </button>
                  <button
                    onClick={handleCheckout}
                    className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-2xl font-medium hover:bg-orange-600 transition-colors"
                  >
                    Pesan Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
