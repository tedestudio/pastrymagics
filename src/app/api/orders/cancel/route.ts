import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idOrNumber = searchParams.get("id");
  if (!idOrNumber)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );

  let queryBuilder = supabase.from("orders").select("id,created_at,status");

  // Check if the input is a valid UUID or an integer
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrNumber
    );
  const isInteger = /^\d+$/.test(idOrNumber);

  if (isUUID) {
    queryBuilder = queryBuilder.eq("id", idOrNumber);
  } else if (isInteger) {
    // Cast the string to an integer for the query
    queryBuilder = queryBuilder.eq("order_number", parseInt(idOrNumber));
  } else {
    return NextResponse.json(
      { error: "Invalid order ID format." },
      { status: 400 }
    );
  }

  const { data, error } = await queryBuilder.single();

  if (error || !data) {
    console.error("Order not found or database error:", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ageMs = Date.now() - new Date(data.created_at as string).getTime();
  if (ageMs > 30_000) {
    return NextResponse.json(
      { error: "Cancellation window expired" },
      { status: 400 }
    );
  }

  const { error: updErr } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", data.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
