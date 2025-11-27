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

// // --- DUMMY AD DATA (Kept for completeness) ---
// --- OFFER TYPE ---
type Offer = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  target_category?: string; // Can be a MenuCategory or null
};

// --- ENUM TYPES (Kept for consistency) ---
type MenuCategory =
  | "Korean"
  | "Soups"
  | "Continental"
  | "Starters"
  | "Fried Rice"
  | "Noodles"
  | "Desi Delights"
  | "Pizza"
  | "Sandwich"
  | "Burgers"
  | "Quick Bytes"
  | "Shakes & Mojitos"
  | "Combos";

type ItemDiet = "Veg" | "Non-Veg";
type OrderType = "Dine-In" | "TakeAway";

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
export const getCategoryIcon = (category: string): React.ElementType => {
  switch (category) {
    case "Soups":
      return Soup;

    case "Shakes & Mojitos":
      return CupSoda; // Represents all cold drinks/shakes

    case "Pizza":
      return Pizza;

    case "Sandwich":
    case "Burger":
      return Sandwich; // Represents the handheld food group

    case "Quick Bytes":
      return Drumstick; // Represents quick finger food/fries

    case "Combos":
      return Package; // Represents a packaged meal/deal

    case "Desi Delights":
      return Tally1; // Represents street food/small portions

    case "Starters":
      return UtensilsCrossed; // Represents appetizers/dry items

    case "Noodles":
    case "Fried Rice":
      return ChevronsRight; // Represents main course grouping (Noodles/Rice)

    case "Korean":
    case "Continental":
      return Home; // Represents international/specialized cuisine sections

    case "All":
      return Utensils; // Default for all items

    default:
      return Component;
  }
};

