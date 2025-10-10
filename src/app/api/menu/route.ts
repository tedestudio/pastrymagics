import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!supabase) return NextResponse.json([], { status: 200 });
  const { data, error } = await supabase
    .from("menu")
    .select("id,name,price,description,image_url,is_available")
    .eq("is_available", true)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}


