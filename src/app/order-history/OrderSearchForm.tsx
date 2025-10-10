"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderSearchForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [date, setDate] = useState("");
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phoneNumber.trim() || !date.trim()) {
      alert("Please fill in all search fields.");
      return;
    }

    try {
      const res = await fetch(
        `/api/orders/search?orderNumber=${orderNumber}&phoneNumber=${phoneNumber}&date=${date}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error);
        return;
      }

      const data = await res.json();
      router.push(`/order/${data.id}`);
    } catch (error) {
      alert("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Find an Order</h2>
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-4 p-4 rounded-md border border-[var(--muted)]"
      >
        <div>
          <label
            htmlFor="order-number"
            className="block text-sm font-medium mb-1"
          >
            Order Number
          </label>
          <input
            id="order-number"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g., 123"
            className="w-full rounded-md border border-[var(--muted)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="phone-number"
            className="block text-sm font-medium mb-1"
          >
            Phone Number
          </label>
          <input
            id="phone-number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 9876543210"
            className="w-full rounded-md border border-[var(--muted)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="order-date"
            className="block text-sm font-medium mb-1"
          >
            Order Date
          </label>
          <input
            id="order-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-[var(--muted)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 rounded-md bg-[var(--primary)] text-white text-sm hover:bg-[var(--primary-600)]"
        >
          Search Order
        </button>
      </form>
    </div>
  );
}
