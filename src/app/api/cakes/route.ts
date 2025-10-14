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
    toys,
    flowers, // Added flowers (was missing but used in UI)
    deliveryTimestamp, // ✨ NEW FIELD ADDED HERE
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
      toys,
      flowers, // Included flowers in customization
    };

    // Determine the field for delivery date/time.
    // If your 'cakes' table has a separate column (e.g., 'delivery_time' as TIMESTAMP), use it.
    // Assuming a separate 'delivery_time' column for easy querying:

    // Insert the data into the 'cakes' table, matching the schema
    const { data, error } = await supabase
      .from("cakes")
      .insert({
        name,
        phone,
        total_price: price, // Renamed 'price' to 'total_price'
        reference_image_url: referenceImage, // Renamed 'image' to 'reference_image_url'
        delivery_time: deliveryTimestamp, // ✨ MAPPED NEW FIELD
        customization, // Insert the entire customization object (JSONB)
      })
      .select();

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