const getDietColor = (diet: string | ItemDiet) => {
  if (diet === "Veg") return "text-green-600";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]); // NEW: Offers state

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
    if (!bannerRef.current || offers.length === 0) return;

    const bannerContainer = bannerRef.current;

    const scrollNext = () => {
      const { scrollLeft, clientWidth } = bannerContainer;
      const currentSlideIndex = Math.round(scrollLeft / clientWidth);
      const totalSlides = offers.length;

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
  }, [offers.length]);

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

      // Fetch Offers
      try {
        const res = await fetch("/api/offers");
        if (res.ok) {
          const data = await res.json();
          setOffers(data);
        }
      } catch {}
    })();
  }, []);

  // // --- BANNER INTERACTION HANDLER ---
  // --- BANNER INTERACTION HANDLER ---
  const handleAdClick = (targetCategory?: string) => {
    if (!targetCategory) return;
    // 1. Change the selected category
    // Verify if category exists in our list
    if (categories.includes(targetCategory as any)) {
        setSelectedCategory(targetCategory as MenuCategory);
        setSearchTerm(""); // Clear search when navigating via banner
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
      const searchMatch =
        normalizedSearch === "" ||
        item.name.toLowerCase().includes(normalizedSearch);

      return categoryMatch && vegMatch && searchMatch;
    });
  }, [menuItems, selectedCategory, isVegFilterActive, searchTerm]);

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
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <button
            className="h-6 w-6 rounded-full border border-gray-300 text-sm text-foreground hover:bg-gray-100 transition-colors flex items-center justify-center"
            onClick={() => updateQty(it.id, currentQty - 1)}
          >
            -
          </button>
          <span className="w-4 text-center text-sm font-bold">
            {currentQty}
          </span>
          <button
            className="h-6 w-6 rounded-full border border-[var(--primary)] bg-[var(--primary)] text-white text-sm hover:bg-[var(--primary-600)] transition-colors flex items-center justify-center"
            onClick={() => updateQty(it.id, currentQty + 1)}
          >
            +
          </button>
        </div>
      );
    } else {
      return (
        <button
          className="px-3 py-1 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white transition-colors hover:bg-[var(--primary-600)] shadow-md mt-1 sm:mt-0"
          onClick={() => addToCart(it)}
        >
          Add
        </button>
      );
    }
  };

  return (
    // 1. MAIN CONTAINER: Use h-screen and overflow-hidden to lock the viewport scroll.
    <main className="px-4 py-3 md:px-6 md:py-4 max-w-7xl mx-auto h-[90vh] lg:h-screen flex flex-col overflow-hidden">
      {/* HEADER: flex-shrink-0 */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl text-[var(--primary)]">Order at your Table</h1>
      </div>

      <p className="mt-1 text-foreground/60 hidden sm:block text-xs flex-shrink-0">
        Browse, customize, and checkout using the cart button below.
      </p>
      {offers.length > 0 && (
        <div
          ref={bannerRef}
          className="mt-3 mb-5 flex overflow-x-scroll snap-x snap-mandatory scrollbar-hide rounded-lg shadow-md bg-gray-100 flex-shrink-0"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {offers.map((ad) => (
            <div
              key={ad.id}
              onClick={() => handleAdClick(ad.target_category)}
              className="flex-shrink-0 w-full snap-center relative h-32 md:h-40 cursor-pointer"
              style={{
                backgroundImage: `url(${ad.image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-end justify-start p-4">
                <div>
                    <p className="text-lg md:text-xl font-extrabold text-white tracking-wide drop-shadow-md">
                    {ad.title}
                    </p>
                    <p className="text-xs md:text-sm text-white/90 font-medium drop-shadow-md">
                        {ad.description}
                    </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. MIDDLE CONTENT GRID: Use flex-grow and overflow-y-hidden */}
      <div
        id="menu-section-container"
        className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-grow overflow-y-hidden py-8"
      >
        {/* --- LEFT SECTION: CATEGORY STRIP (Desktop Sidebar) --- */}
        <aside className="lg:col-span-1 rounded-lg border border-gray-200 bg-white shadow-md h-full flex flex-col">
          <div className="hidden p-3 h-full lg:flex flex-col">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-base font-bold">Categories</h2>
              <div className="flex items-center space-x-1 text-sm">
                <p>Veg Only</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVegFilterActive}
                    onChange={(e) => setIsVegFilterActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-300 rounded-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-3 after:w-3 after:rounded-full after:transition-all peer-checked:after:translate-x-4 shadow-inner" />
                </label>
              </div>
            </div>
            {/* Category List: Use flex-grow and overflow-y-auto to allow scrolling */}
            <div className="flex flex-col gap-1 mt-1 overflow-y-auto flex-grow pr-1">
              {categories.map((cat) => {
                const IconComponent = getCategoryIcon(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSearchTerm("");
                    }}
                    className={`flex items-center space-x-2 p-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedCategory === cat
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "text-foreground hover:bg-gray-50 hover:text-[var(--primary)]"
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile/Small Tablet Horizontal Scroll Strip - flex-shrink-0 */}
          <div className="block lg:hidden p-2 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold">Categories</h2>
              <div className="flex items-center space-x-1">
                <p className="text-xs">Veg Only</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVegFilterActive}
                    onChange={(e) => setIsVegFilterActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-300 rounded-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-3 after:w-3 after:rounded-full after:transition-all peer-checked:after:translate-x-4 shadow-inner" />
                </label>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
              {categories.map((cat) => {
                const IconComponent = getCategoryIcon(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSearchTerm("");
                    }}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-14 p-1 rounded-lg text-[10px] font-medium transition-all duration-200 leading-tight ${
                      selectedCategory === cat
                        ? "bg-[var(--primary)] text-white shadow-md"
                        : "bg-gray-100 text-foreground hover:bg-gray-200"
                    }`}
                  >
                    <IconComponent className="w-3 h-3 mb-0.5" />
                    <span className="text-center leading-tight">
                      {cat.replace(" ", "\n")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* --- RIGHT SECTION: MENU ITEMS (Main Content) --- */}
        <div className="lg:col-span-3 h-full overflow-y-auto">
          {/* Menu Items Section: h-full and flex-col */}
          <section
            id="menu-section"
            className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 shadow-md h-full flex flex-col"
          >
            {/* Header/Search: flex-shrink-0 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-2 mb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-foreground/80 mb-2 sm:mb-0">
                {selectedCategory || "All Items"}
              </h2>
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search item..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                />
              </div>
            </div>

            {/* List of Items: Crucial: flex-grow and overflow-y-auto to enable scrolling */}
            <div className="overflow-y-auto pr-1 space-y-6">
              {/* Veg Section */}
              <div className="space-y-2">
                <p>Veg</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {displayedMenuItems
                    .filter((item) => item.diet === "Veg")
                    .map((it) => {
                      const current =
                        cart.find((c) => c.id === it.id)?.qty ?? 0;
                      const dietColor = getDietColor(it.diet);
                      const IconComponent = Leaf;

                      return (
                        <div
                          key={it.id}
                          className="flex flex-row items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white p-2 transition-all duration-200 shadow-sm hover:shadow-md max-h-24"
                        >
                          <div className="flex items-center gap-2 flex-grow">
                            <img
                              src={it.image}
                              alt={it.name}
                              className="h-20 w-20 rounded-md object-cover border border-gray-200 flex-shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-xs flex items-center gap-1">
                                {it.name}
                                <span className="opacity-50">*</span>
                                <IconComponent
                                  className={`w-3 h-3 ${dietColor}`}
                                />
                              </p>
                              <p className="text-xs font-medium text-foreground/80 mt-0.5">
                                ₹{it.price.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {renderQuantityControls(it, current)}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Separator Line */}
              <hr className="border-t border-gray-300 my-2" />
              {/* Non-Veg Section */}
              {!isVegFilterActive && (
                <div className="space-y-2">
                  <p>Non-Veg</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {displayedMenuItems
                      .filter((item) => item.diet === "Non-Veg")
                      .map((it) => {
                        const current =
                          cart.find((c) => c.id === it.id)?.qty ?? 0;
                        const dietColor = getDietColor(it.diet);
                        const IconComponent = Leaf;

                        return (
                          <div
                            key={it.id}
                            className="flex flex-row items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white p-2 transition-all duration-200 shadow-sm hover:shadow-md max-h-24"
                          >
                            <div className="flex items-center gap-2 flex-grow">
                              <img
                                src={it.image}
                                alt={it.name}
                                className="h-20 w-20 rounded-md object-cover border border-gray-200 flex-shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-xs flex items-center gap-1">
                                  {it.name}
                                  <span className="opacity-50">*</span>
                                  <IconComponent
                                    className={`w-3 h-3 ${dietColor}`}
                                  />
                                </p>
                                <p className="text-xs font-medium text-foreground/80 mt-0.5">
                                  ₹{it.price.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {renderQuantityControls(it, current)}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* No Items Message */}
              {displayedMenuItems.length === 0 && (
                <p className="text-center text-foreground/60 p-6 border rounded-lg text-xs">
                  No items found in this section or matching your filters.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
      {/* 3. FLOATING CART SHEET - fixed position, flex-shrink-0 */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-2 bg-white border-t-2 border-[var(--primary)] shadow-2xl flex-shrink-0">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
              <span className="text-sm font-semibold text-foreground">
                {totalItemCount} Items
              </span>
            </div>
            <button
              onClick={openModal}
              className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white font-bold text-xs shadow-md transition-colors hover:bg-[var(--primary-600)]"
            >
              View Cart <span className="ml-1.5">₹{total.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- ORDER MODAL / DIALOG BOX --- (Modal remains hidden until triggered) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 bg-opacity-60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-lg shadow-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto transform transition-transform duration-300 scale-100">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h2 className="text-lg font-bold text-[var(--primary)]">
                Complete Your Order
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Item Review & Modification - h3 reduced */}
            <h3 className="text-sm font-semibold mb-2 border-b pb-1">
              Items ({totalItemCount})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
              {cart.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 border-b border-dashed border-gray-100 pb-1 last:border-b-0"
                >
                  <div className="flex-grow">
                    <p className="font-medium text-xs">{c.name}</p>
                    <p className="text-[10px] text-foreground/60">
                      @ ₹{c.price.toFixed(2)}
                      {c.parcel > 0 && orderType === "TakeAway" && (
                        <span> (+₹{c.parcel.toFixed(0)} Parcel)</span>
                      )}
                    </p>
                  </div>

                  {/* Quantity Controls in Modal - size reduced */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      className="h-4 w-4 rounded-full border border-gray-300 text-xs text-foreground hover:bg-gray-100 transition-colors flex items-center justify-center"
                      onClick={() => updateQty(c.id, c.qty - 1)}
                    >
                      -
                    </button>
                    <span className="w-3 text-center text-xs font-bold">
                      {c.qty}
                    </span>
                    <button
                      className="h-4 w-4 rounded-full border border-gray-300 text-xs text-foreground hover:bg-gray-100 transition-colors flex items-center justify-center"
                      onClick={() => updateQty(c.id, c.qty + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="font-bold text-xs text-[var(--primary)] flex-shrink-0 w-10 text-right">
                    ₹
                    {(
                      c.price * c.qty +
                      (orderType === "TakeAway" ? c.parcel * c.qty : 0)
                    ).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Order Type Selector - text size reduced */}
            <div className="mb-3 pt-2 border-t">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Service Option:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrderType("Dine-In")}
                  className={`flex items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all border-2 ${
                    orderType === "Dine-In"
                      ? "bg-green-500 text-white border-green-500 shadow-sm"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Home className="w-3 h-3 mr-1" /> Dine-In
                </button>
                <button
                  onClick={() => setOrderType("TakeAway")}
                  className={`flex items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all border-2 ${
                    orderType === "TakeAway"
                      ? "bg-red-500 text-white border-red-500 shadow-sm"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Package className="w-3 h-3 mr-1" /> TakeAway
                </button>
              </div>
            </div>

            {/* 3. Financial Summary - text size reduced */}
            <div className="space-y-1 py-3 border-t border-b mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-bold">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span
                  className={`transition-colors ${
                    orderType === "TakeAway"
                      ? "font-medium text-red-500"
                      : "text-gray-400 hidden"
                  }`}
                >
                  Parcel Fee ({totalItemCount})
                </span>
                <span
                  className={`font-bold transition-colors ${
                    orderType === "TakeAway"
                      ? "text-red-500"
                      : "text-gray-400 hidden"
                  }`}
                >
                  + ₹{totalParcelFee.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold">Grand Total</span>
                <span className="font-extrabold text-lg text-[var(--primary)]">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* 4. Customer Details & Validation (Simplified) - input size reduced */}
            <div className="grid grid-cols-1 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  setTouched((p) => ({ ...p, name: true }));
                  setFormErrors(validateForm());
                }}
                placeholder="Your Name"
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs w-full"
              />
              {touched.name && formErrors.name && (
                <p className="text-red-500 text-[10px]">{formErrors.name}</p>
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
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs w-full"
              />
              {touched.phone && formErrors.phone && (
                <p className="text-red-500 text-[10px]">{formErrors.phone}</p>
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
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs w-full bg-white"
                  >
                    <option value="">Select Table Number</option>
                    {tableNumbers.map((num) => (
                      <option key={num} value={num}>{`Table ${num}`}</option>
                    ))}
                  </select>
                  {touched.table && formErrors.table && (
                    <p className="text-red-500 text-[10px]">
                      {formErrors.table}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id="consent-modal"
                  checked={consentChecked}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked);
                    setFormErrors(validateForm());
                  }}
                  className="h-3 w-3 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label
                  htmlFor="consent-modal"
                  className="text-[10px] text-foreground/70"
                >
                  I agree to store my details for order tracking.
                </label>
              </div>
              {formErrors.consent && (
                <p className="text-red-500 text-[10px] mt-0.5">
                  {formErrors.consent}
                </p>
              )}
              {formErrors.cart && (
                <p className="text-red-500 text-[10px] mt-0.5">
                  {formErrors.cart}
                </p>
              )}
            </div>

            {/* 5. Place Order Button - size reduced */}
            <button
              onClick={placeOrder}
              disabled={placing || !isFormValid}
              className={`mt-4 w-full px-3 py-2 rounded-lg text-white text-sm font-bold transition-all shadow-lg flex items-center justify-center ${
                isFormValid
                  ? "bg-[var(--primary)] hover:bg-[var(--primary-600)]"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {placing ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" /> Confirm & Pay at
                  Counter
                </>
              )}
            </button>
          </div>
        </div>
      )}
      <p className="text-xs">
        * Images are for illustration purpose only. Original quantity and food
        may vary.
      </p>
    </main>
  );
}
