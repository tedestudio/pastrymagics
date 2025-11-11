import { NextResponse } from "next/server";
// Ensure this path is correct for your project
import { supabase } from "@/lib/supabase";

// =====================================================================
// 1. Typescript Interface for Input Payload
// =====================================================================

interface CakePayload {
  name: string;
  phone: string;
  price: number;
  referenceImage: string | null;
  weightKg: number | null;
  icing: string | null;
  flavour: string | null;
  cakeType: string | null;
  shape: string | null;
  message: string | null; // Customer-facing message on the cake
  withEgg: boolean;
  photoCount: number | null;
  toys: string | null;
  flowers: string | null;
  deliveryTimestamp: string; // ISO 8601 string
  chefNotes: string | null; // NEW: Internal notes for the chef/baker
}

// =====================================================================
// 2. Core Logic for Inserting/Updating Cake Data
// =====================================================================

const upsertCake = async (id: string | null, payload: CakePayload) => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  // Destructure all payload fields
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
    chefNotes, // Included new field
  } = payload;

  // Collect all customization details for the JSONB column
  const customization = {
    weightKg,
    icing,
    flavour,
    cakeType,
    shape,
    message, // Customer message remains in customization
    withEgg,
    photoCount,
    toys,
    flowers,
    chef_notes: chefNotes, // NEW: Separate column for internal notes
  };

  // Map to snake_case for Supabase database columns
  const dataToUpsert = {
    name,
    phone,
    total_price: price,
    reference_image_url: referenceImage,
    delivery_time: deliveryTimestamp,
    customization, // JSONB column
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
// 3. API Route Handlers (POST, PUT, GET)
// =====================================================================

// Handler for creating a NEW cake configuration (Initial Save)
export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client not initialized" },
      { status: 500 }
    );
  }

  // Assuming the incoming JSON structure matches CakePayload
  const payload: CakePayload = await req.json();

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

// Handler for updating an EXISTING cake configuration (Editing)
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

  // Assuming the incoming JSON structure matches CakePayload
  const payload: CakePayload = await req.json();

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

// Handler to fetch existing data
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
    // Select all necessary fields, including the new chef_notes
    const { data, error } = await supabase
      .from("cakes")
      .select(
        `
            id, 
            name, 
            phone, 
            total_price, 
            reference_image_url, 
            delivery_time, 
            customization,
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
