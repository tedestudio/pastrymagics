import { supabase } from "@/lib/supabase";

export default async function CustomiseById({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  if (!supabase) {
    return (
      <main className="px-4 py-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Cake Not Found</h1>
        <p className="mt-2 text-foreground/70">Supabase is not configured.</p>
      </main>
    );
  }

  // Fetch from the new schema
  const { data, error } = await supabase
    .from("cakes")
    .select(
      "id,name,phone,customization,reference_image_url,created_at,total_price"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <main className="px-4 py-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Cake Not Found</h1>
        <p className="mt-2 text-foreground/70">Please check your link.</p>
      </main>
    );
  }

  // Destructure customization details
  const {
    weightKg,
    icing,
    flavour,
    cakeType,
    shape,
    message,
    withEgg,
    photoCount,
  } = data.customization;

  return (
    <main className="px-4 py-6 max-w-5xl mx-auto">
      <h1 className="text-3xl md:text-4xl">Saved Cake</h1>
      <p className="text-foreground/70 mt-1">
        for {data.name} • {data.phone}
      </p>

      <section className="mt-6 rounded-2xl border border-[var(--muted)] bg-white p-4 md:p-6">
        <h2 className="text-lg font-semibold">Details</h2>
        <div className="mt-2 text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>Weight: {weightKg}kg</div>
          <div>Icing: {icing}</div>
          <div>Flavour: {flavour}</div>
          <div>Type: {cakeType}</div>
          <div>Shape: {shape}</div>
          {message && <div>Text: {message}</div>}
          <div>Egg Status: {withEgg ? "With Egg" : "Eggless"}</div>
          {photoCount > 0 && <div>Photo Count: {photoCount}</div>}
          <div>Total Price: ₹{data.total_price}</div>
        </div>
        {data.reference_image_url && (
          <div className="mt-4">
            <p className="text-sm font-medium">Design reference</p>
            <img
              src={data.reference_image_url}
              alt="Design reference"
              className="mt-2 max-h-60 rounded-md border border-[var(--muted)]"
            />
          </div>
        )}
      </section>
    </main>
  );
}
