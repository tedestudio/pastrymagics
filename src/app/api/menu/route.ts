import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Define the custom ENUM types from your new schema for strict typing
// Note: In a real Next.js/TypeScript project, you'd typically import these
// types from a shared utility or generated file.

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

// Extend the API response type to ensure consistency
type MenuItemApiResponse = {
  id: string;
  name: string;
  price: string | number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  category: MenuCategory; // Use the ENUM type
  diet: ItemDiet; // Use the ENUM type
  stock_quantity: number | null;
  parcel: number | string | null;
};

export async function GET() {
  if (!supabase) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabase
    .from("menu")
    .select(
      // The select statement is correct:
      "id, name, price, description, image_url, is_available, category, diet, stock_quantity, parcel"
    )
    .eq("is_available", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 🧩 Normalize & group by category
  const groupedMenu = ((data as MenuItemApiResponse[]) ?? []).reduce(
    (acc, item) => {
      // The category value pulled from the DB is guaranteed to be a valid string
      // defined in the ENUM, so we use it directly.
      const category = item.category;

      if (!acc[category]) acc[category] = [];

      acc[category].push({
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        description: item.description ?? "",
        image_url: item.image_url ?? "/logo.png",

        // Diet and Category values are now strictly typed strings from the DB
        diet: item.diet,
        category: item.category,

        stock_quantity: item.stock_quantity ?? 0,
        is_available: item.is_available,
        // Parcel value is converted to a number
        parcel: Number(item.parcel) || 0,
      });
      return acc;
    },
    {} as Record<MenuCategory, any[]>
  ); // Use the ENUM type for the accumulator keys

  return NextResponse.json(groupedMenu);
}
