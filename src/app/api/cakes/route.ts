import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Define the core logic for inserting/updating the cake data
const upsertCake = async (id: string | null, payload: any) => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

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
    flowers,
    deliveryTimestamp,
    filling,
  } = payload;

  // Collect all customization details for the JSONB column
  const customization = {
    weightKg,
    icing,
    flavour,
    filling,
    cakeType,
    shape,
    message,
    withEgg,
    photoCount,
    toys,
    flowers,
  };

  const dataToUpsert = {
    name,
    phone,
    total_price: price,
    reference_image_url: referenceImage,
    delivery_time: deliveryTimestamp,
    customization,
  };

  if (id) {
    // === PUT (UPDATE) LOGIC ===
    return await supabase
      .from("cakes")
      .update(dataToUpsert)
      .eq("id", id)
      .select();
  } else {
    // === POST (CREATE) LOGIC ===
    return await supabase.from("cakes").insert(dataToUpsert).select();
  }
};

// =====================================================================
// API Route Handlers
// =====================================================================

// 1. Handler for creating a NEW cake configuration (Initial Save)
export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client not initialized" },
      { status: 500 }
    );
  }

  const payload = await req.json();

  try {
    const { data, error } = await upsertCake(null, payload);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the ID of the newly created entry
    return NextResponse.json({ id: data[0].id }, { status: 201 });
  } catch (error) {
    console.error("Failed to add cake:", error);
    return NextResponse.json({ error: "Failed to add cake" }, { status: 500 });
  }
}

// 2. Handler for updating an EXISTING cake configuration (Editing)
export async function PUT(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client not initialized" },
      { status: 500 }
    );
  }

  // Get the ID from the query string (e.g., /api/cakes?id=uuid)
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing configuration ID for update." },
      { status: 400 }
    );
  }

  const payload = await req.json();

  try {
    const { data, error } = await upsertCake(id, payload);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the ID of the updated entry
    return NextResponse.json({ id: data[0].id }, { status: 200 });
  } catch (error) {
    console.error("Failed to update cake:", error);
    return NextResponse.json(
      { error: "Failed to update cake" },
      { status: 500 }
    );
  }
}

// 3. (Optional) Handler to fetch existing data if the user reloads the page with the ID in the URL
export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client not initialized" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing configuration ID for fetch." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("cakes")
      .select(
        `
            id, name, phone, total_price, reference_image_url, delivery_time, customization
        `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json(
        { error: "Configuration not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch cake:", error);
    return NextResponse.json(
      { error: "Failed to fetch cake" },
      { status: 500 }
    );
  }
}
