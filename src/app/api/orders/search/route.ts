import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get("orderNumber");
  const phoneNumber = searchParams.get("phoneNumber");
  const date = searchParams.get("date"); // YYYY-MM-DD format

  if (!orderNumber || !phoneNumber || !date) {
    return NextResponse.json(
      { error: "Missing required search parameters." },
      { status: 400 }
    );
  }

  try {
    // Construct the date range for the query
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client is not initialized." },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderNumber)
      .eq("phone", phoneNumber)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Order not found with the provided details." },
        { status: 404 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("Error searching for order:", e);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
