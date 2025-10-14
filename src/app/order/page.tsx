"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Utensils,
  Drumstick,
  Salad,
  Soup,
  Coffee,
  ShoppingBag,
  Leaf,
  Egg,
  Pizza,
  Home,
  Package,
  Cake,
  Tally1,
  X,
  CheckCircle,
} from "lucide-react";

// --- DUMMY AD DATA (Replace with API call or real data later) ---
const AD_BANNERS = [
  {
    id: "combo_special",
    image: "/ads/combo_promo.jpg",
    text: "🚨 50% OFF Combo Deals! Tap to see Menu!",
    targetCategory: "Rice Combos" as const,
  },
  {
    id: "korean_wings",
    image: "/ads/korean_promo.jpg",
    text: "🌶️ Korean Wings: Buy 1 Get 1 Free!",
    targetCategory: "Ramen & Corn Dogs" as const,
  },
  {
    id: "bakery_sweet",
    image: "/ads/bakery_promo.jpg",
    text: "🍰 Special Pastries! Freshly Baked!",
    targetCategory: "Bakery Specials" as const,
  },
];

// --- ENUM TYPES (Kept for consistency) ---
type MenuCategory =
  | "Bakery Specials"
  | "Ramen & Corn Dogs"
  | "Soups"
  | "Starters (Dry)"
  | "Manchuria"
  | "Noodles"
  | "Fried Rice"
  | "Rice Combos"
  | "Chat & Puri"
  | "North Indian Snacks"
  | "Continental"
  | "Beverages";

type ItemDiet = "Veg" | "Non-Veg" | "Egg";
type OrderType = "Dine-In" | "TakeAway";
// ----------------------

type Item = {
  id: string;
  name: string;
  price: number;
  image: string;
  stock_quantity: number;
  category: MenuCategory;
  diet: ItemDiet;
  parcel: number; // Renamed from parcel_fee for API consistency, but treated as fee/unit
};
type CartItem = Item & { qty: number };

type MenuItemApiResponse = {
  id: string;
  name: string;
  price: string | number;
  image_url: string;
  stock_quantity: number;
  category: MenuCategory;
  diet: ItemDiet;
  parcel: number;
};

// Helper function to map category string to an Lucide icon
const getCategoryIcon = (category: string | MenuCategory) => {
  switch (category) {
    case "Noodles":
    case "Fried Rice":
      return Utensils;
    case "Soups":
      return Soup;
    case "Starters (Dry)":
      return Drumstick;
    case "Manchuria":
      return Salad;
    case "Chat & Puri":
      return Tally1;
    case "North Indian Snacks":
      return ShoppingBag;
    case "Ramen & Corn Dogs":
      return Pizza;
    case "Continental":
      return Home;
    case "Rice Combos":
      return Package;
    case "Beverages":
      return Coffee;
    case "Bakery Specials":
      return Cake;
    default:
      return Utensils;
  }
};

const getDietColor = (diet: string | ItemDiet) => {
  if (diet === "Veg") return "text-green-600";
  if (diet === "Egg") return "text-orange-500";
  if (diet === "Non-Veg") return "text-red-600";
  return "text-gray-500";
};

// --- START OF COMPONENT ---

