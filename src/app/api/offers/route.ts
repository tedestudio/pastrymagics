
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {

  if (!supabase) {
    console.error("Supabase client is not initialized.");
    return NextResponse.json(
      { error: "Supabase client not available" },
      { status: 500 }
    );
  }
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
