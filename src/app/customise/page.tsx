"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Cake, Heart, Square, Circle, Layers } from 'lucide-react';

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
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
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

  // --- Core Weight Calculation (Available globally for validation) ---
  const numericWeight = useMemo(() => {
    return parseFloat(weightKg || "0");
  }, [weightKg]);

  // --- Constants for Constraint ---
  const MIN_STEP_CAKE_WEIGHT = 3.0;

  // --- Dynamic Option Filtering ---
  const weightOptions = useMemo(
    () => options.filter((o) => o.option_type === "weight").map((o) => o.option_name),
    [options]
  );
  const allIcingOptions = useMemo(
    () => options.filter((o) => o.option_type === "icing").map((o) => o.option_name),
    [options]
  );
  const flavourOptions = useMemo(
    () => options.filter((o) => o.option_type === "flavor").map((o) => o.option_name),
    [options]
  );
  const cakeTypeOptions = useMemo(
    () => options.filter((o) => o.option_type === "cake_type").map((o) => o.option_name),
    [options]
  );
  const shapeOptions = useMemo(
    () => options.filter((o) => o.option_type === "shape").map((o) => o.option_name),
    [options]
  );
  const toyOptions = useMemo(
    () => options.filter((o) => o.option_type === "toy").map((o) => o.option_name),
    [options]
  );
  const flowerOptionPrice = useMemo(() => {
    const flowerOption = options.find(o => o.option_type === 'flower' && o.option_name === 'General Flower');
    return flowerOption?.base_price || 0;
  }, [options]);

  // Map shapes to icons for visualization
  const shapeIconMap: Record<string, React.ElementType> = useMemo(() => ({
    "Round": Circle,
    "Square": Square,
    "Rectangle": Square, // Use square icon for rectangle
    "Heart": Heart,
    "Number / Alphabet": Layers,
    "Custom Shape": Cake,
  }), []);


  // Filter Icing options based on Cake Type rule
  const availableIcingOptions = useMemo(() => {
    const restrictedIcings = ["Fondant", "Semi-Fondant"]; 
    
    if (cakeType === "Regular Cake") {
        return allIcingOptions.filter(opt => !restrictedIcings.includes(opt));
    } else if (cakeType) {
        return allIcingOptions.filter(opt => opt !== "Butter Cream");
    }
    return allIcingOptions;
  }, [allIcingOptions, cakeType]);
  
  // --- Icing Reset Effect ---
  useEffect(() => {
    if (icing && !availableIcingOptions.includes(icing)) {
      const newDefault = availableIcingOptions.includes('Whipped Cream') ? 'Whipped Cream' : availableIcingOptions[0] || null;
      setIcing(newDefault);
      if (newDefault) {
         // Notify user if their selection was auto-changed due to a restriction
         alert(`Icing selection reset. ${icing} is not allowed for ${cakeType}.`);
      }
    }
  }, [cakeType, icing, availableIcingOptions]);
  // --- END Icing Reset Effect ---

  // --- VALIDATION LOGIC ---
  const validationErrors = useMemo(() => {
    const errors: { [key: string]: string | null } = {
      fondantWeight: null,
      semiFondantWeight: null,
      tierCakeWeight: null,
      requiredFields: null,
    };

    // R1: Fondant minimum weight
    if (icing === "Fondant" && numericWeight < 1.5) {
      errors.fondantWeight = "Fondant icing requires a minimum weight of 1.5kg.";
    }
    // R2: Semi-Fondant minimum weight
    if (icing === "Semi-Fondant" && numericWeight < 1) {
      errors.semiFondantWeight = "Semi-Fondant icing requires a minimum weight of 1.0kg.";
    }
    // R3: Tier cake minimum weight
    if (cakeType === "Step Cake / Tier Cake" && numericWeight < MIN_STEP_CAKE_WEIGHT) {
      errors.tierCakeWeight = `Tier cake requires a minimum total weight of ${MIN_STEP_CAKE_WEIGHT}kg.`;
    }
    // R4: All primary fields selected
    if (!weightKg || !icing || !flavour || !cakeType || !shape) {
      errors.requiredFields = "Please select all primary cake options (Weight, Icing, Flavour, Style, Shape).";
    }
    return errors;
  }, [icing, numericWeight, cakeType, shape, flavour, weightKg]);

  const hasErrors = useMemo(() => {
    return Object.values(validationErrors).some(err => err !== null);
  }, [validationErrors]);

  const isComplete = useMemo(() => {
    return !!weightKg && !!icing && !!flavour && !!cakeType && !!shape;
  }, [weightKg, icing, flavour, cakeType, shape]);

  const isSavable = useMemo(() => {
    return isComplete && !hasErrors;
  }, [isComplete, hasErrors]);

  // --- END VALIDATION LOGIC ---

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("cake_options")
        .select("option_type,option_name,base_price");
      if (!error && data) {
        setOptions(data);
        if (data.length > 0) {
          const initialWeight = data.find(
            (o) => o.option_type === "weight"
          )?.option_name;
          
          // Use 'Whipped Cream' or first available icing as default
          const initialIcing = data.find(
            (o) => o.option_name === "Whipped Cream"
          )?.option_name || data.find((o) => o.option_type === "icing")?.option_name;

          const initialFlavour = data.find(
            (o) => o.option_type === "flavor"
          )?.option_name;
          
          // Use 'Pastry' or first available cake type as default
          const initialCakeType = data.find(
            (o) => o.option_name === "Pastry"
          )?.option_name || data.find((o) => o.option_type === "cake_type")?.option_name;

          const initialShape = data.find(
            (o) => o.option_type === "shape"
          )?.option_name;
          
          setWeightKg(initialWeight || null);
          setIcing(initialIcing || null);
          setFlavour(initialFlavour || null);
          setCakeType(initialCakeType || null);
          setShape(initialShape || null);
        }
      }

      const { data: extraData, error: extraError } = await supabase
        .from("extra_pricing_rules")
        .select("rule_name,price");
      if (!extraError && extraData) setExtraPricing(extraData);
    })();
  }, []);


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
      return found ? Number(found.price) : 0;
    };

    let total = 0;
    const isFondant = icing === "Fondant";
    const isFourKgOrMore = numericWeight >= 4;
    const isBasePromotionActive = isFondant && isFourKgOrMore;

    // --- Core Price Calculation (Flavor * Weight Multiplier) ---
    const flavorBasePrice = getOptionPrice("flavor", flavour);
    const baseCakePrice = flavorBasePrice * numericWeight;
    total += baseCakePrice;

    // --- Eggless Price (Multiplier) ---
    const egglessPricePerKg = getRulePrice("Eggless");
    if (!withEgg && egglessPricePerKg) {
        total += egglessPricePerKg * numericWeight;
    }

    total += getOptionPrice("shape", shape);
    total += getOptionPrice("cake_type", cakeType);

    if (icing === "Fondant") {
      if (numericWeight >= 1 && numericWeight <= 1.5) {
        total += getRulePrice("Fondant_1_1.5kg");
      } else if (numericWeight >= 2 && numericWeight <= 4) {
        total += getRulePrice("Fondant_2_4kg");
      } else if (numericWeight >= 5) {
        total += getRulePrice("Fondant_5kg_and_above");
      }
    }

    if (icing === "Semi-Fondant") {
      if (numericWeight >= 1 && numericWeight <= 1.5) {
        total += getRulePrice("Semi-Fondant_1_1.5kg");
      } else if (numericWeight >= 2 && numericWeight <= 4) {
        total += getRulePrice("Semi-Fondant_2_4kg");
      } else if (numericWeight >= 5) {
        total += getRulePrice("Semi-Fondant_5kg_and_above");
      }
    }

    if (photoCount > 0) {
      const multiplier = Math.ceil(photoCount / 2);
      const basePhotoPrice = getRulePrice("Photo Cake");
      total += basePhotoPrice * multiplier;
    }

    // --- Flower Pricing ---
    total += flowers * flowerOptionPrice;

    // --- TOY PRICING LOGIC ---
    if (Object.keys(toys).length > 0) {
      Object.entries(toys).forEach(([toyName, count]) => {
        if (count > 0) {
          const baseToyPrice = options.find(
            (o) => o.option_type === "toy" && o.option_name === toyName
          )?.base_price || 0;

          let price = baseToyPrice * count;

          if (toyName === "Edible Toys" && isBasePromotionActive) {
            const payableCount = Math.max(0, count - 5);
            price = baseToyPrice * payableCount;
          }
          total += price;
        }
      });
    }
    // --- END TOY PRICING LOGIC ---

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

  const pricingBreakdown = useMemo(() => {
    const getOptionPrice = (type: string, name: string | null) => {
      if (!name) return 0;
      const found = options.find(o => o.option_type === type && o.option_name === name);
      return found ? Number(found.base_price) : 0;
    };
    const getRulePrice = (ruleName: string) => {
      const found = extraPricing.find(r => r.rule_name === ruleName);
      return found ? Number(found.price) : 0;
    };

    const breakdown: { label: string; price: number }[] = [];
    let currentTotal = 0;

    // --- Core Price Calculation ---
    const flavorBasePrice = getOptionPrice("flavor", flavour);
    const baseCakePrice = flavorBasePrice * numericWeight;
    
    // 1. Flavor + Weight Multiplier
    if (flavour && numericWeight > 0) {
      breakdown.push({ label: `${flavour} Flavour (${numericWeight}kg)`, price: baseCakePrice });
      currentTotal += baseCakePrice;
    }

    // 2. Eggless Price (Multiplier)
    const egglessPricePerKg = getRulePrice("Eggless");
    if (!withEgg && egglessPricePerKg > 0) {
      const price = egglessPricePerKg * numericWeight;
      breakdown.push({ label: `Eggless Charge (${numericWeight}kg)`, price: price });
      currentTotal += price;
    }

    // 3. Shape and Cake Type Add-ons
    if (shape) {
      const price = getOptionPrice("shape", shape);
      if (price > 0) {
          breakdown.push({ label: `Shape (${shape})`, price });
          currentTotal += price;
      }
    }
    if (cakeType) {
      const price = getOptionPrice("cake_type", cakeType);
      if (price > 0) {
          breakdown.push({ label: `Cake Style (${cakeType})`, price });
          currentTotal += price;
      }
    }
    
    // Extra Rules & Icing
    const isFondant = icing === "Fondant";
    const isFourKgOrMore = numericWeight >= 4;
    const isBasePromotionActive = isFondant && isFourKgOrMore;
    

    // 4. Icing Tiered Pricing
    if (icing === "Fondant") {
      let price = 0;
      let label = `Icing (${icing})`;
      if (numericWeight >= 1 && numericWeight <= 1.5) {
        price = getRulePrice("Fondant_1_1.5kg");
        label = `Icing (${icing} 1-1.5kg)`;
      } else if (numericWeight >= 2 && numericWeight <= 4) {
        price = getRulePrice("Fondant_2_4kg");
        label = `Icing (${icing} 2-4kg)`;
      } else if (numericWeight >= 5) {
        price = getRulePrice("Fondant_5kg_and_above");
        label = `Icing (${icing} 5kg+)`;
      }
      if (price > 0) {
          breakdown.push({ label: label, price: price });
          currentTotal += price;
      }
    } else if (icing === "Semi-Fondant") {
      let price = 0;
      let label = `Icing (${icing})`;
      if (numericWeight >= 1 && numericWeight <= 1.5) {
        price = getRulePrice("Semi-Fondant_1_1.5kg");
        label = `Icing (${icing} 1-1.5kg)`;
      } else if (numericWeight >= 2 && numericWeight <= 4) {
        price = getRulePrice("Semi-Fondant_2_4kg");
        label = `Icing (${icing} 2-4kg)`;
      } else if (numericWeight >= 5) {
        price = getRulePrice("Semi-Fondant_5kg_and_above");
        label = `Icing (${icing} 5kg+)`;
      }
      if (price > 0) {
          breakdown.push({ label: label, price: price });
          currentTotal += price;
      }
    } else if (icing) {
        breakdown.push({ label: `Icing (${icing})`, price: 0 });
    }


    // 5. Photo Count
    if (photoCount > 0) {
      const multiplier = Math.ceil(photoCount / 2);
      const basePhotoPrice = getRulePrice("Photo Cake");
      const price = basePhotoPrice * multiplier;
      breakdown.push({ label: `Photo Cake (${photoCount} photos)`, price });
      currentTotal += price;
    }
    
    // 6. Flower Count
    if (flowers > 0) {
      const price = flowers * flowerOptionPrice;
      breakdown.push({ label: `Flowers (${flowers} units)`, price });
      currentTotal += price;
    }


    // 7. Toys
    if (Object.keys(toys).length > 0) {
      Object.entries(toys).forEach(([toyName, count]) => {
        if (count > 0) {
          const baseToyPrice = options.find(
            (o) => o.option_type === "toy" && o.option_name === toyName
          )?.base_price || 0;

          let price = baseToyPrice * count;
          let label = `${toyName} (${count} units)`;

          if (toyName === "Edible Toys" && isBasePromotionActive) {
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
  }, [options, extraPricing, numericWeight, icing, flavour, cakeType, shape, withEgg, photoCount, toys, sellingPrice, flowers, flowerOptionPrice]);

const flavourPriceMap = useMemo(() => {
    return options
      .filter(o => o.option_type === 'flavor')
      .map(o => ({
        name: o.option_name,
        price: o.base_price
      }));
  }, [options]);

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
      `Weight: ${weightKg} kg`,
      `Flavour: ${flavour}`,
      `Icing: ${icing}`,
      `Cake Style: ${cakeType}`,
      `Shape: ${shape}`,
      `Egg Status: ${withEgg ? "With Egg" : "Eggless"}`,
      `Photo Count: ${photoCount}`,
      ...Object.entries(toys).map(([toyName, count]) => `${toyName}: ${count} units`),
      `Flowers: ${flowers} units`,
      `Message: ${message || "None"}`,
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

      // Since the data is being saved first, we need to handle the image upload here.
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
          
          // 2. Save Data to Database (Logging the configuration)
          const res = await fetch("/api/cakes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  name,
                  phone,
                  price: sellingPrice,
                  referenceImage: referenceImageUrl,
                  weightKg, icing, flavour, cakeType, shape, message, withEgg, photoCount, toys, flowers,
              }),
          });

          if (!res.ok) throw new Error("Save failed");
          const data = await res.json();
          const orderId = data.id;

          // 3. Generate QR Link (Needed for final Share button)
          const link = `${window.location.origin}/customise/${orderId}`;
          const qr = await QRCode.toDataURL(link, { margin: 1, width: 160 });
          
          // 4. Update State and Show Modal
          setSavedId(orderId);
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
    
    // Data is already saved (logged) and QR is already generated.
    // We just perform the final actions: download and show success dialog.
    try {
        setSaving(true);
        // Ensure PDF logic is inside a try-catch for external library use
        createAndDownloadImage(savedId, qrDataUrl); 
        
        setShowPricingModal(false);
        setShowDialog(true);
    } catch (e) {
        alert("Failed to generate PDF/Image.");
        console.error("PDF Generation Error:", e);
    } finally {
        setSaving(false);
    }
  };

  const isFondant = icing === "Fondant";
  const isFourKgOrMore = numericWeight >= 4;
  const isBasePromotionActive = isFondant && isFourKgOrMore;

  const currentError = validationErrors.fondantWeight || validationErrors.semiFondantWeight || validationErrors.tierCakeWeight || validationErrors.requiredFields;


  return (
    <main className="px-4 py-6 max-w-7xl mx-auto">
      <h1 className="text-3xl md:text-4xl text-center">Customise Your Cake</h1>
      <p className="text-center mt-2 text-foreground/70">
        Pick options below and watch your cake come to life.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8">
        <section className="rounded-2xl border border-[var(--muted)] bg-white p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2 sm:col-span-2">1. Core Cake Design</h2>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium">Weight</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {weightOptions
                  .map((w) => ({ weight: w, num: parseFloat(w) }))
                  .sort((a, b) => a.num - b.num)
                  .map(({ weight: w }) => (
                    <button
                      key={w}
                      onClick={() => {
                          if (cakeType=="Step Cake / Tier Cake" && parseFloat(w) < MIN_STEP_CAKE_WEIGHT) {
                              // If Step Cake is active and weight is too low, alert and don't change
                              alert(`Step Cake requires ${MIN_STEP_CAKE_WEIGHT}kg or more.`);
                              return;
                          }
                          setWeightKg(w);
                      }}
                      className={`relative px-3 pt-4 pb-2 rounded-md text-sm border transition-colors duration-200 ${
                          (cakeType=="Step Cake / Tier Cake" && parseFloat(w) < MIN_STEP_CAKE_WEIGHT) 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                            : (weightKg === w
                                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                : "bg-white text-foreground border-[var(--muted)] hover:bg-[var(--muted)]/50")
                        }`}
                      aria-pressed={weightKg === w}
                      disabled={cakeType=="Step Cake / Tier Cake" && parseFloat(w) < MIN_STEP_CAKE_WEIGHT}
                    >
                      {w === "0.5" && (
                        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] bg-yellow-500 text-white font-bold px-1 rounded-full shadow-md">
                          PREMIUM
                        </span>
                      )}
                      {w}kg
                    </button>
                  ))}
              </div>
            </div>

            {/* Icing */}
            <div>
              <label className="block text-sm font-medium">Icing Type</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableIcingOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setIcing(opt)}
                    className={`px-3 py-2 rounded-md text-sm border ${icing === opt
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-white text-foreground border-[var(--muted)] hover:bg-[var(--muted)]/50"
                      }`}
                    aria-pressed={icing === opt}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {isFondant && (
                <p className="mt-2 text-sm font-medium text-[var(--primary-600)]">
                  PROMO: If you choose 4kg or more, you get 5 edible toys FREE!
                </p>
              )}
            </div>

            {/* Flavour (Grid with Price) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Flavour (Base Price/kg)</label>
              <div className="mt-2 grid grid-cols-3 md:grid-cols-5 gap-2">
                {flavourPriceMap.map((flavorItem) => (
                  <button
                    key={flavorItem.name}
                    onClick={() => setFlavour(flavorItem.name)}
                    className={`relative p-2 rounded-md text-sm border transition-colors duration-200 text-left ${
                      flavour === flavorItem.name
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-white text-foreground border-[var(--muted)] hover:bg-[var(--muted)]/50"
                    }`}
                    aria-pressed={flavour === flavorItem.name}
                  >
                    <span className="block font-medium leading-tight">{flavorItem.name}</span>
                    <span className="block text-xs font-bold pt-1">
                      +₹{flavorItem.price.toFixed(0)}/kg
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Egg/Eggless */}
            <div>
              <label className="block text-sm font-medium">Egg Status</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setWithEgg(true)}
                  className={`px-3 py-2 rounded-md text-sm border ${withEgg
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "bg-white text-foreground border-[var(--muted)] hover:bg-[var(--muted)]/50"
                    }`}
                  aria-pressed={withEgg}
                >
                  With Egg
                </button>
                <button
                  onClick={() => setWithEgg(false)}
                  className={`px-3 py-2 rounded-md text-sm border ${!withEgg
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "bg-white text-foreground border-[var(--muted)] hover:bg-[var(--muted)]/50"
                    }`}
                  aria-pressed={!withEgg}
                >
                  Eggless
                </button>
              </div>
            </div>

            {/* Cake Type (Buttons) */}
            <div>
              <label className="block text-sm font-medium">Cake Style</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {cakeTypeOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                        // Logic to snap weight to 3kg if step cake is selected and weight is too low
                        if (opt === "Step Cake / Tier Cake" && numericWeight < MIN_STEP_CAKE_WEIGHT) {
                            setWeightKg(MIN_STEP_CAKE_WEIGHT.toString());
                        }
                        setCakeType(opt);
                    }}
                    className={`px-3 py-2 rounded-md text-sm border ${cakeType === opt
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-white text-foreground border-[var(--muted)] hover:bg-[var(--muted)]/50"
                      }`}
                    aria-pressed={cakeType === opt}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape (Buttons with Icons) */}
            <div>
              <label className="block text-sm font-medium">Cake Shape</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {shapeOptions.map((opt) => {
                  const IconComponent = shapeIconMap[opt] || Cake;
                  return (
                    <button
                      key={opt}
                      onClick={() => setShape(opt)}
                      className={`flex items-center space-x-1 p-2 rounded-md text-sm border transition-colors duration-200 ${shape === opt
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-white text-foreground border-[var(--muted)] hover:bg-[var(--muted)]/50"
                        }`}
                      aria-pressed={shape === opt}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- ADD-ONS SECTION (Single Row/Grid) --- */}
            <div className="sm:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[var(--muted)]/50 mt-4">
              
              {/* Photo Count */}
              <div>
                <label className="block text-sm font-medium">Photo Count</label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setPhotoCount((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-md border border-[var(--muted)] hover:bg-[var(--muted)]/50"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-8 text-center">
                    {photoCount}
                  </span>
                  <button
                    onClick={() => setPhotoCount((prev) => prev + 1)}
                    className="w-8 h-8 rounded-md border border-[var(--muted)] hover:bg-[var(--muted)]/50"
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Flower Selection */}
              <div>
                <label className="block text-sm font-medium">Flowers (Max 10)</label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setFlowers((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-md border border-[var(--muted)] hover:bg-[var(--muted)]/50"
                    disabled={flowers === 0}
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-8 text-center">
                    {flowers}
                  </span>
                  <button
                    onClick={() => setFlowers((prev) => Math.min(10, prev + 1))}
                    className="w-8 h-8 rounded-md border border-[var(--muted)] hover:bg-[var(--muted)]/50"
                    disabled={flowers >= 10}
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Toy Selection - Edible & Non-Edible */}
              {toyOptions.map(toyName => (
                <div key={toyName} className="col-span-1">
                  <label className="block text-sm font-medium">{toyName}</label>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setToys(prev => ({
                        ...prev,
                        [toyName]: Math.max(0, (prev[toyName] || 0) - 1)
                      }))}
                      className="w-8 h-8 rounded-md border border-[var(--muted)] hover:bg-[var(--muted)]/50"
                      disabled={!toys[toyName] || toys[toyName] === 0}
                    >
                      -
                    </button>
                    <span className="text-xl font-semibold w-8 text-center">
                      {toys[toyName] || 0}
                    </span>
                    <button
                      onClick={() => setToys(prev => ({
                        ...prev,
                        [toyName]: (prev[toyName] || 0) + 1
                      }))}
                      className="w-8 h-8 rounded-md border border-[var(--muted)] hover:bg-[var(--muted)]/50"
                    >
                      +
                    </button>
                  </div>
                  {/* Promo Note - Simplified display */}
                  {toyName === "Edible Toys" && isBasePromotionActive && (
                    <p className="mt-1 text-xs text-green-600">
                      (5 FREE for 4kg+)
                    </p>
                  )}
                </div>
              ))}
              
            </div>
            {/* --- END ADD-ONS SECTION --- */}


            {/* Text on Cake */}
            <div className="sm:col-span-2 mt-4 pt-4 border-t border-[var(--muted)]/50">
              <label className="block text-sm font-medium">Text on Cake</label>
              <input
                type="text"
                placeholder="Happy Birthday..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 w-full rounded-md border border-[var(--muted)] bg-white px-3 py-2 text-sm"
                maxLength={40}
              />
              <p className="mt-1 text-xs text-foreground/60">
                Max 40 characters
              </p>
            </div>

            {/* Upload reference */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">
                Design reference (optional)
              </label>
              <label className="mt-2 block w-full rounded-md border border-[var(--muted)] bg-white text-sm cursor-pointer hover:bg-[var(--muted)]/50">
                <span className="px-3 py-2 block">Choose File</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
              </label>
              {referenceImage && (
                <div className="mt-3 flex flex-col items-start">
                  <Image
                    src={referenceImage}
                    alt="Design reference"
                    width={160}
                    height={160}
                    className="max-h-40 rounded-md border border-[var(--muted)]"
                  />
                  <button
                    onClick={() => setReferenceImage(null)}
                    className="mt-2 px-3 py-1 rounded-md text-xs text-white bg-red-500 hover:bg-red-600"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Your Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="mt-2 w-full rounded-md border border-[var(--muted)] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Phone Number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="Phone (10 digits)"
                  pattern="[0-9]{10}"
                  className="mt-2 w-full rounded-md border border-[var(--muted)] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* New consent checkbox */}
          <div className="mt-6 flex items-center gap-2">
            <input
              type="checkbox"
              id="consent-checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <label
              htmlFor="consent-checkbox"
              className="text-sm text-foreground/70"
            >
              I agree to save my name and phone number for order tracking and a
              better experience.
            </label>
          </div>

          {/* Validation Error Display */}
          {currentError && (
            <div className="mt-4 rounded-md border border-red-600 bg-red-50 p-3 text-sm text-red-700">
              {currentError}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className={`px-5 py-2 rounded-full text-white text-sm ${isSavable
                ? "bg-[var(--primary)] hover:bg-[var(--primary-600)]"
                : "bg-gray-400 cursor-not-allowed"
                }`}
              disabled={!isSavable || saving}
              onClick={handleNextStep}
            >
              {saving ? "Processing..." : "Next"}
            </button>
          </div>
        </section>
      </div>

      {showPricingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full text-left">
            <h2 className="text-2xl font-semibold mb-4">Pricing Breakdown</h2>
            <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
              {pricingBreakdown.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-foreground/80">{item.label}</span>
                  <span className="font-medium">₹{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <hr className="my-4" />
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>Total Price</span>
              <span>₹{pricingBreakdown.total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-foreground/60 mt-4">
              * Taxes and delivery charges may be added at checkout.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 px-5 py-2 rounded-full border border-[var(--muted)] text-sm hover:bg-[var(--muted)]/50"
                onClick={() => setShowPricingModal(false)}
              >
                Go Back
              </button>
              <button
                className="flex-1 px-5 py-2 rounded-full bg-[var(--primary)] text-white text-sm hover:bg-[var(--primary-600)] disabled:opacity-60"
                onClick={handleFinalShare}
                disabled={saving}
              >
                {saving ? "Sharing..." : "Save & Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
            <h2 className="text-xl font-semibold mb-4">
              Your Custom Cake is Saved!
            </h2>
            <p className="text-foreground/70 mb-4">
              Your cake details have been saved. A PDF has been downloaded
              automatically. You can also scan the QR code below to share the
              link.
            </p>
            {qrDataUrl && (
              <Image
                src={qrDataUrl}
                alt="QR Code"
                width={192}
                height={192}
                className="mx-auto my-4 w-48 h-48 rounded-md"
              />
            )}
            <Link
              href={`/customise/${savedId}`}
              className="text-sm text-[var(--primary)] underline block mt-2"
            >
              View your customisation link
            </Link>
            <button
              onClick={() => setShowDialog(false)}
              className="mt-6 px-5 py-2 rounded-full bg-[var(--primary)] text-white text-sm hover:bg-[var(--primary-600)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}