export default function OrderPage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [table, setTable] = useState("");
  const [placing, setPlacing] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    MenuCategory | "All" | null
  >(null);
  const [isVegFilterActive, setIsVegFilterActive] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("Dine-In");

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ref for the scrolling banner
  const bannerRef = useRef<HTMLDivElement>(null);

  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    table: false,
    consent: false,
  });

  // --- BANNER SCROLL EFFECT ---
  useEffect(() => {
    if (!bannerRef.current) return;

    const bannerContainer = bannerRef.current;

    // Function to scroll to the next slide
    const scrollNext = () => {
      const { scrollLeft, clientWidth, scrollWidth } = bannerContainer;

      // Calculate the index of the current slide based on scroll position
      const currentSlideIndex = Math.round(scrollLeft / clientWidth);

      let nextScrollPosition;

      if (currentSlideIndex >= AD_BANNERS.length - 1) {
        // If at the last slide, loop back to the first
        nextScrollPosition = 0;
      } else {
        // Otherwise, scroll to the next slide
        nextScrollPosition = scrollLeft + clientWidth;
      }

      bannerContainer.scrollTo({
        left: nextScrollPosition,
        behavior: "smooth",
      });
    };

    // Set interval for auto-scroll (e.g., every 4 seconds)
    const intervalId = setInterval(scrollNext, 4000);

    return () => clearInterval(intervalId);
  }, [AD_BANNERS.length]);

  // --- FETCH AND INITIALIZE ---
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("table");
    if (t) {
      setTable(t);
      setOrderType("Dine-In");
    } else {
      setOrderType("TakeAway");
    }

    (async () => {
      try {
        const res = await fetch("/api/menu");
        if (res.ok) {
          const data: Record<MenuCategory, MenuItemApiResponse[]> =
            await res.json();
          let flatMenu: Item[] = [];

          Object.keys(data).forEach((categoryKey) => {
            const category = categoryKey as MenuCategory;
            flatMenu = [
              ...flatMenu,
              ...data[category].map((m: MenuItemApiResponse) => ({
                id: m.id,
                name: m.name,
                price: Number(m.price) || 0,
                image: m.image_url || "/logo.png",
                stock_quantity: m.stock_quantity ?? 0,
                category: m.category,
                diet: m.diet,
                parcel: Number(m.parcel) || 0,
              })),
            ];
          });

          setMenuItems(flatMenu);
          if (flatMenu.length > 0) {
            setSelectedCategory("All");
          }
        }
      } catch {}
    })();
  }, []);

  // --- BANNER INTERACTION HANDLER ---
  const handleAdClick = (targetCategory: MenuCategory) => {
    // 1. Change the selected category
    setSelectedCategory(targetCategory);

    // 2. Scroll the user down to the menu view (optional, but helpful)
    const menuSection = document.getElementById("menu-section");
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const categories = useMemo<(MenuCategory | "All")[]>(() => {
    const cats = new Set<MenuCategory>(menuItems.map((item) => item.category));
    return (["All", ...Array.from(cats)] as (MenuCategory | "All")[]).sort();
  }, [menuItems]);

  // --- FILTERED MENU ITEMS ---
  const displayedMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const categoryMatch =
        selectedCategory === "All" || item.category === selectedCategory;
      const vegMatch = !isVegFilterActive || item.diet === "Veg";
      return categoryMatch && vegMatch;
    });
  }, [menuItems, selectedCategory, isVegFilterActive]);

  // --- FORM VALIDATION LOGIC ---
  const validateForm = useCallback(() => {
    const errors = {
      name: "",
      phone: "",
      table: "",
      cart: "",
      consent: "",
    };

    if (!name.trim()) errors.name = "Name is required.";
    const phonePattern = /^\d{10}$/;
    if (!phone.trim() || !phonePattern.test(phone.trim()))
      errors.phone = "A valid 10-digit phone number is required.";
    if (orderType === "Dine-In" && !table.trim())
      errors.table = "Please select a table number for Dine-In.";
    if (cart.length === 0) errors.cart = "Please add items to your order.";
    if (!consentChecked)
      errors.consent = "You must agree to store your details.";
    return errors;
  }, [name, phone, table, cart, consentChecked, orderType]);

  const [formErrors, setFormErrors] = useState(validateForm());

  useEffect(() => {
    setFormErrors(validateForm());
  }, [name, phone, table, cart, consentChecked, orderType, validateForm]);

  // --- CART & TOTALS LOGIC ---
  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.qty, 0),
    [cart]
  );

  const dynamicParcelFee = useMemo(
    () => cart.reduce((totalFee, item) => totalFee + item.parcel * item.qty, 0),
    [cart]
  );

  const totalParcelFee = orderType === "TakeAway" ? dynamicParcelFee : 0;

  const total = useMemo(
    () => subtotal + totalParcelFee,
    [subtotal, totalParcelFee]
  );

  const totalItemCount = useMemo(
    () => cart.reduce((count, item) => count + item.qty, 0),
    [cart]
  );

  const isFormValid = useMemo(() => {
    return (
      !formErrors.name &&
      !formErrors.phone &&
      !formErrors.table &&
      !formErrors.cart &&
      !formErrors.consent &&
      cart.length > 0
    );
  }, [formErrors, cart]);

  const addToCart = (it: Item) => {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.id === it.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { ...it, qty: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: Math.max(0, qty) } : p))
        .filter((p) => p.qty > 0)
    );
  };

  // Handlers for Modal
  const openModal = () => cart.length > 0 && setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  async function placeOrder() {
    const errors = validateForm();
    setFormErrors(errors);
    setTouched({ name: true, phone: true, table: true, consent: true });

    if (Object.values(errors).some((err) => err !== "")) return;

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          tableNumber: orderType === "Dine-In" ? table : "TakeAway",
          isParcelOrder: orderType === "TakeAway",
          items: cart.map(({ id, name, price, qty, parcel }) => ({
            id,
            name,
            price,
            qty,
            item_parcel: parcel,
          })),
        }),
      });
      if (!res.ok) throw new Error("Order failed");
      const data = await res.json();
      setCreatedOrderId(data.id);
      setCart([]);
      closeModal();
      router.push(`/order/${data.id}`);
    } catch (e) {
      setFormErrors((prev) => ({
        ...prev,
        cart: "Could not place order. Please try again.",
      }));
    } finally {
      setPlacing(false);
    }
  }

  const tableNumbers = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

  // --- RENDER ---

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto pb-24">
      <h1 className="text-4xl font-bold text-center text-[var(--primary)]">
        Restaurant Digital Menu
      </h1>
      <p className="text-center mt-2 text-foreground/60">
        Browse, customize, and checkout using the cart button below.
      </p>

      {/* --- NEW: SCROLLING AD BANNER --- */}
      <div
        ref={bannerRef}
        className="mt-8 mb-10 flex overflow-x-scroll snap-x snap-mandatory scrollbar-hide rounded-xl shadow-xl bg-gray-100"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {AD_BANNERS.map((ad) => (
          <div
            key={ad.id}
            onClick={() => handleAdClick(ad.targetCategory)}
            className="flex-shrink-0 w-full snap-center relative h-12 md:h-24 cursor-pointer"
            style={{
              backgroundImage: `url(${ad.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
              <p className="text-white text-xl md:text-xl font-extrabold text-center tracking-wide">
                {ad.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* --------------------------------- */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Categories and Filters */}
        <aside className="col-span-1 rounded-xl border border-gray-200 bg-white p-4 shadow-lg h-fit sticky top-6">
          <h2 className="text-xl font-bold pb-3 border-b border-gray-100 mb-2">
            Menu Sections
          </h2>

          <div className="flex flex-col gap-1 mt-3 max-h-[50vh] overflow-y-auto pr-2">
            {categories.map((cat) => {
              const IconComponent = getCategoryIcon(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center space-x-3 p-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? "bg-[var(--primary)] text-white shadow-md"
                      : "text-foreground hover:bg-gray-50 hover:text-[var(--primary)]"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Veg Filter Switch */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf
                className={`w-6 h-6 transition-colors ${
                  isVegFilterActive ? "text-green-600" : "text-gray-400"
                }`}
              />
              <span className="text-base font-semibold">Veg Only Filter</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isVegFilterActive}
                onChange={(e) => setIsVegFilterActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-gray-300 rounded-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full shadow-inner" />
            </label>
          </div>
        </aside>

        {/* Middle: Menu Items */}
        <section
          id="menu-section"
          className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
        >
          <h2 className="text-2xl font-bold border-b pb-3 mb-6 text-foreground/80">
            {selectedCategory || "All Items"}
          </h2>

          {/* List of Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto pr-2">
            {displayedMenuItems.map((it) => {
              const current = cart.find((c) => c.id === it.id)?.qty ?? 0;
              const dietColor = getDietColor(it.diet);
              const IconComponent = it.diet === "Egg" ? Egg : Leaf;

              return (
                <div
                  key={it.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4 flex-grow">
                    <img
                      src={it.image}
                      alt={it.name}
                      className="h-16 w-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-base flex items-center gap-2">
                        {it.name}
                        <IconComponent className={`w-4 h-4 ${dietColor}`} />
                      </p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        ₹{it.price.toFixed(2)}
                      </p>
                      <p className={`text-xs font-medium ${dietColor} mt-0.5`}>
                        {it.diet}
                        {orderType === "TakeAway" && it.parcel > 0 && (
                          <span className="ml-2 text-red-500 font-normal">
                            (+₹{it.parcel.toFixed(0)} Parcel)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <button
                      className="h-8 w-8 rounded-full border border-gray-300 text-xl text-foreground hover:bg-gray-100 transition-colors flex items-center justify-center"
                      onClick={() => updateQty(it.id, Math.max(0, current - 1))}
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-lg font-bold">
                      {current}
                    </span>
                    <button
                      className="h-8 w-8 rounded-full border border-[var(--primary)] bg-[var(--primary)] text-white text-xl hover:bg-[var(--primary-600)] transition-colors flex items-center justify-center"
                      onClick={() =>
                        current === 0
                          ? addToCart(it)
                          : updateQty(it.id, current + 1)
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            {displayedMenuItems.length === 0 && (
              <p className="text-center text-foreground/60 p-10 border rounded-xl lg:col-span-2">
                No items found in this section or matching your filters.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* --- FLOATING CART SHEET --- */}
      {cart.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t-2 border-[var(--primary)] shadow-2xl cursor-pointer transition-all duration-300 hover:bg-gray-50"
          onClick={openModal}
        >
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-[var(--primary)]" />
              <span className="text-lg font-semibold text-foreground">
                {totalItemCount} Items in Cart
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm text-foreground/70 mr-2">
                Total Price:
              </span>
              <span className="text-2xl font-bold text-[var(--primary)]">
                ₹{total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- ORDER MODAL / DIALOG BOX --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-transform duration-300 scale-100">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-2xl font-bold text-[var(--primary)]">
                Complete Your Order
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 1. Item Review & Modification */}
            <h3 className="text-lg font-semibold mb-3 border-b pb-2">
              Items ({totalItemCount})
            </h3>
            <div className="space-y-3 max-h-40 overflow-y-auto mb-4 pr-2">
              {cart.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 border-b border-dashed border-gray-100 pb-2 last:border-b-0"
                >
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-foreground/60">
                      @ ₹{c.price.toFixed(2)}
                      {c.parcel > 0 && orderType === "TakeAway" && (
                        <span> (+₹{c.parcel.toFixed(0)} Parcel)</span>
                      )}
                    </p>
                  </div>

                  {/* Quantity Controls in Modal */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="h-6 w-6 rounded-full border border-gray-300 text-base text-foreground hover:bg-gray-100 transition-colors flex items-center justify-center"
                      onClick={() => updateQty(c.id, c.qty - 1)}
                    >
                      -
                    </button>
                    <span className="w-4 text-center text-sm font-bold">
                      {c.qty}
                    </span>
                    <button
                      className="h-6 w-6 rounded-full border border-gray-300 text-base text-foreground hover:bg-gray-100 transition-colors flex items-center justify-center"
                      onClick={() => updateQty(c.id, c.qty + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="font-bold text-sm text-[var(--primary)] flex-shrink-0 w-16 text-right">
                    ₹
                    {(
                      c.price * c.qty +
                      (orderType === "TakeAway" ? c.parcel * c.qty : 0)
                    ).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Order Type Selector */}
            <div className="mb-4 pt-2 border-t">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Service Option:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOrderType("Dine-In")}
                  className={`flex items-center justify-center p-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                    orderType === "Dine-In"
                      ? "bg-green-500 text-white border-green-500 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Home className="w-4 h-4 mr-2" /> Dine-In
                </button>
                <button
                  onClick={() => setOrderType("TakeAway")}
                  className={`flex items-center justify-center p-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                    orderType === "TakeAway"
                      ? "bg-red-500 text-white border-red-500 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Package className="w-4 h-4 mr-2" /> TakeAway
                </button>
              </div>
            </div>

            {/* 3. Financial Summary */}
            <div className="space-y-2 py-4 border-t border-b mb-4">
              <div className="flex items-center justify-between text-base">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-bold">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-base">
                <span
                  className={`transition-colors ${
                    orderType === "TakeAway"
                      ? "font-medium text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  Parcel Fee (for {totalItemCount} items)
                </span>
                <span
                  className={`font-bold transition-colors ${
                    orderType === "TakeAway" ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  + ₹{totalParcelFee.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xl font-bold">Grand Total</span>
                <span className="font-extrabold text-2xl text-[var(--primary)]">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* 4. Customer Details & Validation (Simplified) */}
            <div className="grid grid-cols-1 gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  setTouched((p) => ({ ...p, name: true }));
                  setFormErrors(validateForm());
                }}
                placeholder="Your Name"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm w-full"
              />
              {touched.name && formErrors.name && (
                <p className="text-red-500 text-xs">{formErrors.name}</p>
              )}

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  setTouched((p) => ({ ...p, phone: true }));
                  setFormErrors(validateForm());
                }}
                placeholder="Phone Number (10 Digits)"
                type="tel"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm w-full"
              />
              {touched.phone && formErrors.phone && (
                <p className="text-red-500 text-xs">{formErrors.phone}</p>
              )}

              {orderType === "Dine-In" && (
                <>
                  <select
                    value={table}
                    onChange={(e) => {
                      setTable(e.target.value);
                      setTouched((p) => ({ ...p, table: true }));
                      setFormErrors(validateForm());
                    }}
                    onBlur={() => {
                      setTouched((p) => ({ ...p, table: true }));
                      setFormErrors(validateForm());
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm w-full bg-white"
                  >
                    <option value="">Select Table Number</option>
                    {tableNumbers.map((num) => (
                      <option key={num} value={num}>{`Table ${num}`}</option>
                    ))}
                  </select>
                  {touched.table && formErrors.table && (
                    <p className="text-red-500 text-xs">{formErrors.table}</p>
                  )}
                </>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="consent-modal"
                  checked={consentChecked}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked);
                    setFormErrors(validateForm());
                  }}
                  className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label
                  htmlFor="consent-modal"
                  className="text-xs text-foreground/70"
                >
                  I agree to store my details for order tracking.
                </label>
              </div>
              {formErrors.consent && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.consent}
                </p>
              )}
              {formErrors.cart && (
                <p className="text-red-500 text-xs mt-1">{formErrors.cart}</p>
              )}
            </div>

            {/* 5. Place Order Button */}
            <button
              onClick={placeOrder}
              disabled={placing || !isFormValid}
              className={`mt-6 w-full px-4 py-3 rounded-xl text-white text-lg font-bold transition-all shadow-lg flex items-center justify-center ${
                isFormValid
                  ? "bg-[var(--primary)] hover:bg-[var(--primary-600)]"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {placing ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" /> Confirm & Pay at
                  Counter
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
