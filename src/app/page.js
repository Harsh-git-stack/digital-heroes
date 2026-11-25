"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { normalizeProduct } from "@/lib/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Layers3,
  Menu,
  Palette,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

const initialProducts = [
  {
    id: "labels",
    label: "Labels & stickers",
    title: "Labels that travel further.",
    copy: "Durable, detailed labels for products, packaging and promotions.",
    base: 5.5,
    tint: "bg-lime-300",
    minSize: 20,
    maxSize: 500,
    sizes: [
      { label: "50 × 50 mm", width: 50, height: 50 },
      { label: "75 × 75 mm", width: 75, height: 75 },
      { label: "100 × 100 mm", width: 100, height: 100 },
    ],
    materials: [
      { label: "Matte vinyl", multiplier: 1 },
      { label: "Gloss vinyl", multiplier: 1.15 },
      { label: "Clear film", multiplier: 1.3 },
    ],
  },
  {
    id: "race",
    label: "Race & event numbers",
    title: "Built for the starting line.",
    copy: "Weather-ready event numbers with variable-data support.",
    base: 18,
    tint: "bg-orange-300",
    minSize: 80,
    maxSize: 600,
    sizes: [
      { label: "A5", width: 148, height: 210 },
      { label: "A4", width: 210, height: 297 },
      { label: "A3", width: 297, height: 420 },
    ],
    materials: [
      { label: "Tyvek", multiplier: 1 },
      { label: "Synthetic paper", multiplier: 1.2 },
      { label: "Reflective stock", multiplier: 1.45 },
    ],
  },
  {
    id: "mtb",
    label: "MTB boards",
    title: "Made for mud and momentum.",
    copy: "Tough custom boards for riders, trails and race organisers.",
    base: 120,
    tint: "bg-cyan-300",
    minSize: 100,
    maxSize: 600,
    sizes: [
      { label: "200 × 150 mm", width: 200, height: 150 },
      { label: "250 × 180 mm", width: 250, height: 180 },
      { label: "300 × 200 mm", width: 300, height: 200 },
    ],
    materials: [
      { label: "PVC board", multiplier: 1 },
      { label: "Correx board", multiplier: 1.15 },
      { label: "Aluminium composite", multiplier: 1.8 },
    ],
  },
  {
    id: "stamps",
    label: "Stamps",
    title: "Small tools. Clear marks.",
    copy: "Precise custom stamps for everyday work.",
    base: 220,
    tint: "bg-fuchsia-300",
    minSize: 15,
    maxSize: 150,
    sizes: [
      { label: "Small / 30 mm", width: 30, height: 30 },
      { label: "Medium / 45 mm", width: 45, height: 45 },
      { label: "Large / 60 mm", width: 60, height: 60 },
    ],
    materials: [
      { label: "Self-inking", multiplier: 1 },
      { label: "Wood handle", multiplier: 1.1 },
      { label: "Heavy-duty", multiplier: 1.35 },
    ],
  },
  {
    id: "trophies",
    label: "Trophies",
    title: "Recognition worth holding.",
    copy: "Awards with considered personalisation.",
    base: 420,
    tint: "bg-yellow-300",
    minSize: 80,
    maxSize: 500,
    sizes: [
      { label: "150 mm", width: 100, height: 150 },
      { label: "220 mm", width: 140, height: 220 },
      { label: "300 mm", width: 190, height: 300 },
    ],
    materials: [
      { label: "Acrylic", multiplier: 1 },
      { label: "Metal cup", multiplier: 1.35 },
      { label: "Crystal", multiplier: 1.75 },
    ],
  },
  {
    id: "laser",
    label: "Laser-cut work",
    title: "Cut with intention.",
    copy: "Laser-cut pieces for displays, signage and retail.",
    base: 160,
    tint: "bg-violet-300",
    minSize: 30,
    maxSize: 1000,
    sizes: [
      { label: "100 × 100 mm", width: 100, height: 100 },
      { label: "200 × 200 mm", width: 200, height: 200 },
      { label: "300 × 300 mm", width: 300, height: 300 },
    ],
    materials: [
      { label: "Birch ply", multiplier: 1 },
      { label: "Acrylic", multiplier: 1.25 },
      { label: "MDF", multiplier: 0.9 },
    ],
  },
];

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function ProductArtwork({ productId }) {
  if (productId === "labels") {
    return (
      <div className="relative grid h-full w-full place-items-center bg-[#e7e5d8]">
        <div className="absolute left-[17%] top-[20%] grid h-24 w-28 -rotate-6 place-items-center rounded-2xl bg-lime-300 p-3 text-center text-stone-950 shadow-xl">
          <span className="text-[9px] font-black uppercase tracking-[.18em]">Field notes</span>
          <span className="text-2xl font-black leading-none">08</span>
        </div>
        <div className="absolute bottom-[18%] right-[14%] grid h-20 w-24 rotate-6 place-items-center rounded-full bg-stone-950 p-3 text-center text-white shadow-xl">
          <span className="text-[8px] uppercase tracking-[.16em]">Made with</span>
          <span className="text-sm font-bold text-orange-300">good care</span>
        </div>
      </div>
    );
  }

  if (productId === "race") {
    return (
      <div className="grid h-full w-full place-items-center bg-orange-200 p-6">
        <div className="relative grid h-full max-h-44 w-40 place-items-center border-4 border-stone-950 bg-white text-stone-950 shadow-xl">
          <span className="absolute left-0 top-0 h-3 w-full bg-orange-500" />
          <span className="absolute top-5 text-[9px] font-black uppercase tracking-[.2em]">Trail / 2026</span>
          <span className="text-7xl font-black leading-none tracking-[-.08em]">27</span>
          <span className="absolute bottom-4 text-[9px] font-bold uppercase tracking-[.18em]">Run your line</span>
        </div>
      </div>
    );
  }

  if (productId === "mtb") {
    return (
      <div className="grid h-full w-full place-items-center bg-cyan-200 p-6">
        <div className="grid h-36 w-56 -rotate-3 place-items-center rounded-[2rem] border-[10px] border-stone-950 bg-stone-950 text-center text-white shadow-xl">
          <span className="text-[9px] font-bold uppercase tracking-[.24em] text-cyan-300">North ridge</span>
          <span className="text-6xl font-black leading-none">84</span>
          <span className="text-[9px] font-bold uppercase tracking-[.2em]">Race series</span>
        </div>
      </div>
    );
  }

  if (productId === "stamps") {
    return (
      <div className="grid h-full w-full place-items-center bg-fuchsia-100 p-6">
        <div className="grid h-36 w-36 -rotate-6 place-items-center rounded-full border-[3px] border-dashed border-stone-800 text-center text-stone-800">
          <div className="grid h-28 w-28 place-items-center rounded-full border border-stone-800">
            <span className="text-[9px] font-bold uppercase tracking-[.2em]">Print / Co.</span>
            <span className="text-2xl font-black tracking-tight">LOCAL</span>
            <span className="text-[8px] uppercase tracking-[.18em]">Since 2018</span>
          </div>
        </div>
      </div>
    );
  }

  if (productId === "trophies") {
    return (
      <div className="grid h-full w-full place-items-center bg-yellow-100 p-6">
        <div className="flex items-center gap-5 rounded-3xl bg-white/80 p-6 shadow-xl">
          <div className="grid h-28 w-20 place-items-center rounded-t-[2rem] rounded-b-xl border-4 border-yellow-500 bg-yellow-300 text-stone-900">
            <span className="text-4xl font-black">1</span>
          </div>
          <div className="max-w-28">
            <span className="text-[9px] font-bold uppercase tracking-[.18em] text-stone-500">Awarded to</span>
            <p className="mt-1 text-xl font-black leading-tight text-stone-900">The<br />makers.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full w-full place-items-center bg-violet-100 p-6">
      <div className="relative grid h-36 w-56 place-items-center border border-violet-400 bg-white/80 shadow-xl">
        <div className="absolute -left-4 -top-4 h-10 w-10 rotate-45 border-2 border-violet-500 bg-violet-200" />
        <div className="absolute -bottom-4 -right-4 h-12 w-12 rounded-full border-2 border-violet-500 bg-violet-200" />
        <div className="text-center text-stone-900">
          <span className="text-[9px] font-bold uppercase tracking-[.2em]">Studio / 04</span>
          <p className="mt-1 text-2xl font-black tracking-tight">FORM<br />FOLLOWS</p>
        </div>
      </div>
    </div>
  );
}

function GalleryCard({ product, onSelect }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-stone-800 bg-stone-950">
      <div className="relative h-60 overflow-hidden">
        <ProductArtwork productId={product.id} />
        <span className="absolute left-4 top-4 rounded-full bg-stone-950/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-white">
          Concept preview
        </span>
      </div>
      <div className="flex items-end justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-stone-500">{product.label}</p>
          <h3 className="mt-2 text-lg font-semibold">{product.title}</h3>
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Configure ${product.label}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-stone-700 transition group-hover:border-lime-300 group-hover:bg-lime-300 group-hover:text-stone-950"
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </article>
  );
}

