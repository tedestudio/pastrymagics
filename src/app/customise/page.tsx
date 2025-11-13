"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  Cake,
  Heart,
  Square,
  Circle,
  Layers,
  Plus,
  Minus,
  X,
  Clock,
  CheckCircle,
} from "lucide-react";

// --- Session Storage Key ---
const STORAGE_KEY = "currentCakeConfigId";

// Define the shape of the data retrieved from the database
type Option = { option_type: string; option_name: string; base_price: number };
type Rule = { rule_name: string; price: number };
type ToysState = { [key: string]: number };

export default function Customise() {
  const [weightKg, setWeightKg] = useState<string | null>(null);
  const [icing, setIcing] = useState<string | null>(null);
  const [flavour, setFlavour] = useState<string | null>(null);
  const [cakeType, setCakeType] = useState<string | null>(null);
  const [shape, setShape] = useState<string | null>(null);
  const [toys, setToys] = useState<ToysState>({});
  const [message, setMessage] = useState("");
  // --- NEW STATE: Chef Notes ---
  const [chefNotes, setChefNotes] = useState("");

  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // State for tracking the ID in the database (synced with sessionStorage)
  const [savedId, setSavedId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [withEgg, setWithEgg] = useState(true);
  const [photoCount, setPhotoCount] = useState(0);
  const [flowers, setFlowers] = useState(0);
  const [options, setOptions] = useState<Option[]>([]);
  const [extraPricing, setExtraPricing] = useState<Rule[]>([]);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const isIcingIncompatibleWithPastry = useMemo(() => {
    // Pastry is incompatible with structural icings (Fondant/Semi-Fondant)
    return icing === "Fondant" || icing === "Semi-Fondant";
  }, [icing]);

  // --- Delivery Date and Time ---
  const [deliveryTimestamp, setDeliveryTimestamp] = useState<string | null>(
    null
  );

  const getMinDateTime = useCallback(() => {
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 10); // ⬅️ add 10 hours instead of 2 days

    const year = minDate.getFullYear();
    const month = String(minDate.getMonth() + 1).padStart(2, "0");
    const day = String(minDate.getDate()).padStart(2, "0");
    const hours = String(minDate.getHours()).padStart(2, "0");
    const minutes = String(minDate.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  const minDeliveryDate = useMemo(() => getMinDateTime(), [getMinDateTime]);

  // --- Core Weight Calculation ---
  const numericWeight = useMemo(() => {
    return parseFloat(weightKg || "0");
  }, [weightKg]);

  const MIN_STEP_CAKE_WEIGHT = 3.0;
  const FONDANT_MIN_KG = 2.0;
  const SEMIFONDANT_MIN_KG = 1.5;
  // Fallback flavour prices (INR per kg) from product spec in case DB missing
  const FLAVOUR_FALLBACK: Record<string, number> = {
    VANILLA: 900,
    PINEAPPLE: 900,
    STRAWBERRY: 900,
    BUTTERSCOTCH: 1000,
    "CHCOC CHIP": 1000,
    "MILKY BUTTERSCOTCH": 1000,
    BLACKBERRY: 1000,
    BLUEBERRY: 1000,
    "CHOCO VANILLA": 1000,
    "CHOCO CRUNCH": 1100,
    "CHOCO SYMPHONY": 1100,
    "RED VELVET": 1200,
    "FRUIT & NUT": 1200,
    "HONEY ALMOND": 1200,
    "CHOCO MUD": 1200,
    HAZELLNUT: 1300,
    "CHOCO KITKAT": 1300,
    RAINBOW: 1500,
  };

  // --- Dynamic Option Filtering ---
  const weightOptions = useMemo(() => {
    const fromDb = options
      .filter((o) => o.option_type === "weight")
      .map((o) => String(o.option_name));

    // Fallback weights if DB does not provide any weight options
    if (!fromDb || fromDb.length === 0) {
      return ["1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];
    }

    return fromDb;
  }, [options]);
  const allIcingOptions = useMemo(() => {
    const fromDb = options
      .filter((o) => o.option_type === "icing")
      .map((o) => String(o.option_name));
    if (!fromDb || fromDb.length === 0) {
      return ["Cream", "Semi-Fondant", "Fondant"];
    }
    return fromDb;
  }, [options]);
  const cakeTypeOptions = useMemo(() => {
    const fromDb = options
      .filter((o) => o.option_type === "cake_type")
      .map((o) => String(o.option_name));
    if (!fromDb || fromDb.length === 0) {
      return ["Pastry", "Occasional / Celebration", "Designer / Custom Cakes"];
    }
    return fromDb;
  }, [options]);
  const shapeOptions = useMemo(() => {
    const fromDb = options
      .filter((o) => o.option_type === "shape")
      .map((o) => String(o.option_name));
    if (!fromDb || fromDb.length === 0) {
      return ["Round", "Heart", "Square", "Rectangle", "Custom Shape"];
    }
    return fromDb;
  }, [options]);
  const toyOptions = useMemo(() => {
    const fromDb = options
      .filter((o) => o.option_type === "toy")
      .map((o) => String(o.option_name));
    if (!fromDb || fromDb.length === 0) {
      return ["Non-Edible Toys"];
    }
    return fromDb;
  }, [options]);
  const flowerOptionPrice = useMemo(() => {
    const flowerOption = options.find((o) => o.option_type === "flower");
    // default per flower price 50
    return flowerOption?.base_price || 50;
  }, [options]);

  const shapeIconMap: Record<string, React.ElementType> = useMemo(
    () => ({
      Round: Circle,
      Square: Square,
      Rectangle: Layers,
      Heart: Heart,
      "Number / Alphabet": Layers,
      "Custom Shape": Cake,
    }),
    []
  );

  const availableIcingOptions = useMemo(() => {
    const restrictedIcings = ["Fondant", "Semi-Fondant"];
    // If Pastry is selected, disallow structural icings
    if (cakeType === "Pastry") {
      return allIcingOptions.filter((opt) => !restrictedIcings.includes(opt));
    }
    // For other cake styles, remove Butter Cream (not suitable for designer styles)
    if (cakeType && cakeType !== "Pastry") {
      return allIcingOptions.filter((opt) => opt !== "Butter Cream");
    }
    return allIcingOptions;
  }, [allIcingOptions, cakeType]);

  // If icing choice requires a minimum weight, clear it when weight becomes invalid
  useEffect(() => {
    if (icing === "Fondant" && numericWeight < FONDANT_MIN_KG) {
      setIcing(null);
    }
    if (icing === "Semi-Fondant" && numericWeight < SEMIFONDANT_MIN_KG) {
      setIcing(null);
    }
  }, [icing, numericWeight]);

  const isFondant = useMemo(() => icing === "Fondant", [icing]);
  const isFondantEligible = useMemo(
    () => isFondant && numericWeight >= FONDANT_MIN_KG,
    [isFondant, numericWeight]
  );
  // --- Icing Reset Effect ---
  useEffect(() => {
    if (icing && !availableIcingOptions.includes(icing)) {
      const newDefault = availableIcingOptions[0] || null;

      setIcing(newDefault);
      if (newDefault) {
        console.warn(
          `Icing selection reset. ${icing} is not allowed for ${cakeType}. Defaulting to ${newDefault}.`
        );
      }
    }
  }, [cakeType, icing, availableIcingOptions]);
  // --- END Icing Reset Effect ---

  // --- VALIDATION LOGIC (updated required fields) ---
  const validationErrors = useMemo(() => {
    const errors: { [key: string]: string | null } = {
      fondantWeight: null,
      semiFondantWeight: null,
      tierCakeWeight: null,
      requiredFields: null,
      deliveryDate: null,
    };

    if (icing === "Fondant" && numericWeight < FONDANT_MIN_KG) {
      errors.fondantWeight = `Fondant icing requires a minimum weight of ${FONDANT_MIN_KG}kg.`;
    }
    if (icing === "Semi-Fondant" && numericWeight < SEMIFONDANT_MIN_KG) {
      errors.semiFondantWeight = `Semi-Fondant icing requires a minimum weight of ${SEMIFONDANT_MIN_KG}kg.`;
    }
    // Removed tier cake specific validation (Step Cake / Tier Cake option deprecated)

    if (
      !weightKg ||
      !icing ||
      !flavour ||
      !cakeType ||
      !shape ||
      !deliveryTimestamp
    ) {
      errors.requiredFields =
        "Please select all primary cake options (Weight, Icing, Flavour, Style, Shape, Date/Time).";
    }

    if (deliveryTimestamp) {
      const selectedDate = new Date(deliveryTimestamp);
      const minDate = new Date(getMinDateTime());
      if (selectedDate.getTime() < minDate.getTime()) {
        errors.deliveryDate = `Delivery must be scheduled at least 10 hours in advance`;
      }
    }

    return errors;
  }, [
    icing,
    numericWeight,
    cakeType,
    shape,
    flavour,
    weightKg,
    deliveryTimestamp,
    getMinDateTime,
    minDeliveryDate,
  ]);

  const hasErrors = useMemo(() => {
    return Object.values(validationErrors).some((err) => err !== null);
  }, [validationErrors]);

  const isComplete = useMemo(() => {
    return (
      !!weightKg &&
      !!icing &&
      !!flavour &&
      !!cakeType &&
      !!shape &&
      !!deliveryTimestamp
    );
  }, [weightKg, icing, flavour, cakeType, shape, deliveryTimestamp]);

  const isSavable = useMemo(() => {
    return isComplete && !hasErrors;
  }, [isComplete, hasErrors]);

  // --- END VALIDATION LOGIC ---

  useEffect(() => {
    // Check session storage on mount
    const storedId = sessionStorage.getItem(STORAGE_KEY);
    if (storedId) {
      setSavedId(storedId);
    }

    (async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("cake_options")
        .select("option_type,option_name,base_price");
      if (!error && data) {
        setOptions(data);
        if (data.length > 0) {
          const initialWeight =
            data.find(
              (o) => o.option_type === "weight" && o.option_name === "1.0"
            )?.option_name ||
            data.find((o) => o.option_type === "weight")?.option_name;

          const initialIcing = data.find(
            (o) =>
              o.option_type === "icing" &&
              o.option_name !== "Whipped Cream" &&
              o.option_name !== "Butter Cream"
          )?.option_name;

          const initialFlavour = data.find(
            (o) => o.option_type === "flavor"
          )?.option_name;

          const initialCakeType =
            data.find((o) => o.option_name === "Regular Cake")?.option_name ||
            data.find((o) => o.option_type === "cake_type")?.option_name;

          const initialShape =
            data.find((o) => o.option_name === "Round")?.option_name ||
            data.find((o) => o.option_type === "shape")?.option_name;

          setWeightKg(initialWeight || null);
          setIcing(initialIcing || null);
          setFlavour(initialFlavour || null);
          setCakeType(initialCakeType || null);
          setShape(initialShape || null);

          setDeliveryTimestamp(getMinDateTime());
        }
      }

      const { data: extraData, error: extraError } = await supabase
        .from("extra_pricing_rules")
        .select("rule_name,price");
      if (!extraError && extraData) setExtraPricing(extraData);
    })();
  }, [getMinDateTime]);

  // --- SELLING PRICE CALCULATION (unchanged logic) ---
  const sellingPrice = useMemo(() => {
    const getOptionPrice = (type: string, name: string | null) => {
      if (!name) return 0;
      const found = options.find(
        (o) => o.option_type === type && o.option_name === name
      );
      return found ? Number(found.base_price) : 0;
    };

    const getRulePrice = (ruleName: string) => {
      const found = extraPricing.find((r) => r.rule_name === ruleName);
      // Default fallback for Eggless (per kg) is 100 if rule missing
      if (found) return Number(found.price);
      if (ruleName === "Eggless") return 100;
      return 0;
    };

    let total = 0;

    // --- Core Price Calculation (Flavor + Icing extra per kg) ---
    let flavorBasePrice = getOptionPrice("flavor", flavour);
    if ((!flavorBasePrice || flavorBasePrice === 0) && flavour) {
      const key = flavour.toUpperCase();
      flavorBasePrice = FLAVOUR_FALLBACK[key] || flavorBasePrice || 0;
    }
    // Icing extra per kg: Cream/Whipped = 0, Semi-Fondant = +500, Fondant = +700
    const icingExtraPerKg =
      icing === "Fondant" ? 700 : icing === "Semi-Fondant" ? 500 : 0;
    const baseCakePrice = (flavorBasePrice + icingExtraPerKg) * numericWeight;
    total += baseCakePrice;

    // --- Eggless Price (Multiplier) ---
    const egglessPricePerKg = getRulePrice("Eggless");
    if (!withEgg && egglessPricePerKg) {
      total += egglessPricePerKg * numericWeight;
    }

    // Shape pricing: if shape is "Custom" or contains "Custom" treat shape price as per-kg
    if (shape) {
      const shapePrice = getOptionPrice("shape", shape);
      if (/custom/i.test(shape)) {
        total += shapePrice * numericWeight || 200 * numericWeight; // fallback 200/kg
      } else {
        total += shapePrice;
      }
    }

    // --- Tiered Icing Pricing (unchanged) ---
    // Note: Fondant/Semi-Fondant extra handled as icingExtraPerKg above. Keep any configured extra as additive.
    if (icing === "Fondant" || icing === "Semi-Fondant") {
      total += getOptionPrice("icing", icing) * numericWeight;
    }

    // --- Add-on Pricing (Photo, Flowers, Toys) ---
    if (photoCount > 0) {
      const multiplier = Math.ceil(photoCount / 2);
      const basePhotoPrice = getOptionPrice("photos", "Photos") || 250;
      total += basePhotoPrice * multiplier;
    }

    total += flowers * flowerOptionPrice; // Flowers pricing calculation

    if (Object.keys(toys).length > 0) {
      Object.entries(toys).forEach(([toyName, count]) => {
        if (count > 0) {
          const baseToyPrice =
            options.find(
              (o) => o.option_type === "toy" && o.option_name === toyName
            )?.base_price || 200;

          let price = baseToyPrice * count;

          // Fondant promo: first 5 edible toys are free if icing is Fondant and eligible (>= min kg)
          if (
            toyName === "Edible Toys" &&
            icing === "Fondant" &&
            numericWeight >= FONDANT_MIN_KG
          ) {
            const payableCount = Math.max(0, count - 5);
            price = baseToyPrice * payableCount;
          }
          total += price;
        }
      });
    }

    return total;
  }, [
    options,
    extraPricing,
    numericWeight,
    icing,
    flavour,
    cakeType,
    shape,
    withEgg,
    photoCount,
    toys,
    flowers,
    flowerOptionPrice,
  ]);
  // --- END SELLING PRICE CALCULATION ---

  // --- PRICE BREAKDOWN CALCULATION (updated logic) ---
  const pricingBreakdown = useMemo(() => {
    const getOptionPrice = (type: string, name: string | null) => {
      if (!name) return 0;
      const found = options.find(
        (o) => o.option_type === type && o.option_name === name
      );
      return found ? Number(found.base_price) : 0;
    };
    const getRulePrice = (ruleName: string) => {
      const found = extraPricing.find((r) => r.rule_name === ruleName);
      return found ? Number(found.price) : 0;
    };

    const breakdown: { label: string; price: number }[] = [];
    let currentTotal = 0;

    // --- Core Price Calculation (Flavor + Icing extra per kg) ---
    let flavorBasePrice = getOptionPrice("flavor", flavour);
    if ((!flavorBasePrice || flavorBasePrice === 0) && flavour) {
      const key = flavour.toUpperCase();
      flavorBasePrice = FLAVOUR_FALLBACK[key] || flavorBasePrice || 0;
    }
    const icingExtraPerKg =
      icing === "Fondant" ? 700 : icing === "Semi-Fondant" ? 500 : 0;
    const baseCakePrice = (flavorBasePrice + icingExtraPerKg) * numericWeight;

    // 1. Flavor + Weight Multiplier
    if (flavour && numericWeight > 0) {
      breakdown.push({
        label: `${flavour} Flavour (${numericWeight}kg)`,
        price: baseCakePrice,
      });
      currentTotal += baseCakePrice;
    }

    // 3. Eggless Price (Multiplier)
    const egglessPricePerKg = getRulePrice("Eggless");
    if (!withEgg && egglessPricePerKg > 0) {
      const price = egglessPricePerKg * numericWeight;
      breakdown.push({
        label: `Eggless Charge (${numericWeight}kg)`,
        price: price,
      });
      currentTotal += price;
    }

    // 4. Shape and Cake Type Add-ons
    if (shape) {
      const price = getOptionPrice("shape", shape);
      if (price > 0) {
        breakdown.push({ label: `Shape (${shape})`, price });
        currentTotal += price;
      }
    }
    const isFondantSelectedAndEligible =
      icing === "Fondant" && numericWeight >= FONDANT_MIN_KG;

    if (icing === "Fondant" || icing === "Semi-Fondant") {
      const label = `Icing (${icing})`;
      const price = getOptionPrice("icing", icing) * numericWeight;
      if (price > 0) {
        breakdown.push({ label, price });
        currentTotal += price;
      }
    } else if (icing) {
      breakdown.push({ label: `Icing (${icing})`, price: 0 });
    }

    // 6. Photo Count (unchanged)
    if (photoCount > 0) {
      const multiplier = Math.ceil(photoCount / 2);
      const basePhotoPrice = getOptionPrice("photos", "Photos") || 250;
      const price = basePhotoPrice * multiplier;
      breakdown.push({ label: `Photo Cake (${photoCount} photos)`, price });
      currentTotal += price;
    }

    // 7. Flower Count (fixed/updated)
    if (flowers > 0) {
      const price = flowers * flowerOptionPrice;
      breakdown.push({ label: `Flowers (${flowers} units)`, price });
      currentTotal += price;
    }

    // 8. Toys (unchanged)
    if (Object.keys(toys).length > 0) {
      Object.entries(toys).forEach(([toyName, count]) => {
        if (count > 0) {
          const baseToyPrice =
            options.find(
              (o) => o.option_type === "toy" && o.option_name === toyName
            )?.base_price || 200;

          let price = baseToyPrice * count;
          let label = `${toyName} (${count} units)`;

          if (toyName === "Edible Toys" && isFondantSelectedAndEligible) {
            const payableCount = Math.max(0, count - 5);
            price = baseToyPrice * payableCount;
            label = `${toyName} (${count} units, 5 FREE)`;
          }

          if (price > 0) {
            breakdown.push({ label: label, price: price });
            currentTotal += price;
          }
        }
      });
    }

    return { breakdown, total: sellingPrice };
  }, [
    options,
    extraPricing,
    numericWeight,
    icing,
    flavour,
    cakeType,
    shape,
    withEgg,
    photoCount,
    toys,
    sellingPrice,
    flowers,
    flowerOptionPrice,
  ]);
  // --- END PRICE BREAKDOWN CALCULATION ---

  const flavourPriceMap = useMemo(() => {
    const fromDb = options
      .filter((o) => o.option_type === "flavor")
      .map((o) => ({ name: o.option_name, price: Number(o.base_price) }));

    if (!fromDb || fromDb.length === 0) {
      return Object.entries(FLAVOUR_FALLBACK)
        .map(([name, price]) => ({
          name,
          price,
        }))
        .sort((a, b) => a.price - b.price);
    }

    return fromDb.sort((a, b) => a.price - b.price);
  }, [options]);

  // --- UTILITY FUNCTIONS (mostly unchanged) ---
  const compressImage = async (
    dataUrl: string,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new (window as any).Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const compressedImage = await compressImage(dataUrl, 1200, 1200, 0.8);
      setReferenceImage(compressedImage);
    };
    reader.readAsDataURL(file);
  };

  const createAndDownloadImage = async (orderId: string, qrUrl: string) => {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "portrait",
    });
    const margin = 30;
    let y = margin;
    const width = doc.internal.pageSize.getWidth();

    const logo = new (window as any).Image();
    logo.src = "/logo.png";
    await new Promise((resolve) => {
      logo.onload = () => resolve(true);
    });
    const logoWidth = 100;
    const logoHeight = (logo.height * logoWidth) / logo.width;
    const logoX = width / 2 - logoWidth / 2;
    doc.addImage(logo, "PNG", logoX, y, logoWidth, logoHeight);
    y += logoHeight + 20;

    doc.setFontSize(24);
    doc.setFont("Helvetica", "bold");
    doc.text("Custom Cake Order", width / 2, y, { align: "center" });
    y += 30;

    doc.setFontSize(14);
    doc.setFont("Helvetica", "normal");
    const details = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Delivery Time: ${new Date(deliveryTimestamp!).toLocaleString()}`,
      `Weight: ${weightKg} kg`,
      `Flavour: ${flavour}`,
      `Icing: ${icing}`,
      `Cake Style: ${cakeType}`,
      `Shape: ${shape}`,
      `Egg Status: ${withEgg ? "With Egg" : "Eggless"}`,
      `Photo Count: ${photoCount}`,
      ...Object.entries(toys).map(
        ([toyName, count]) => `${toyName}: ${count} units`
      ),
      `Flowers: ${flowers} units`,
      `Message: ${message || "None"}`,
      `Notes: ${chefNotes || "None"}`, // ADDED TO PDF DETAILS
    ];
    details.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 20;
    });
    y += 30;

    if (referenceImage) {
      const refImg = new (window as any).Image();
      refImg.src = referenceImage;
      await new Promise((resolve) => {
        refImg.onload = () => resolve(true);
      });
      const maxImgWidth = width - 2 * margin;
      const maxImgHeight = 200;
      let imgWidth = refImg.width;
      let imgHeight = refImg.height;

      if (imgWidth > maxImgWidth || imgHeight > maxImgHeight) {
        const ratio = Math.min(
          maxImgWidth / imgWidth,
          maxImgHeight / imgHeight
        );
        imgWidth *= ratio;
        imgHeight *= ratio;
      }
      const imgX = width / 2 - imgWidth / 2;
      doc.addImage(refImg, "JPEG", imgX, y, imgWidth, imgHeight);
      y += imgHeight + 20;
    }

    const qrSize = 200;
    const qrX = width / 2 - qrSize / 2;
    doc.addImage(qrUrl, "PNG", qrX, y, qrSize, qrSize);
    y += qrSize + 20;

    doc.setFontSize(12);
    doc.text("Scan to view this customisation", width / 2, y, {
      align: "center",
    });

    doc.save(`PastryMagiccs_Cake_${orderId}.pdf`);
  };

  const handleNextStep = async () => {
    if (!name.trim() || !phone.trim() || !/^\d{10}$/.test(phone)) {
      alert("Please enter a valid name and 10-digit phone number");
      return;
    }
    if (!consentChecked) {
      alert("Please agree to the data storage consent.");
      return;
    }

    if (!isSavable) {
      alert("Please correct the errors in the form before proceeding.");
      return;
    }

    try {
      setSaving(true);
      let referenceImageUrl: string | null = null;

      // 1. Upload Image (if present)
      if (referenceImage) {
        const up = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: referenceImage }),
        });
        if (up.ok) {
          const j = await up.json();
          referenceImageUrl = j.url;
        }
      }

      // 2. Prepare Payload
      const payload = {
        name,
        phone,
        price: sellingPrice,
        referenceImage: referenceImageUrl,
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
        chefNotes, // ADDED TO PAYLOAD
      };

      // 3. Determine Method and URL for Save/Update
      const currentId = savedId || sessionStorage.getItem(STORAGE_KEY);

      let res;
      let method = "POST";
      let url = "/api/cakes";

      if (currentId) {
        method = "PUT";
        url = `/api/cakes?id=${currentId}`;
      }

      // 4. Send Request (POST for new, PUT for update)
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save/Update failed");

      const data = await res.json();
      const orderId = data.id;

      // 5. Update Session Storage and State
      sessionStorage.setItem(STORAGE_KEY, orderId);
      setSavedId(orderId); // Update local state with confirmed ID

      // 6. Generate QR Link
      const link = `${window.location.origin}/customise/${orderId}`;
      const qr = await QRCode.toDataURL(link, { margin: 1, width: 160 });

      // 7. Update State and Show Modal
      setQrDataUrl(qr);
      setShowPricingModal(true);
    } catch (e) {
      alert("Could not save configuration. Please try again.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalShare = async () => {
    if (!savedId || !qrDataUrl) {
      alert("Error: Configuration was not saved correctly.");
      return;
    }

    try {
      setSaving(true);
      createAndDownloadImage(savedId, qrDataUrl);

      // --- FINAL STEP: CLEAR SESSION STORAGE ---
      sessionStorage.removeItem(STORAGE_KEY);

      setShowPricingModal(false);
      setShowDialog(true);
    } catch (e) {
      alert("Failed to generate PDF/Image.");
      console.error("PDF Generation Error:", e);
    } finally {
      setSaving(false);
    }
  };

  const currentError =
    validationErrors.fondantWeight ||
    validationErrors.semiFondantWeight ||
    validationErrors.tierCakeWeight ||
    validationErrors.requiredFields ||
    validationErrors.deliveryDate;

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl text-center text-[var(--primary)]">
        Customise Your Dream Cake
      </h1>
      <p className="text-center mt-3 text-foreground/60">
        Select your options below and receive an instant price estimation.
      </p>

      <div className="mt-10">
        <section className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {/* --- PRIMARY DESIGN SECTION --- */}
            <div className="lg:col-span-3">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-6">
                1. Core Cake Design
              </h2>
            </div>

            {/* Weight */}
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Weight (kg)
              </label>
              <div className="flex flex-wrap gap-3">
                {weightOptions
                  .map((w) => ({ weight: w, num: parseFloat(w) }))
                  .sort((a, b) => a.num - b.num)
                  .map(({ weight: w }) => (
                    <button
                      key={w}
                      onClick={() => {
                        setWeightKg(w);
                      }}
                      className={`relative px-4 py-3 rounded-xl text-sm border-2 transition-all duration-200 ${
                        weightKg === w
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                          : "bg-white text-foreground border-gray-300 hover:border-[var(--primary)]/50 hover:shadow-sm"
                      }`}
                      aria-pressed={weightKg === w}
                      disabled={false}
                    >
                      {w === "0.5" && (
                        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] bg-yellow-500 text-white font-bold px-1.5 py-0.5 rounded-full shadow-md">
                          PREMIUM
                        </span>
                      )}
                      {w} kg
                    </button>
                  ))}
              </div>
            </div>

            {/* Egg/Eggless */}
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Egg Status
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setWithEgg(true)}
                  className={`px-4 py-3 rounded-xl text-sm border-2 transition-all duration-200 ${
                    withEgg
                      ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                      : "bg-white text-foreground border-gray-300 hover:border-[var(--primary)]/50 hover:shadow-sm"
                  }`}
                  aria-pressed={withEgg}
                >
                  With Egg
                </button>
                <button
                  onClick={() => setWithEgg(false)}
                  className={`px-4 py-3 rounded-xl text-sm border-2 transition-all duration-200 ${
                    !withEgg
                      ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                      : "bg-white text-foreground border-gray-300 hover:border-[var(--primary)]/50 hover:shadow-sm"
                  }`}
                  aria-pressed={!withEgg}
                >
                  Eggless
                </button>
              </div>
            </div>

            {/* Flavour (Grid with Price) */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Flavour (Base Price/kg)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
                {flavourPriceMap.map((flavorItem) => (
                  <button
                    key={flavorItem.name}
                    onClick={() => setFlavour(flavorItem.name)}
                    className={`p-3 rounded-xl text-sm border-2 transition-all duration-200 text-left hover:shadow-sm ${
                      flavour === flavorItem.name
                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                        : "bg-white text-foreground border-gray-300 hover:border-[var(--primary)]/50"
                    }`}
                    aria-pressed={flavour === flavorItem.name}
                  >
                    <span className="block font-medium leading-snug">
                      {flavorItem.name}
                    </span>
                    <span
                      className="block text-[11px] font-bold pt-1 text-gray-500 transition-colors duration-200"
                      style={
                        flavour === flavorItem.name ? { color: "white" } : {}
                      }
                    >
                      +₹{flavorItem.price.toFixed(0)}/kg
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Shape (Buttons with Icons) */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cake Shape
              </label>
              <div className="flex flex-wrap gap-3">
                {shapeOptions.map((opt) => {
                  const IconComponent = shapeIconMap[opt] || Cake;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        // When Custom Shape is selected, ensure minimum 2kg weight
                        if (opt === "Custom Shape" && numericWeight < 2) {
                          setWeightKg("2.0");
                        }
                        setShape(opt);
                      }}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-sm border-2 transition-all duration-200 hover:shadow-sm ${
                        shape === opt
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                          : "bg-white text-foreground border-gray-300 hover:border-[var(--primary)]/50"
                      }`}
                      aria-pressed={shape === opt}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icing */}
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Icing Type
              </label>
              <div className="flex flex-wrap gap-3">
                {availableIcingOptions.map((opt) => {
                  const disabledForWeight =
                    (opt === "Fondant" && numericWeight < FONDANT_MIN_KG) ||
                    (opt === "Semi-Fondant" &&
                      numericWeight < SEMIFONDANT_MIN_KG);
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (disabledForWeight) return;
                        setIcing(opt);
                      }}
                      className={`px-4 py-3 rounded-xl text-sm border-2 transition-all duration-200 ${
                        disabledForWeight
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                          : icing === opt
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                          : "bg-white text-foreground border-gray-300 hover:border-[var(--primary)]/50 hover:shadow-sm"
                      }`}
                      aria-pressed={icing === opt}
                      disabled={disabledForWeight}
                    >
                      {opt}
                      {opt === "Fondant" && disabledForWeight && (
                        <span className="block text-xs text-red-500">
                          (requires &gt;= 2kg)
                        </span>
                      )}
                      {opt === "Semi-Fondant" && disabledForWeight && (
                        <span className="block text-xs text-red-500">
                          (requires &gt;= 1.5kg)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Conditional Promo Note */}
              {/* Promo removed: edible toys option deprecated */}
            </div>

            {/* Cake Type (Style) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cake Style
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {cakeTypeOptions.map((opt) => {
                  const isPastryOption = opt === "Pastry";
                  const isDisabled =
                    isPastryOption && isIcingIncompatibleWithPastry;

                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (isDisabled) {
                          alert(
                            "Pastry style is not available with Fondant or Semi-Fondant icing."
                          );
                          return;
                        }

                        // Step Cake / Tier Cake option removed; no snapping logic required
                        setCakeType(opt);
                      }}
                      className={`px-3 py-2 rounded-md text-sm border transition-colors duration-200 ${
                        isDisabled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                          : cakeType === opt
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                          : "bg-white text-foreground border-[var(--muted)] hover:bg-[var(--muted)]/50"
                      }`}
                      aria-pressed={cakeType === opt}
                      disabled={isDisabled}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- ADD-ONS SECTION --- */}
            <div className="lg:col-span-3 mt-6 pt-6 border-t border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-6">
                2. Optional Add-ons
              </h2>
            </div>

            {/* Photo, Flowers, and Toys Counters */}
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Photo Count */}
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Photo Count (Per 2 Photos)
                </label>
                <div className="mt-2 flex items-center justify-between p-2 rounded-xl border border-gray-300 bg-gray-50">
                  <button
                    onClick={() =>
                      setPhotoCount((prev) => Math.max(0, prev - 1))
                    }
                    className="w-8 h-8 rounded-full text-foreground hover:bg-white transition-colors flex items-center justify-center"
                    disabled={photoCount === 0}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-bold w-8 text-center">
                    {photoCount}
                  </span>
                  <button
                    onClick={() => setPhotoCount((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full text-foreground hover:bg-white transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Flower Selection */}
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Flowers (Max 10)
                </label>
                <div className="mt-2 flex items-center justify-between p-2 rounded-xl border border-gray-300 bg-gray-50">
                  <button
                    onClick={() => setFlowers((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-full text-foreground hover:bg-white transition-colors flex items-center justify-center"
                    disabled={flowers === 0}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-bold w-8 text-center">
                    {flowers}
                  </span>
                  <button
                    onClick={() => setFlowers((prev) => Math.min(10, prev + 1))}
                    className="w-8 h-8 rounded-full text-foreground hover:bg-white transition-colors flex items-center justify-center"
                    disabled={flowers >= 10}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Toy Selection - Edible & Non-Edible */}
              {toyOptions.map((toyName) => (
                <div key={toyName} className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {toyName}
                  </label>
                  <div className="mt-2 flex items-center justify-between p-2 rounded-xl border border-gray-300 bg-gray-50">
                    <button
                      onClick={() =>
                        setToys((prev) => ({
                          ...prev,
                          [toyName]: Math.max(0, (prev[toyName] || 0) - 1),
                        }))
                      }
                      className="w-8 h-8 rounded-full text-foreground hover:bg-white transition-colors flex items-center justify-center"
                      disabled={!toys[toyName] || toys[toyName] === 0}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-bold w-8 text-center">
                      {toys[toyName] || 0}
                    </span>
                    <button
                      onClick={() =>
                        setToys((prev) => ({
                          ...prev,
                          [toyName]: (prev[toyName] || 0) + 1,
                        }))
                      }
                      className="w-8 h-8 rounded-full text-foreground hover:bg-white transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* --- MEDIA & CONTACT SECTION --- */}
            <div className="lg:col-span-3 mt-8 pt-6 border-t border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-6">
                3. Details & Checkout
              </h2>
            </div>

            {/* DELIVERY DATE/TIME INPUT */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                Required Delivery Date & Time (Minimum 2 Days)
              </label>
              <input
                type="datetime-local"
                value={deliveryTimestamp || ""}
                onChange={(e) => setDeliveryTimestamp(e.target.value)}
                min={minDeliveryDate}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              />
            </div>

            {/* Text on Cake */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Text on Cake
              </label>
              <input
                type="text"
                placeholder="e.g., Happy Birthday John!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                maxLength={40}
              />
              <p className="mt-1 text-sm text-foreground/60">
                Max 40 characters
              </p>
            </div>

            {/* Contact Details (Combined to fit 1 column on MD screen) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="10 digit number"
                  pattern="[0-9]{10}"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                />
              </div>
            </div>

            {/* Upload reference */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Design Reference Image (Optional)
                  </label>
                  <label className="mt-2 block w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                    <span className="px-4 py-3 block text-center">
                      Click to Choose File
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onFileChange}
                    />
                  </label>
                </div>

                {referenceImage && (
                  <div className="md:col-span-2 p-3 border rounded-xl bg-white shadow-sm flex gap-4 items-start">
                    <Image
                      src={referenceImage}
                      alt="Design reference"
                      width={120}
                      height={120}
                      className="h-32 w-32 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium pt-1">
                        Reference Image Loaded
                      </p>
                      <button
                        onClick={() => setReferenceImage(null)}
                        className="mt-2 px-3 py-1 rounded-full text-xs font-medium text-white bg-red-500 hover:bg-red-600 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- NEW: Chef Notes --- */}
            <div className="lg:col-span-3 mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chef's Notes (Optional)
              </label>
              <textarea
                value={chefNotes}
                onChange={(e) => setChefNotes(e.target.value)}
                placeholder="E.g., Please make the frosting dark blue, or avoid peanuts..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:ring-[var(--primary)] focus:border-[var(--primary)] min-h-24"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-foreground/60 text-right">
                {chefNotes.length} / 200 characters
              </p>
            </div>
            {/* --- END NEW: Chef Notes --- */}

            {/* Final Actions and Validation */}
            <div className="lg:col-span-3 pt-6 mt-4 border-t border-gray-100">
              {/* Consent checkbox */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <input
                  type="checkbox"
                  id="consent-checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="h-5 w-5 rounded text-[var(--primary)] border-gray-300 focus:ring-[var(--primary)]"
                />
                <label
                  htmlFor="consent-checkbox"
                  className="text-sm font-medium text-foreground/80"
                >
                  I agree to save my name and phone number for order tracking
                  and future communication.
                </label>
              </div>

              {/* Validation Error Display */}
              {currentError && (
                <div className="mt-4 rounded-xl border border-red-600 bg-red-50 p-4 text-sm text-red-700 font-medium shadow-sm">
                  ⚠️ {currentError}
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-6">
                <button
                  className={`w-full px-5 py-4 rounded-full text-white text-lg font-bold transition-all shadow-xl ${
                    isSavable
                      ? "bg-[var(--primary)] hover:bg-[var(--primary-600)]"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!isSavable || saving}
                  onClick={handleNextStep}
                >
                  {saving ? "Processing Price..." : `Get Price`}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showPricingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full text-left shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[var(--primary)]">
                Final Price Breakdown
              </h2>
              <button
                onClick={() => setShowPricingModal(false)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-sm max-h-80 overflow-y-auto pr-2">
              {pricingBreakdown.breakdown.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center border-b border-dashed border-gray-100 pb-2"
                >
                  <span className="text-foreground/80">{item.label}</span>
                  <span className="font-semibold text-base">
                    ₹{item.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <hr className="my-4" />
            <div className="flex justify-between items-center font-bold text-lg mb-4">
              <span>ESTIMATED TOTAL</span>
              <span className="text-[var(--primary)]">
                ₹{pricingBreakdown.total.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-foreground/60 border-t pt-2">
              * This is an estimated price based on your selections. Final price
              may vary slightly based on design complexity.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 px-5 py-3 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50"
                onClick={() => setShowPricingModal(false)}
              >
                Go Back & Edit
              </button>
              <button
                className="flex-1 px-5 py-3 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-600)] disabled:opacity-60"
                onClick={handleFinalShare}
                disabled={saving}
              >
                {saving ? "Generating PDF..." : "Save Config & Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-3">Order Config Saved!</h2>
            <p className="text-sm text-foreground/70 mb-6">
              Your cake details have been saved. A PDF of your customisation and
              QR code has been downloaded automatically.
            </p>
            {qrDataUrl && (
              <Image
                src={qrDataUrl}
                alt="QR Code"
                width={192}
                height={192}
                className="mx-auto my-4 w-48 h-48 rounded-lg border border-gray-200"
              />
            )}
            <Link
              href={`/customise/${savedId}`}
              className="text-sm font-medium text-[var(--primary)] underline block mt-2"
            >
              View your customisation link online
            </Link>
            <button
              onClick={() => setShowDialog(false)}
              className="mt-6 w-full px-5 py-3 rounded-full bg-[var(--primary)] text-white text-base font-medium hover:bg-[var(--primary-600)]"
            >
              Close & Start New
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
