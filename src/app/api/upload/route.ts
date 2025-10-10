import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const { dataUrl } = await req.json();

  if (!dataUrl) {
    return NextResponse.json(
      { error: "No image data provided" },
      { status: 400 }
    );
  }

  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // Extract file extension from dataUrl
  const fileExtension = dataUrl.substring(
    "data:image/".length,
    dataUrl.indexOf(";base64")
  );

  const fileName = `${uuidv4()}.${fileExtension}`;

  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized.");
    }

    const { error } = await supabase.storage
      .from("cake-images")
      .upload(fileName, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const publicUrl = supabase.storage
      .from("cake-images")
      .getPublicUrl(fileName).data.publicUrl;

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    console.error("Error uploading image:", e);
    return NextResponse.json(
      { error: "Failed to upload image." },
      { status: 500 }
    );
  }
}
