import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  // Correctly destructure all fields from the client-side request
  const {
    name,
    phone,
    price,
    referenceImage,
    weightKg,
    icing,
    flavour,
    cakeType,
    shape,
    message,
    withEgg,
    photoCount,
    toys
  } = await req.json();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client not initialized" },
      { status: 500 }
    );
  }

  try {
    // Collect all customization details into a single object for the JSONB column
    const customization = {
      weightKg,
      icing,
      flavour,
      cakeType,
      shape,
      message,
      withEgg,
      photoCount,
      toys
    };

    // Insert the data into the 'cakes' table, matching the schema
    const { data, error } = await supabase
      .from("cakes")
      .insert({
        name,
        phone,
        total_price: price, // Renamed 'price' to 'total_price' to match your schema
        reference_image_url: referenceImage, // Renamed 'image' to 'reference_image_url'
        customization, // Insert the entire object into the JSONB column
      })
      .select(); // Add .select() to get back data

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // The data returned from Supabase is an array, return the first item's ID
    return NextResponse.json({ id: data[0].id }, { status: 201 });
  } catch (error) {
    console.error("Failed to add cake:", error);
    return NextResponse.json({ error: "Failed to add cake" }, { status: 500 });
  }
}
