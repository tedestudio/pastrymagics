import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import QRCode from "qrcode";

// Interface for Customization (Updated to handle complex types for toys/flowers)
interface Customization {
  weightKg: number;
  icing: string;
  flavour: string;
  cakeType: string;
  shape: string;
  message?: string;
  withEgg: boolean;
  photoCount?: number;
  filling?: string;
  toys?: Record<string, number> | string | null; // Can be object (e.g., {"Edible": 6}) or string
  flowers?: number | string | null; // Can be number (e.g., 3) or string
  chef_notes?: string | null;
}

// Interface for the full data object fetched from Supabase
interface CakeData {
  id: string;
  name: string;
  phone: string;
  customization: Customization | string;
  reference_image_url: string | null;
  created_at: string;
  total_price: number;
  delivery_time: string;
}

export default async function CustomiseById({
  params,
}: {
  params: Promise<{ id: string }>;
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

  // Fetch full record from Supabase
  const { data, error } = await supabase
    .from("cakes")
    .select(
      "id,name,phone,customization,reference_image_url,created_at,total_price,delivery_time"
    )
    .eq("id", id)
    .single<CakeData>();

  if (error || !data) {
    return (
      <main className="px-4 py-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Cake Not Found</h1>
        <p className="mt-2 text-foreground/70">
          Please check your link. Error: {error?.message}
        </p>
      </main>
    );
  }

  // Ensure customization is an object (not JSON string)
  const customization: Customization =
    typeof data.customization === "string"
      ? JSON.parse(data.customization)
      : data.customization;

  // Destructure all fields
  const {
    weightKg,
    icing,
    flavour,
    cakeType,
    shape,
    message,
    withEgg,
    photoCount,
    filling,
    toys,
    flowers,
    chef_notes,
  } = customization;

  const deliveryTime = new Date(data.delivery_time);

  // --- ROBUST DATA FORMATTING LOGIC ---

  // 1. Format TOYS (handles object: {"Type": count}, string, or null)
  let formattedToys: string | null = null;
  if (typeof toys === "object" && toys !== null) {
    formattedToys = Object.entries(toys)
      .map(([key, value]) => `${value} x ${key}`)
      .join(", ");
  } else if (typeof toys === "string" && toys.trim().length > 0) {
    formattedToys = toys;
  }
  const isToysValid = !!formattedToys;

  // 2. Format FLOWERS (handles number, string, or null)
  let formattedFlowers: string | null = null;
  if (typeof flowers === "number" && flowers > 0) {
    formattedFlowers = `${flowers} piece${flowers > 1 ? "s" : ""}`;
  } else if (typeof flowers === "string" && flowers.trim().length > 0) {
    formattedFlowers = flowers;
  }
  const isFlowersValid = !!formattedFlowers;

  // 3. Chef Notes validation
  const isChefNotesValid =
    chef_notes &&
    typeof chef_notes === "string" &&
    chef_notes.trim().length > 0;

  // Build an absolute origin on the server — do not use `window` (not available during SSR).
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const link = `${origin}/customise/${data.id}`;

  let qr = "";
  try {
    qr = await QRCode.toDataURL(link, { margin: 1, width: 160 });
  } catch (e) {
    // If QR generation fails, keep qr empty and continue rendering (we'll show a fallback UI).
    qr = "";
    // eslint-disable-next-line no-console
    console.error("QR generation failed:", e);
  }
  return (
    <main className="px-4 py-6 max-w-5xl mx-auto">
      {/* --- HEADER --- */}
      <h1 className="text-3xl md:text-4xl font-bold text-pink-700">
        Cake Booking
      </h1>
      <p className="text-foreground/70 mt-1">
        for <strong>{data.name}</strong> • {data.phone}
      </p>
      <p className="text-foreground/70 mt-1 text-sm">
        Booked on: {format(new Date(data.created_at), "MMM dd, yyyy (hh:mm a)")}
      </p>

      {/* --- DELIVERY, PRICE & QR CODE (COMBINED) --- */}
      <section className="mt-6 p-4 md:p-6 bg-pink-50 rounded-2xl border border-pink-200 shadow-lg">
        <h2 className="text-xl font-bold text-pink-800">Order Summary</h2>

        {/* Updated grid to include the QR code */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Price */}
          <div className="p-3 bg-white rounded-lg border border-pink-100">
            <p className="text-sm text-gray-600">Total Price</p>
            <p className="text-3xl font-extrabold text-pink-600">
              ₹{data.total_price.toFixed(2)}
            </p>
          </div>

          {/* Delivery Time */}
          <div className="p-3 bg-white rounded-lg border border-pink-100">
            <p className="text-sm text-gray-600">Delivery/Pickup Time</p>
            {/* NOTE: data.delivery_time is assumed to be an ISO string matching the date object */}
            <p className="text-lg font-bold text-gray-800">
              {format(deliveryTime, "EEE, MMM do (hh:mm a)")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              (Order ID: <strong>{data.id}</strong>)
            </p>
          </div>

          {/* QR Code --- FINAL RENDERING --- */}
          <div className="p-3 bg-white rounded-lg border border-pink-100 flex flex-col items-center justify-center">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Scan Customization ID
            </h3>
            {/* Displaying the QR Code image */}
            <img
              src={qr}
              alt={`QR Code for Customization ${data.id}`}
              className="w-28 h-28 border border-gray-100 rounded-md shadow-sm"
              width={112}
              height={112}
            />
          </div>
        </div>
      </section>

      {/* --- CUSTOMIZATION DETAILS --- */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow">
        <h2 className="text-xl font-bold text-gray-800">
          Customization Details
        </h2>
        <div className="mt-4 text-base grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <DetailItem label="Weight" value={`${weightKg} kg`} />
          <DetailItem label="Flavour" value={flavour} />
          <DetailItem label="Icing Type" value={icing} />
          <DetailItem label="Filling" value={filling || "N/A"} />
          <DetailItem label="Cake Type" value={cakeType} />
          <DetailItem label="Shape" value={shape} />
          <DetailItem
            label="Diet"
            value={withEgg ? "With Egg" : "Eggless"}
            color={withEgg ? "text-red-500" : "text-green-600"}
          />
          {photoCount && photoCount > 0 && (
            <DetailItem label="Photo Count" value={String(photoCount)} />
          )}
          {isToysValid && (
            <DetailItem
              label="Toys/Figurines"
              value={formattedToys as string}
            />
          )}
          {isFlowersValid && (
            <DetailItem label="Flowers" value={formattedFlowers as string} />
          )}
        </div>

        {message && (
          <div className="mt-6 pt-3 border-t">
            <p className="text-sm font-semibold text-gray-700">
              Message on Cake
            </p>
            <p className="mt-1 text-lg font-medium text-blue-700 italic">
              "{message}"
            </p>
          </div>
        )}
      </section>

      {/* --- CHEF NOTES --- */}
      {isChefNotesValid && ( // Uses the robust check here
        <section className="mt-6 rounded-2xl border border-blue-300 bg-blue-50 p-4 md:p-6 shadow-md">
          <h2 className="text-xl font-bold text-blue-800 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Chef's Notes (Internal)
          </h2>
          <p className="mt-2 text-lg text-gray-700 whitespace-pre-wrap">
            {chef_notes}
          </p>
        </section>
      )}

      {/* --- REFERENCE IMAGE --- */}
      {data.reference_image_url && (
        <section className="mt-6">
          <p className="text-lg font-bold text-gray-800">
            Design Reference Image
          </p>
          <img
            src={data.reference_image_url}
            alt="Design reference"
            className="mt-3 w-full max-h-96 object-contain rounded-xl border border-gray-300 shadow-lg"
          />
        </section>
      )}
    </main>
  );
}

// Simple helper component for cleaner details list
const DetailItem = ({
  label,
  value,
  color = "text-gray-800",
}: {
  label: string;
  value: string;
  color?: string;
}) => (
  <div className="flex justify-between items-center sm:block">
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className={`text-base font-semibold ${color}`}>{value}</p>
  </div>
);
