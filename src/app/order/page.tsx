"use client";

import { useEffect, useMemo, useState, useCallback, useRef, JSX } from "react";
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
  Menu,
  ArrowLeft,
  Component,
  CupSoda,
  ChevronsRight,
  UtensilsCrossed,
  Sandwich,
  Coffee as BeverageIcon,
  Search,
} from "lucide-react";

// --- DUMMY AD DATA (Kept for completeness) ---
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
  | "Noodles"
  | "Fried Rice"
  | "Soups"
  | "Starters (Dry)"
  | "Manchuria"
  | "Chat & Puri"
  | "North Indian Snacks"
  | "Ramen & Corn Dogs"
  | "Continental"
  | "Rice Combos"
  | "Beverage"
  | "Bakery Specials"
  | "Pizza"
  | "Sandwich"
  | "Burger"
  | "Shake"
  | "Thick Shake"
  | "Mojito"
  | "Chinese Main"
  | "Chinese Starter"
  | "All";

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
  parcel: number;
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

// --- CATEGORY ICON MAP ---
const getCategoryIcon = (
  category: string | MenuCategory
): React.ElementType => {
  switch (category) {
    case "Noodles":
    case "Fried Rice":
    case "Chinese Main":
    case "Manchuria":
      return ChevronsRight;
    case "Soups":
      return Soup;
    case "Starters (Dry)":
    case "Chinese Starter":
      return UtensilsCrossed;
    case "Chat & Puri":
      return Tally1;
    case "North Indian Snacks":
      return ShoppingBag;
    case "Ramen & Corn Dogs":
    case "Continental":
      return Home;
    case "Rice Combos":
      return Package;
    case "Beverage":
    case "Shake":
    case "Thick Shake":
    case "Mojito":
      return CupSoda;
    case "Pizza":
      return Pizza;
    case "Sandwich":
    case "Burger":
      return Sandwich;
    case "Bakery Specials":
      return Cake;
    case "All":
      return Utensils;
    default:
      return Component;
  }
};

const getDietColor = (diet: string | ItemDiet) => {
  if (diet === "Veg") return "text-green-600";
  if (diet === "Egg") return "text-orange-500";
  if (diet === "Non-Veg") return "text-red-600";
  return "text-gray-500";
};

