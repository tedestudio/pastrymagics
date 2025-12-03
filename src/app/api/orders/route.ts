import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  price: number;
  qty: number;
  item_parcel?: number;
};

export async function POST(req: Request) {
  if (!supabase) {
    console.error("Supabase client is not initialized.");
    return NextResponse.json(
      { error: "Supabase client not available" },
      { status: 500 }
    );
  }

  try {
    const { name, phone, tableNumber, isParcelOrder, items } = await req.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 }
      );
    }

    // Calculate total price including parcel fees for takeaway orders
    const total = items.reduce(
      (sum: number, item: OrderItem) => {
        const itemTotal = item.price * item.qty;
        const parcelFee = isParcelOrder && item.item_parcel ? item.item_parcel * item.qty : 0;
        return sum + itemTotal + parcelFee;
      },
      0
    );

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // 1️⃣ Upsert daily counter (atomic)
    const { data: counterRow, error: upsertError } = await supabase
      .from("daily_order_counter")
      .upsert(
        { order_date: today, counter: 1 }, // initial row if not exists
        { onConflict: "order_date" }
      )
      .select("counter")
      .single();

    if (upsertError || !counterRow) {
      console.error("Failed to get or create counter:", upsertError);
      return NextResponse.json(
        { error: "Could not generate order number" },
        { status: 500 }
      );
    }

    // 2️⃣ Atomically increment counter
    const { data: updatedRow, error: updateError } = await supabase
      .from("daily_order_counter")
      .update({ counter: counterRow.counter + 1 })
      .eq("order_date", today)
      .select()
      .single();

    if (updateError || !updatedRow) {
      console.error("Failed to increment counter:", updateError);
      return NextResponse.json(
        { error: "Could not generate order number" },
        { status: 500 }
      );
    }

    const orderNumber = `${today.replace(/-/g, "")}${String(
      updatedRow.counter
    ).padStart(3, "0")}`;

    // 3️⃣ Insert order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        name,
        phone,
        table_number: tableNumber,
        items,
        status: "placed",
        total,
        payment: "pay-at-counter",
      })
      .select("id, order_number")
      .single();

    if (orderError || !orderData) {
      console.error("Failed to place order:", orderError);
      return NextResponse.json(
        { error: "Could not place order" },
        { status: 500 }
      );
    }

    // 4️⃣ Send Notification
    try {
      const { messaging } = await import("@/lib/firebase-admin");
      await messaging.send({
        topic: "store_orders",
        notification: {
          title: "New Order Received!",
          body: `Order #${orderData.order_number} - ${name} (₹${total})`,
        },
        data: {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
        },
      });
    } catch (notifyError) {
      console.error("Failed to send notification:", notifyError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        id: orderData.id,
        orderNumber: orderData.order_number,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
