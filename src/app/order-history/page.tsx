// app/order-history/page.tsx
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import OrderSearchForm from "./OrderSearchForm"; // We'll create this client component

// Define a type for your order data
type Order = {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
};

export default async function OrderHistoryPage() {
  const cookieStore = cookies();
  const orderHistoryCookie = (await cookieStore).get("order_history");
  const orderIds = orderHistoryCookie
    ? JSON.parse(orderHistoryCookie.value)
    : [];

  let orders: Order[] = [];
  if (orderIds.length > 0 && supabase) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, created_at, total")
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    if (!error) {
      orders = data as Order[];
    }
  }

  return (
    <main className="px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-4xl text-center">Order History</h1>
      <p className="text-center mt-2 text-foreground/70">
        Your recent orders are listed below.
      </p>

      {/* Manual search form */}
      <OrderSearchForm />

      <section className="mt-8">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg p-4 mb-4 shadow-sm"
            >
              <p className="text-lg font-semibold">
                Order #{order.order_number}
              </p>
              <p className="text-sm text-foreground/70">
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
              <p className="text-md font-medium mt-2">Total: ₹{order.total}</p>
              <Link
                href={`/order/${order.id}`}
                className="mt-2 inline-block text-[var(--primary)] underline"
              >
                View Order Details
              </Link>
            </div>
          ))
        ) : (
          <p className="text-center text-foreground/70">
            No past orders found.
          </p>
        )}
      </section>
    </main>
  );
}