// Constant for the parcel fee
const BASE_PARCEL_FEE = 5.0;

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
  >("All");
  const [isVegFilterActive, setIsVegFilterActive] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("Dine-In");
  // 👈 NEW STATE for search term
  const [searchTerm, setSearchTerm] = useState("");

  // REMOVED: isSidebarOpen state (No mobile modal required)

  const [isModalOpen, setIsModalOpen] = useState(false);
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

    const scrollNext = () => {
      const { scrollLeft, clientWidth } = bannerContainer;
      const currentSlideIndex = Math.round(scrollLeft / clientWidth);
      const totalSlides = AD_BANNERS.length;

      let nextScrollPosition;

      if (currentSlideIndex >= totalSlides - 1) {
        nextScrollPosition = 0;
      } else {
        nextScrollPosition = scrollLeft + clientWidth;
      }

      bannerContainer.scrollTo({
        left: nextScrollPosition,
        behavior: "smooth",
      });
    };

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
          // Set initial category to 'All'
          const initialCategories = [
            "All",
            ...new Set(flatMenu.map((item) => item.category)),
          ].sort();
          if (initialCategories.length > 0) {
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
    setSearchTerm(""); // Clear search when navigating via banner
    // 2. Scroll the user down to the menu view (optional, but helpful)
    const menuSection = document.getElementById("menu-section");
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const categories = useMemo<(MenuCategory | "All")[]>(() => {
    const cats = new Set(menuItems.map((item) => item.category));
    return (["All", ...Array.from(cats)] as (MenuCategory | "All")[]).sort();
  }, [menuItems]);

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

  // --- FILTERED MENU ITEMS ---
  const displayedMenuItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return menuItems.filter((item) => {
      const categoryMatch =
        selectedCategory === "All" || item.category === selectedCategory;
      const vegMatch = !isVegFilterActive || item.diet === "Veg";
      // 👈 Search filter is now always applied
      const searchMatch =
        normalizedSearch === "" ||
        item.name.toLowerCase().includes(normalizedSearch);

      return categoryMatch && vegMatch && searchMatch;
    });
  }, [menuItems, selectedCategory, isVegFilterActive, searchTerm]); // 👈 Added searchTerm dependency

  // --- CART & TOTALS LOGIC ---
  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.qty, 0),
    [cart]
  );

  const totalParcelFee = useMemo(
    () => cart.reduce((totalFee, item) => totalFee + item.parcel * item.qty, 0),
    [cart]
  );

  const total = useMemo(
    () => subtotal + (orderType === "TakeAway" ? totalParcelFee : 0),
    [subtotal, totalParcelFee, orderType]
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

  // --- NEW SEARCH HANDLER ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Automatically set category to 'All' if a search term is entered
    if (value.trim() !== "" && selectedCategory !== "All") {
      setSelectedCategory("All");
    }
  };

  // --- RENDER ---

  // Function to render the quantity controls or the 'Add' button
  const renderQuantityControls = (it: Item, currentQty: number) => {
    if (currentQty > 0) {
      return (
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button
            className="h-8 w-8 rounded-full border border-gray-300 text-xl text-foreground hover:bg-gray-100 transition-colors flex items-center justify-center"
            onClick={() => updateQty(it.id, currentQty - 1)}
          >
            -
          </button>
          <span className="w-6 text-center text-lg font-bold">
            {currentQty}
          </span>
          <button
            className="h-8 w-8 rounded-full border border-[var(--primary)] bg-[var(--primary)] text-white text-xl hover:bg-[var(--primary-600)] transition-colors flex items-center justify-center"
            onClick={() => updateQty(it.id, currentQty + 1)}
          >
            +
          </button>
        </div>
      );
    } else {
      return (
        <button
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white transition-colors hover:bg-[var(--primary-600)] shadow-md mt-2 sm:mt-0"
          onClick={() => addToCart(it)}
        >
          Add
        </button>
      );
    }
  };

  return (
    <main className="px-4 py-6 md:px-6 md:py-8 max-w-7xl mx-auto pb-24">
      {/* HEADER: Removed hamburger button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--primary)]">
          Digital Menu
        </h1>
      </div>

      <p className="mt-2 text-foreground/60 hidden sm:block">
        Browse, customize, and checkout using the cart button below.
      </p>

      {/* --- SCROLLING AD BANNER --- (unchanged) */}
      <div
        ref={bannerRef}
        className="mt-6 mb-8 flex overflow-x-scroll snap-x snap-mandatory scrollbar-hide rounded-xl shadow-lg bg-gray-100"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {AD_BANNERS.map((ad) => (
          <div
            key={ad.id}
            onClick={() => handleAdClick(ad.targetCategory)}
            className="flex-shrink-0 w-full snap-center relative h-16 md:h-24 cursor-pointer"
            style={{
              backgroundImage: `url(${ad.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center p-2">
              <p className="text-white text-base md:text-xl font-extrabold text-center tracking-wide">
                {ad.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* --------------------------------- */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* --- LEFT SECTION: CATEGORY STRIP (Mobile/Tablet and Desktop) --- */}
        <aside className="lg:col-span-1 rounded-xl border border-gray-200 bg-white shadow-lg h-fit">
          <div className="hidden lg:block p-4 sticky top-6">
            {/* Desktop Vertical View */}
            <h2 className="text-xl font-bold pb-3 border-b border-gray-100 mb-2">
              Menu Sections
            </h2>
            <div className="flex flex-col gap-1 mt-3 max-h-[70vh] overflow-y-auto pr-2">
              {categories.map((cat) => {
                const IconComponent = getCategoryIcon(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSearchTerm(""); // Clear search on category change
                    }}
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
          </div>

          {/* Mobile/Small Tablet Horizontal Scroll Strip */}
          <div className="block lg:hidden p-3 border-b border-gray-200">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-lg font-bold">Categories</h2>
              {/* Veg Filter Switch - Mobile Header */}
              <div className="flex items-center space-x-2">
                <Leaf
                  className={`w-5 h-5 transition-colors ${
                    isVegFilterActive ? "text-green-600" : "text-gray-400"
                  }`}
                />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVegFilterActive}
                    onChange={(e) => setIsVegFilterActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full shadow-inner" />
                </label>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
              {categories.map((cat) => {
                const IconComponent = getCategoryIcon(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSearchTerm(""); // Clear search on category change
                    }}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 p-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                      selectedCategory === cat
                        ? "bg-[var(--primary)] text-white shadow-md"
                        : "bg-gray-100 text-foreground hover:bg-gray-200"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mb-1" />
                    <span className="text-center leading-tight">
                      {cat.replace(" ", "\n")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* --- RIGHT SECTION: MENU ITEMS AND CART --- */}
        <div className="lg:col-span-3 grid grid-cols-1 gap-8">
          {/* Middle: Menu Items (2/3 width) */}
          <section
            id="menu-section"
            className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-lg"
          >
            {/* START: Modified Header with Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground/80 mb-3 sm:mb-0">
                {selectedCategory || "All Items"}
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search item..."
                  value={searchTerm}
                  // 👈 UPDATED onChange HANDLER
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                />
              </div>
            </div>
            {/* END: Modified Header with Search Bar */}

            {/* List of Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
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
                      </div>
                    </div>

                    {/* Quantity Controls - Logic moved to a helper function */}
                    {renderQuantityControls(it, current)}
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
      </div>
      {/* --- FLOATING CART SHEET (Revised) --- */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white border-t-2 border-[var(--primary)] shadow-2xl transition-all duration-300">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-[var(--primary)]" />
              <span className="text-lg font-semibold text-foreground">
                {totalItemCount} Items
              </span>
            </div>
            {/* NEW: View Cart Button */}
            <button
              onClick={openModal}
              className="flex items-center justify-center px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-bold text-base shadow-md transition-colors hover:bg-[var(--primary-600)]"
            >
              View Cart <span className="ml-2">₹{total.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- ORDER MODAL / DIALOG BOX --- (Modal remains hidden until triggered) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 bg-opacity-60 backdrop-blur-sm transition-opacity">
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
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
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