export default function Home() {
  const [products, setProducts] = useState(initialProducts);
  const [productId, setProductId] = useState("labels");
  const [sizePreset, setSizePreset] = useState("0");
  const [dimensions, setDimensions] = useState({ width: 50, height: 50 });
  const [orientation, setOrientation] = useState("portrait");
  const [materialIndex, setMaterialIndex] = useState(0);
  const [quantity, setQuantity] = useState("100");
  const [designText, setDesignText] = useState("MAKE IT MATTER");
  const [designColor, setDesignColor] = useState("#f97316");
  const [fontSize, setFontSize] = useState(22);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(50);
  const [rotation, setRotation] = useState(0);
  const [artworkFile, setArtworkFile] = useState(null);
  const [artworkPreview, setArtworkPreview] = useState("");
  const [notice, setNotice] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState(null);
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(Boolean(supabase));
  const [catalogError, setCatalogError] = useState("");
  const [designTemplates, setDesignTemplates] = useState([]);
  const [templateError, setTemplateError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const product = products.find((item) => item.id === productId) ?? products[0];
  const fallbackSize = product.sizes[0];
  const activeMaterialIndex = Math.min(materialIndex, product.materials.length - 1);
  const safeWidth = Math.min(product.maxSize, Math.max(product.minSize, Number(dimensions.width) || fallbackSize.width));
  const safeHeight = Math.min(product.maxSize, Math.max(product.minSize, Number(dimensions.height) || fallbackSize.height));
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

  const price = useMemo(() => {
    const baseArea = product.sizes[0].width * product.sizes[0].height;
    const sizeMultiplier = Math.sqrt((safeWidth * safeHeight) / baseArea);
    const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
    const unit = roundCurrency(product.base * sizeMultiplier * product.materials[activeMaterialIndex].multiplier);
    const subtotal = roundCurrency(unit * safeQuantity);
    const discountTiers = product.volumeDiscounts ?? [
      { minimum: 100, percent: 10 },
      { minimum: 500, percent: 18 },
    ];
    const eligibleTier = discountTiers
      .filter((tier) => safeQuantity >= tier.minimum)
      .sort((first, second) => second.minimum - first.minimum)[0];
    const rate = eligibleTier
      ? eligibleTier.percent / 100
      : safeQuantity >= (product.volumeDiscountThreshold ?? 100)
        ? (product.discountPercent ?? 10) / 100
        : 0;
    const discount = roundCurrency(subtotal * rate);
    const taxable = subtotal - discount;
    const tax = roundCurrency(taxable * 0.18);

    return { unit, subtotal, rate, discount, tax, total: taxable + tax };
  }, [activeMaterialIndex, product, safeHeight, safeQuantity, safeWidth]);

  useEffect(() => () => {
    if (artworkPreview) URL.revokeObjectURL(artworkPreview);
  }, [artworkPreview]);

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;

    async function loadCatalog() {
      try {
        const [productsResult, templatesResult] = await Promise.all([
          supabase.from("products")
            .select("id,slug,division,name,description,base_price,config,volume_discount_threshold,discount_percent")
            .eq("active", true)
            .order("division"),
          supabase.from("templates")
            .select("id,product_id,name,description,content")
            .eq("template_type", "design")
            .eq("active", true)
            .order("name"),
        ]);
        if (productsResult.error) throw new Error(productsResult.error.message);
        if (templatesResult.error && active) setTemplateError(templatesResult.error.message);
        else if (active) setDesignTemplates(templatesResult.data ?? []);

        const liveProducts = (productsResult.data ?? []).map((row, index) => normalizeProduct(row, index));
        if (liveProducts.length === 0) throw new Error("No active products are available.");
        if (!active) return;
        setProducts(liveProducts);
        setCatalogError("");
      } catch (error) {
        if (active) setCatalogError(error instanceof Error ? error.message : "Could not load products.");
      } finally {
        if (active) setCatalogLoading(false);
      }
    }

    void loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  function chooseProduct(id) {
    const nextProduct = products.find((item) => item.id === id);
    if (!nextProduct) return;

    const firstSize = nextProduct.sizes[0];
    setProductId(id);
    setSizePreset("0");
    setDimensions({ width: firstSize.width, height: firstSize.height });
    setOrientation(firstSize.width > firstSize.height ? "landscape" : "portrait");
    setMaterialIndex(0);
    setSelectedTemplateId("");
    setNotice("");
    setMenuOpen(false);
    document.getElementById("configure")?.scrollIntoView({ behavior: "smooth" });
  }

  function applyDesignTemplate(templateId) {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = designTemplates.find((item) => item.id === templateId);
    if (!template) return;

    const content = template.content ?? {};
    const clamp = (value, minimum, maximum, fallback) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
    };
    setDesignText(String(content.text ?? ""));
    setDesignColor(/^#[0-9a-f]{6}$/i.test(content.color ?? "") ? content.color : "#f97316");
    setFontSize(clamp(content.font_size, 8, 100, 22));
    setTextX(clamp(content.position?.x, 0, 100, 50));
    setTextY(clamp(content.position?.y, 0, 100, 50));
    setRotation(clamp(content.position?.rotation, -45, 45, 0));
    setNotice(`${template.name} applied to your design.`);
  }

  function selectSize(value) {
    setSizePreset(value);
    if (value === "custom") return;

    const selectedSize = product.sizes[Number(value)];
    setDimensions({ width: selectedSize.width, height: selectedSize.height });
    setOrientation(selectedSize.width > selectedSize.height ? "landscape" : "portrait");
  }

  function updateDimension(key, value) {
    setSizePreset("custom");
    if (value === "") {
      setDimensions((current) => ({ ...current, [key]: "" }));
      return;
    }

    const nextValue = Math.min(product.maxSize, Math.max(product.minSize, Number(value) || product.minSize));
    setDimensions((current) => ({ ...current, [key]: nextValue }));
    setOrientation(
      key === "width"
        ? nextValue > Number(dimensions.height) ? "landscape" : "portrait"
        : Number(dimensions.width) > nextValue ? "landscape" : "portrait",
    );
  }

  function setPrintOrientation(nextOrientation) {
    if (
      (nextOrientation === "landscape" && Number(dimensions.width) < Number(dimensions.height)) ||
      (nextOrientation === "portrait" && Number(dimensions.width) > Number(dimensions.height))
    ) {
      setDimensions((current) => ({ ...current, width: current.height, height: current.width }));
      setSizePreset("custom");
    }
    setOrientation(nextOrientation);
  }

  function saveConfiguration() {
    setNotice("");
    setCreatedOrderNumber(null);

    if (catalogLoading) {
      setNotice("Product information is still loading. Please try again in a moment.");
      return;
    }
    if (catalogError) {
      setNotice(`Could not save your quote because the catalog failed to load: ${catalogError}`);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setNotice("Supabase is not configured. Add the project URL and publishable key before saving a quote.");
      return;
    }

    setOrdering(true);
    void (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          setNotice(`Could not verify your account: ${authError.message}`);
          return;
        }

        if (!authData.user) {
          setNotice("Sign in or create an account to save this quote.");
          return;
        }

        const { data, error } = await supabase.rpc("create_customer_order", {
          p_product_slug: product.id,
          p_quantity: safeQuantity,
          p_width_mm: safeWidth,
          p_height_mm: safeHeight,
          p_material: product.materials[activeMaterialIndex].label,
          p_design_content: {
            name: designText.trim() || `${product.label} design`,
            text: designText,
            color: designColor,
            font_size: Number(fontSize),
            position: { x: Number(textX), y: Number(textY), rotation: Number(rotation) },
            artwork_file_name: artworkFile?.name ?? null,
            configuration: {
              width_mm: safeWidth,
              height_mm: safeHeight,
              material: product.materials[activeMaterialIndex].label,
              quantity: safeQuantity,
              orientation,
            },
          },
        });

        if (error) {
          setNotice(`Could not save your quote: ${error.message}`);
          return;
        }

        const createdOrder = Array.isArray(data) ? data[0] : data;
        if (!createdOrder?.created_order_number || !createdOrder?.created_order_id) {
          setNotice("The quote was not created. Please try again.");
          return;
        }

        setCreatedOrderNumber(createdOrder.created_order_number);
        if (artworkFile) {
          const safeFileName = artworkFile.name.replace(/[^\w.-]/g, "_").slice(-100);
          const filePath = `${authData.user.id}/${createdOrder.created_order_id}/artwork/${window.crypto.randomUUID()}-${safeFileName}`;
          const { error: uploadError } = await supabase.storage.from("artwork").upload(filePath, artworkFile, {
            contentType: artworkFile.type || "application/octet-stream",
            upsert: false,
          });

          if (uploadError) {
            setNotice(`Quote #${createdOrder.created_order_number} was saved, but artwork upload failed: ${uploadError.message}`);
            return;
          }

          const { error: attachError } = await supabase.rpc("attach_customer_artwork", {
            p_order_id: createdOrder.created_order_id,
            p_file_path: filePath,
          });
          if (attachError) {
            const { error: removeError } = await supabase.storage.from("artwork").remove([filePath]);
            setNotice(`Quote #${createdOrder.created_order_number} was saved, but artwork could not be attached: ${attachError.message}${removeError ? ` Cleanup also failed: ${removeError.message}` : ""}`);
            return;
          }
        }

        setNotice(artworkFile
          ? `Quote #${createdOrder.created_order_number} and artwork saved. No payment has been taken.`
          : `Quote #${createdOrder.created_order_number} saved. No payment has been taken.`);
      } catch (requestError) {
        setNotice(requestError instanceof Error ? `Could not save your quote: ${requestError.message}` : "Could not save your quote. Please try again.");
      } finally {
        setOrdering(false);
      }
    })();
  }

  function handleArtworkChange(event) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    const extension = file?.name.toLowerCase().split(".").pop();
    if (file && !["pdf", "svg", "ai", "png", "jpg", "jpeg"].includes(extension)) {
      setNotice("Choose a PDF, SVG, AI, PNG or JPG artwork file.");
      return;
    }
    if (file && file.size > 15 * 1024 * 1024) {
      setNotice("Artwork must be 15 MB or smaller.");
      return;
    }

    setArtworkFile(file);
    setArtworkPreview(file?.type.startsWith("image/") ? URL.createObjectURL(file) : "");
    setNotice("");
  }

  const galleryProducts = galleryFilter === "all"
    ? products
    : products.filter((item) => item.id === galleryFilter);
  const previewRatio = Math.min(1.8, Math.max(0.65, safeWidth / safeHeight));

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8" aria-label="Main navigation">
        <a href="#top" className="flex items-center gap-3 font-bold tracking-tight" aria-label="PrintForge home">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-lime-300 text-stone-950"><Layers3 size={19} /></span>
          PRINTFORGE<span className="-ml-3 text-lime-300">.</span>
        </a>
        <div className="hidden gap-7 text-sm text-stone-300 md:flex">
          <a className="transition hover:text-lime-300" href="#products">Products</a>
          <a className="transition hover:text-lime-300" href="#work">Work gallery</a>
          <a className="transition hover:text-lime-300" href="#configure">Configurator</a>
          <a className="transition hover:text-lime-300" href="#how-it-works">How it works</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-semibold text-stone-300 transition hover:text-lime-300 sm:block">Sign in</Link>
          <Link href="/login" className="hidden rounded-full border border-stone-700 px-4 py-2.5 text-sm font-semibold text-stone-200 transition hover:border-lime-300 hover:text-lime-300 sm:block">Create account</Link>
          <a href="#configure" className="hidden rounded-full bg-lime-300 px-4 py-2.5 text-sm font-bold text-stone-950 transition hover:bg-lime-200 sm:block">
            Start a project
          </a>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-stone-700 md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="absolute left-4 right-4 top-[calc(100%-0.5rem)] grid gap-1 rounded-2xl border border-stone-800 bg-stone-900 p-3 shadow-2xl md:hidden">
            {[["Products", "#products"], ["Work gallery", "#work"], ["Configurator", "#configure"], ["How it works", "#how-it-works"]].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-stone-200 hover:bg-stone-800">
                {label}
              </a>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-stone-200 hover:bg-stone-800">
              Sign in
            </Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-stone-200 hover:bg-stone-800">
              Create account
            </Link>
            <a href="#configure" onClick={() => setMenuOpen(false)} className="mt-1 rounded-xl bg-lime-300 px-4 py-3 text-sm font-bold text-stone-950">
              Start a project
            </a>
          </div>
        )}
      </nav>

      <section id="top" className="mx-auto max-w-7xl px-5 pb-20 pt-10 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.22em] text-lime-300"><Sparkles size={14} /> Web-to-print, without compromise</p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[.94] tracking-[-.06em] sm:text-7xl lg:text-8xl">
              Print work.<br /><span className="text-lime-300">Made personal.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-stone-300 sm:text-lg">
              Configure, design, approve and reorder high-quality custom print work from one production-ready platform.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#products" className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-3 text-sm font-bold text-stone-950">
                Explore products <ArrowRight size={17} />
              </a>
              <a href="#work" className="rounded-full border border-stone-700 px-5 py-3 text-sm font-bold transition hover:border-stone-500">
                See the work
              </a>
            </div>
          </div>
          <div className="relative min-h-72 overflow-hidden rounded-[2rem] bg-orange-300 p-7 text-stone-950 sm:min-h-80">
            <div className="absolute -right-12 -top-14 h-56 w-56 rounded-full border-[24px] border-stone-950" />
            <div className="absolute bottom-0 right-4 h-44 w-44 rotate-12 rounded-[2rem] bg-stone-950" />
            <div className="relative flex h-full flex-col justify-between">
              <p className="text-xs font-bold uppercase tracking-[.2em]">Production-ready from day one</p>
              <div>
                <p className="max-w-64 text-3xl font-semibold leading-tight">Your idea, proofed before it prints.</p>
                <p className="mt-5 flex flex-wrap gap-2 text-sm font-semibold"><Check size={17} /> Design control <Check size={17} /> Live pricing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="border-y border-stone-800 bg-stone-900/50" aria-labelledby="products-heading">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">Six specialist divisions</p>
              <h2 id="products-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">One place to make the work.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-stone-400">Choose a division to configure your product with live, transparent production pricing.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((item, index) => (
              <button
                type="button"
                key={item.id}
                onClick={() => chooseProduct(item.id)}
                className="group min-h-52 rounded-3xl border border-stone-800 bg-stone-950 p-6 text-left transition hover:-translate-y-1 hover:border-stone-600"
              >
                <div className={"mb-11 grid h-10 w-10 place-items-center rounded-full " + item.tint + " text-stone-950"}><ChevronRight size={20} /></div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-stone-500">0{index + 1} / {item.label}</p>
                <h3 className="mt-2 text-xl font-semibold group-hover:text-lime-300">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{item.copy}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="work" className="mx-auto max-w-7xl px-5 py-20 lg:px-8" aria-labelledby="work-heading">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">Made across six divisions</p>
            <h2 id="work-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A feel for the finished piece.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-stone-400">Explore illustrative product concepts by print family. Replace these previews with production photography as the real-work gallery is connected.</p>
        </div>
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label="Filter work examples">
          {[["all", "All work"], ...products.map((item) => [item.id, item.label])].map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setGalleryFilter(id)}
              aria-pressed={galleryFilter === id}
              className={"shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition " + (galleryFilter === id ? "border-lime-300 bg-lime-300 text-stone-950" : "border-stone-700 text-stone-300 hover:border-stone-500")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryProducts.map((item) => (
            <GalleryCard key={item.id} product={item} onSelect={() => chooseProduct(item.id)} />
          ))}
        </div>
      </section>

      <section id="configure" className="border-y border-stone-800 bg-stone-900/40" aria-labelledby="configure-heading">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">Instant quote</p>
            <h2 id="configure-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Configure it your way.</h2>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[.8fr_1.2fr_.8fr]">
            <aside className="rounded-3xl border border-stone-800 bg-stone-900 p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-[.16em] text-stone-400">Product division</p>
              <div className="space-y-1.5">
                {products.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => chooseProduct(item.id)}
                    aria-pressed={product.id === item.id}
                    className={"flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition " + (productId === item.id ? "bg-lime-300 font-bold text-stone-950" : "text-stone-300 hover:bg-stone-800")}
                  >
                    {item.label}<ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0 rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-7" aria-label="Product configuration and designer">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">{product.label}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{product.title}</h3>
                </div>
                <Palette className="text-stone-500" />
              </div>
              {catalogError && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-200">Could not load live products: {catalogError}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-stone-300">
                  Size preset
                  <select value={sizePreset} onChange={(event) => selectSize(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 outline-none focus:border-lime-300">
                    {product.sizes.map((size, index) => <option key={size.label} value={index}>{size.label}</option>)}
                    <option value="custom">Custom dimensions</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-stone-300">
                  Material
                  <select value={activeMaterialIndex} onChange={(event) => setMaterialIndex(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 outline-none focus:border-lime-300">
                    {product.materials.map((material, index) => <option key={material.label} value={index}>{material.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-stone-300">
                  Width (mm)
                  <input min={product.minSize} max={product.maxSize} step="1" type="number" value={safeWidth} onChange={(event) => updateDimension("width", event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 outline-none focus:border-lime-300" />
                </label>
                <label className="text-sm font-medium text-stone-300">
                  Height (mm)
                  <input min={product.minSize} max={product.maxSize} step="1" type="number" value={safeHeight} onChange={(event) => updateDimension("height", event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 outline-none focus:border-lime-300" />
                </label>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-medium text-stone-300">Orientation</legend>
                  <div className="flex gap-2">
                    {["portrait", "landscape"].map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setPrintOrientation(value)}
                        aria-pressed={orientation === value}
                        className={"rounded-full border px-4 py-2 text-xs font-semibold capitalize transition " + (orientation === value ? "border-lime-300 bg-lime-300 text-stone-950" : "border-stone-700 text-stone-300 hover:border-stone-500")}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="text-sm font-medium text-stone-300">
                  Quantity
                  <input min="1" step="1" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 outline-none focus:border-lime-300" />
                </label>
                <div className="rounded-xl border border-dashed border-stone-700 px-4 py-3">
                  <p className="text-xs text-stone-500">Volume saving</p>
                  <p className="mt-1 text-sm font-bold text-lime-300">{price.rate ? `${price.rate * 100}% applied` : "10% from 100 units"}</p>
                </div>
                <p className="text-xs leading-5 text-stone-500 sm:col-span-2">
                  Printable size range: {product.minSize}–{product.maxSize} mm. Custom dimensions update your estimate instantly.
                </p>
              </div>

              <div className="mt-7 border-t border-stone-800 pt-6">
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-stone-400">Designer / proof preview</p>
                  <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[10px] font-semibold text-stone-400">PRINT AREA</span>
                </div>
                <label className="mb-4 block max-w-md text-sm font-medium text-stone-300">
                  Start from a design template
                  <select value={selectedTemplateId} onChange={(event) => applyDesignTemplate(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 outline-none focus:border-lime-300">
                    <option value="">Choose a preset…</option>
                    {designTemplates
                      .filter((template) => !template.product_id || template.product_id === product.databaseId)
                      .map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                  {templateError && <span className="mt-1 block text-xs text-orange-300">Templates are unavailable: {templateError}</span>}
                </label>
                <div className="grid gap-4 xl:grid-cols-[1fr_.72fr]">
                  <div className="min-w-0">
                    <div className="grid place-items-center overflow-hidden rounded-2xl bg-stone-100 p-5" style={{ aspectRatio: String(previewRatio) }}>
                      <div className="relative h-full w-full overflow-hidden border-2 border-dashed border-stone-400 bg-white">
                        <div className="absolute inset-[8%] grid place-items-center overflow-hidden border border-stone-200">
                          {artworkPreview && (
                            <Image src={artworkPreview} alt="Uploaded artwork preview" fill unoptimized sizes="(max-width: 768px) 90vw, 40vw" className="object-contain p-2" />
                          )}
                          <p
                            style={{
                              color: designColor,
                              fontSize: `clamp(12px, ${fontSize}px, 9vw)`,
                              left: `${textX}%`,
                              top: `${textY}%`,
                              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                            }}
                            className="absolute z-10 max-w-[78%] break-words text-center font-black leading-tight tracking-tight"
                          >
                            {designText || "YOUR ARTWORK"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">{safeWidth} × {safeHeight} mm · Elements stay inside the printable zone.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-stone-300">
                      Text
                      <input value={designText} onChange={(event) => setDesignText(event.target.value)} maxLength="36" className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 outline-none focus:border-lime-300" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm font-medium text-stone-300">
                        Colour
                        <input type="color" value={designColor} onChange={(event) => setDesignColor(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-700 bg-stone-950 p-1" />
                      </label>
                      <label className="text-sm font-medium text-stone-300">
                        Font size
                        <input type="range" min="12" max="38" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-4 w-full accent-lime-300" />
                      </label>
                    </div>
                    <label className="block text-sm font-medium text-stone-300">
                      Position left / right
                      <input type="range" min="18" max="82" value={textX} onChange={(event) => setTextX(Number(event.target.value))} className="mt-2 w-full accent-lime-300" />
                    </label>
                    <label className="block text-sm font-medium text-stone-300">
                      Position top / bottom
                      <input type="range" min="18" max="82" value={textY} onChange={(event) => setTextY(Number(event.target.value))} className="mt-2 w-full accent-lime-300" />
                    </label>
                    <label className="block text-sm font-medium text-stone-300">
                      Rotate artwork
                      <input type="range" min="-45" max="45" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} className="mt-2 w-full accent-lime-300" />
                    </label>
                    <button
                      type="button"
                      onClick={() => { setTextX(50); setTextY(50); setRotation(0); }}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 transition hover:text-lime-300"
                    >
                      <RotateCcw size={14} /> Reset placement
                    </button>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-700 px-3 py-3 text-sm text-stone-300 transition hover:border-stone-500">
                      <Upload size={16} />
                      <span className="truncate">{artworkFile?.name || "Upload artwork"}</span>
                      <input type="file" accept=".pdf,.svg,.ai,.png,.jpg,.jpeg" className="sr-only" onChange={handleArtworkChange} />
                    </label>
                    <p className="text-[11px] leading-5 text-stone-500">PDF, SVG, AI, PNG or JPG. Images preview locally; selected artwork uploads with the quote (15 MB max).</p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-3xl bg-lime-300 p-6 text-stone-950 lg:sticky lg:top-6">
              <p className="text-xs font-bold uppercase tracking-[.16em]">Your instant price</p>
              <p className="mt-5 text-4xl font-semibold tracking-[-.05em]">{money.format(price.total)}</p>
              <p className="mt-1 text-sm font-medium text-stone-700">GST included · {safeQuantity} units</p>
              <div className="my-6 space-y-3 border-y border-stone-950/15 py-5 text-sm">
                <div className="flex justify-between gap-3"><span>Unit price</span><span>{money.format(price.unit)}</span></div>
                <div className="flex justify-between gap-3"><span>Subtotal</span><span>{money.format(price.subtotal)}</span></div>
                <div className="flex justify-between gap-3"><span>Volume discount</span><span>-{money.format(price.discount)}</span></div>
                <div className="flex justify-between gap-3"><span>GST / 18%</span><span>{money.format(price.tax)}</span></div>
              </div>
              <button type="button" disabled={ordering} onClick={saveConfiguration} className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-wait disabled:opacity-70">
                {ordering ? "Saving quote…" : "Save quote"} <ArrowRight size={17} />
              </button>
              {notice && <p role="status" className="mt-4 rounded-xl bg-stone-950/10 p-3 text-xs leading-5">{notice}</p>}
              {notice.includes("Sign in") && <Link href="/login" target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs font-bold underline">Sign in in a new tab, then save this quote</Link>}
              {createdOrderNumber && <Link href="/account" className="mt-3 block text-center text-xs font-bold underline">View quote #{createdOrderNumber} in your account</Link>}
              <p className="mt-5 text-xs leading-5 text-stone-700">Quotes are saved unpaid. Arrange payment with the print team; production files require an admin-recorded payment and proof approval.</p>
            </aside>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-stone-900/50" aria-labelledby="steps-heading">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">A clearer production path</p>
          <h2 id="steps-heading" className="sr-only">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Configure", "Choose product parameters and see a transparent instant price."],
              ["02", "Proof", "Create artwork or upload files, then approve the right version."],
              ["03", "Produce", "Track each job from order to finished production."],
            ].map(([number, title, copy]) => (
              <article key={number} className="rounded-3xl border border-stone-800 bg-stone-950 p-6">
                <span className="text-sm font-bold text-lime-300">{number}</span>
                <h3 className="mt-10 text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p className="font-semibold text-stone-200">PRINTFORGE<span className="text-lime-300">.</span></p>
        <p>Built for precise work, repeat orders and reliable production.</p>
      </footer>
    </main>
  );
}
