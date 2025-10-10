"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  price: number;
  image: string;
  stock_quantity: number;
};
type CartItem = Item & { qty: number };

type MenuItemApiResponse = {
  id: string;
  name: string;
  price: string | number; // Assuming price might be a string from the DB
  image_url: string;
  stock_quantity: number;
};

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

  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    table: false,
    consent: false,
  });

  const [formErrors, setFormErrors] = useState({
    name: "",
    phone: "",
    table: "",
    cart: "",
    consent: "",
  });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("table");
    if (t) setTable(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/menu");
        if (res.ok) {
          const data = await res.json();
          const mapped: Item[] = (data || []).map((m: MenuItemApiResponse) => ({
            id: m.id,
            name: m.name,
            price: Number(m.price) || 0,
            image: m.image_url || "/logo.png",
            stock_quantity: m.stock_quantity,
          }));
          setMenuItems(mapped);
        }
      } catch { }
    })();
  }, []);

  const validateForm = () => {
    const newErrors = {
      name: "",
      phone: "",
      table: "",
      cart: "",
      consent: "",
    };

    if (!name.trim()) {
      newErrors.name = "Name is required.";
    }
    const phonePattern = /^\d{10}$/;
    if (!phone.trim() || !phonePattern.test(phone.trim())) {
      newErrors.phone = "A valid 10-digit phone number is required.";
    }
    if (!table.trim()) {
      newErrors.table = "Please select a table number.";
    }
    if (cart.length === 0) {
      newErrors.cart = "Please add items to your order.";
    }
    if (!consentChecked) {
      newErrors.consent = "You must agree to store your details.";
    }

    return newErrors;
  };

  // The total now also checks if the cart is not empty
  const total = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.qty, 0),
    [cart]
  );

  const isFormValid = useMemo(() => {
    return (
      !formErrors.name &&
      !formErrors.phone &&
      !formErrors.table &&
      !formErrors.cart &&
      !formErrors.consent &&
      cart.length > 0 // This is the new condition
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

  async function placeOrder() {
    const errors = validateForm();
    setFormErrors(errors);
    setTouched({
      name: true,
      phone: true,
      table: true,
      consent: true,
    });

    // Check using freshly computed errors
    const hasErrors = Object.values(errors).some((err) => err !== "");
    if (hasErrors) {
      return; // stop placing order
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          tableNumber: table,
          items: cart.map(({ id, name, price, qty }) => ({
            id,
            name,
            price,
            qty,
          })),
        }),
      });
      if (!res.ok) throw new Error("Order failed");
      const data = await res.json();
      setCreatedOrderId(data.id);
      setCart([]);
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

  return (
    <main className="px-4 py-6 max-w-6xl mx-auto">
      <h1 className="text-3xl md:text-4xl text-center">Order at the Table</h1>
      <p className="text-center mt-2 text-foreground/70">
        Add items and choose Pay at Counter. Your order will be saved with a
        link.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu */}
        <section className="lg:col-span-2 rounded-2xl border border-[var(--muted)] bg-white p-4 md:p-6">
          <h2 className="text-lg font-semibold">Menu</h2>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {menuItems.map((it) => {
              const current = cart.find((c) => c.id === it.id)?.qty ?? 0;
              return (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--muted)] bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={it.image}
                      alt={it.name}
                      className="h-14 w-14 rounded-md object-cover border border-[var(--muted)] bg-[var(--muted)]/40"
                    />
                    <div>
                      <p className="font-medium">{it.name}</p>
                      <p className="text-xs text-foreground/60">₹{it.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="h-8 w-8 rounded-md border"
                      onClick={() => updateQty(it.id, Math.max(0, current - 1))}
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm">{current}</span>
                    <button
                      className="h-8 w-8 rounded-md border"
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
          </div>
        </section>

        {/* Cart and details */}
        <section className="rounded-2xl border border-[var(--muted)] bg-white p-4 md:p-6">
          <h2 className="text-lg font-semibold">Your Order</h2>
          <div className="mt-3 space-y-3">
            {cart.length === 0 && (
              <p className="text-sm text-foreground/60">No items yet.</p>
            )}
            {cart.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-foreground/60">₹{c.price} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-8 w-8 rounded-md border"
                    onClick={() => updateQty(c.id, c.qty - 1)}
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-sm">{c.qty}</span>
                  <button
                    className="h-8 w-8 rounded-md border"
                    onClick={() => updateQty(c.id, c.qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <hr className="my-4" />
          <div className="flex items-center justify-between">
            <span className="text-sm">Subtotal</span>
            <span className="font-semibold">₹{total}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                placeholder="Your name"
                className="rounded-md border border-[var(--muted)] px-3 py-2 text-sm w-full"
              />
              {touched.name && formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                placeholder="Phone number"
                type="tel"
                className="rounded-md border border-[var(--muted)] px-3 py-2 text-sm w-full"
              />
              {touched.phone && formErrors.phone && (
                <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Table Number:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {tableNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setTable(num);
                      setTouched((p) => ({ ...p, table: true }));
                    }}
                    className={`p-3 rounded-md text-sm font-semibold transition-colors duration-200 ${table === num
                        ? "bg-[var(--primary)] text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              {touched.table && formErrors.table && (
                <p className="text-red-500 text-xs mt-1">{formErrors.table}</p>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="consent-checkbox"
                checked={consentChecked}
                onChange={(e) => {
                  setConsentChecked(e.target.checked);
                  setTouched((p) => ({ ...p, consent: true }));
                }}
                className="h-4 w-4"
              />
              <label
                htmlFor="consent-checkbox"
                className="text-sm text-foreground/70"
              >
                I agree to store my name and phone number for order tracking.
              </label>
            </div>
            {touched.consent && formErrors.consent && (
              <p className="text-red-500 text-xs mt-1">{formErrors.consent}</p>
            )}
          </div>

          <button
            onClick={placeOrder}
            disabled={placing || !isFormValid}
            className={`mt-4 w-full px-4 py-2 rounded-full text-white text-sm ${isFormValid
                ? "bg-[var(--primary)] hover:bg-[var(--primary-600)]"
                : "bg-gray-400 cursor-not-allowed"
              }`}
          >
            {placing ? "Placing..." : "Place Order"}
          </button>

          {formErrors.cart && (
            <p className="text-red-500 text-sm mt-2">{formErrors.cart}</p>
          )}

          {createdOrderId && (
            <div className="mt-4 rounded-md border border-[var(--muted)] p-3 text-sm">
              <p className="font-medium">Order created</p>
              <p className="mt-1">Redirecting to tracking...</p>
              <Link
                className="text-[var(--primary)] underline"
                href={`/order/${createdOrderId}`}
              >{`${typeof window !== "undefined" ? window.location.origin : ""
                }/order/${createdOrderId}`}</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}