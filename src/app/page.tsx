import Link from "next/link";

export default function Home() {
  return (
    <main className="font-sans text-foreground">
      {/* Hero */}
      <section className="relative h-[90vh] min-h-[560px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-red-50 via-white to-red-100">
        <div className="absolute inset-0 -z-10">
          <div className="relative w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-red-600/5">
              <video
                src="/cake.mp4"
                className="w-full h-full object-cover opacity-30"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/60" />
          </div>
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-[var(--primary)] text-5xl md:text-7xl leading-tight font-extrabold drop-shadow-sm">
            Baked with Love, Sprinkled with Magic
          </h1>
          <p className="mt-6 text-foreground/80 max-w-2xl mx-auto text-lg md:text-xl font-medium">
            Custom cakes crafted to your taste. Instant dine-in orders straight
            from your table.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/order"
              className="px-8 py-4 rounded-full bg-[var(--primary)] text-white text-base font-bold hover:bg-[var(--primary-600)] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              aria-label="Order at the table"
            >
              🍽️ Order at the Table
            </Link>
            <Link
              href="/customise"
              className="px-8 py-4 rounded-full bg-white text-[var(--primary)] text-base font-bold border-2 border-[var(--primary)] hover:bg-red-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              aria-label="Customize a cake"
            >
              🎂 Customise a Cake
            </Link>
          </div>
        </div>
      </section>

      {/* Order Modes */}
      <section id="order" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl text-center font-semibold">
            Order Your Way
          </h2>
          <p className="text-center mt-2 text-foreground/70 max-w-2xl mx-auto">
            Whether you’re seated in our bakery or planning a celebration, we’ve
            made it effortless.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <Link
              href="/order"
              className="group rounded-2xl p-6 bg-white/70 backdrop-blur border border-[var(--muted)] hover:border-[var(--primary)] transition-colors shadow-sm hover:shadow-md"
              aria-label="Place instant dine-in order"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full grid place-items-center bg-[var(--primary-50)] text-[var(--primary)] text-xl">
                  🍰
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Instant Dine‑In Order
                  </h3>
                  <p className="mt-1 text-foreground/70">
                    Scan, select, and send your order to our kitchen without
                    waiting.
                  </p>
                  <span className="inline-block mt-3 text-sm text-[var(--primary)] group-hover:underline">
                    Start ordering →
                  </span>
                </div>
              </div>
            </Link>
            <Link
              id="customise"
              href="/customise"
              className="group rounded-2xl p-6 bg-white/70 backdrop-blur border border-[var(--muted)] hover:border-[var(--primary)] transition-colors shadow-sm hover:shadow-md"
              aria-label="Customize a cake"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full grid place-items-center bg-[var(--primary-50)] text-[var(--primary)] text-xl">
                  🎂
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Custom Cake Builder</h3>
                  <p className="mt-1 text-foreground/70">
                    Choose flavours, layers, frostings, toppers—see live pricing
                    as you go.
                  </p>
                  <span className="inline-block mt-3 text-sm text-[var(--primary)] group-hover:underline">
                    Design your cake →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl text-center font-bold text-[var(--primary)]">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="rounded-2xl bg-white p-8 border-2 border-red-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl font-bold text-[var(--primary)] mb-3">①</div>
              <h3 className="text-xl font-bold text-foreground">Pick your experience</h3>
              <p className="mt-2 text-foreground/70">
                Dine‑in instant order or custom cake builder.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-8 border-2 border-red-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl font-bold text-[var(--primary)] mb-3">②</div>
              <h3 className="text-xl font-bold text-foreground">Personalise and confirm</h3>
              <p className="mt-2 text-foreground/70">
                Select flavours, sizes, and notes—see transparent pricing.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-8 border-2 border-red-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl font-bold text-[var(--primary)] mb-3">③</div>
              <h3 className="text-xl font-bold text-foreground">We bake the magic</h3>
              <p className="mt-2 text-foreground/70">
                Our chefs craft your order fresh and notify when ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl text-center font-semibold">
            Why Pastry Magiccs?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            <div className="rounded-2xl p-6 bg-white border border-[var(--muted)]">
              <h3 className="font-semibold">Premium Ingredients</h3>
              <p className="mt-1 text-foreground/70">
                Belgian chocolate, real cream, seasonal fruits.
              </p>
            </div>
            <div className="rounded-2xl p-6 bg-white border border-[var(--muted)]">
              <h3 className="font-semibold">Made Fresh Daily</h3>
              <p className="mt-1 text-foreground/70">
                Baked in‑house every morning by our artisans.
              </p>
            </div>
            <div className="rounded-2xl p-6 bg-white border border-[var(--muted)]">
              <h3 className="font-semibold">Transparent Pricing</h3>
              <p className="mt-1 text-foreground/70">
                Live price updates as you customise your cake.
              </p>
            </div>
            <div className="rounded-2xl p-6 bg-white border border-[var(--muted)]">
              <h3 className="font-semibold">Pickup or Delivery</h3>
              <p className="mt-1 text-foreground/70">
                Choose what suits you—we’ll handle the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 px-6 bg-[var(--muted)]/60">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold">Get in Touch</h2>
          <p className="mt-2 text-foreground/70 max-w-2xl mx-auto">
            Have a question? We’d love to hear from you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-24">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full grid place-items-center bg-[var(--primary-50)] text-[var(--primary)] text-xl">
                📍
              </div>
              <div className="text-left">
                <p className="font-semibold">Visit Us</p>
                <p className="text-foreground/70">
                  104, Main Road, OPP. Naval Quarters,
                  <br /> Old Kasara, Sai Nagar, Main Gate,
                  <br /> Visakhapatnam, Andhra Pradesh - 530018
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full grid place-items-center bg-[var(--primary-50)] text-[var(--primary)] text-xl">
                📞
              </div>
              <div className="text-left">
                <p className="font-semibold">Call Us</p>
                <Link
                  href="tel:+919989384800"
                  className="text-foreground/70 hover:underline"
                >
                  +91 9989384800
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 text-center bg-[var(--primary)] text-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold">
            Ready to Taste the Magicc?
          </h2>
          <p className="mt-2 text-white/90">
            Start a custom cake or send your table order now.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/customise"
              className="px-6 py-3 rounded-full bg-white text-[var(--foreground)] text-sm font-medium hover:bg-white/90"
            >
              Start Customising
            </Link>
            <Link
              href="/order"
              className="px-6 py-3 rounded-full border border-white text-white text-sm font-medium hover:bg-white hover:text-[var(--foreground)]"
            >
              Dine‑In Order
            </Link>
          </div>
        </div>
      </section>
      <footer className="bg-[var(--primary)] text-white py-6 px-6 text-center text-sm text-foreground/70">
        <p className="mt-6 text-sm">
          © {new Date().getFullYear()} Pastry Magiccs. Designed and Built by <a href="https://tedestudio.com" target="_blank">TedeStudio</a>
        </p>
      </footer>
    </main>
  );
}
