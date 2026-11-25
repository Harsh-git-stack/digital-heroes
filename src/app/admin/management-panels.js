"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Save } from "lucide-react";
import { normalizeProductConfig } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";

const PRODUCT_CONFIG_EXAMPLE = {
  sizes: [{ label: "Standard", width: 100, height: 100 }],
  materials: ["Standard"],
  base_size: { width: 100, height: 100 },
  dimensions: { min: 10, max: 1000 },
  material_factors: { Standard: 1 },
  volume_discounts: [{ minimum: 100, percent: 10 }],
};

const DEFAULT_DESIGN_TEMPLATE = {
  text: "YOUR TEXT",
  color: "#f97316",
  font_size: 22,
  position: { x: 50, y: 50, rotation: 0 },
};

const DEFAULT_PRODUCTION_TEMPLATE = { bleed_mm: 3, dpi: 300 };

const tableClass = "w-full min-w-[700px] text-left text-sm";
const inputClass = "mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none focus:border-lime-300";
const labelClass = "block text-xs font-semibold text-stone-400";

function emptyProduct() {
  return {
    id: "",
    slug: "",
    division: "",
    name: "",
    description: "",
    base_price: "10",
    volume_discount_threshold: "100",
    discount_percent: "10",
    active: true,
    configText: JSON.stringify(PRODUCT_CONFIG_EXAMPLE, null, 2),
  };
}

function emptyTemplate(templateType = "design") {
  return {
    id: "",
    template_type: templateType,
    product_id: "",
    name: "",
    description: "",
    active: true,
    contentText: JSON.stringify(
      templateType === "design" ? DEFAULT_DESIGN_TEMPLATE : DEFAULT_PRODUCTION_TEMPLATE,
      null,
      2,
    ),
  };
}

function productToForm(product) {
  return {
    id: product.id,
    slug: product.slug,
    division: product.division,
    name: product.name,
    description: product.description,
    base_price: String(product.base_price),
    volume_discount_threshold: String(product.volume_discount_threshold),
    discount_percent: String(product.discount_percent),
    active: product.active,
    configText: JSON.stringify(product.config, null, 2),
  };
}

function templateToForm(template) {
  return {
    id: template.id,
    template_type: template.template_type,
    product_id: template.product_id ?? "",
    name: template.name,
    description: template.description,
    active: template.active,
    contentText: JSON.stringify(template.content, null, 2),
  };
}

export default function AdminManagementPanels({ adminId }) {
  const [section, setSection] = useState("customers");
  const [profiles, setProfiles] = useState([]);
  const [ordersByUser, setOrdersByUser] = useState({});
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({ full_name: "", company: "" });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [templateFilter, setTemplateFilter] = useState("design");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;

    async function loadManagementData() {
      try {
        const [profilesResult, ordersResult, productsResult, templatesResult] = await Promise.all([
          supabase.from("profiles").select("id,full_name,email,company,role,created_at").order("created_at", { ascending: false }),
          supabase.from("orders").select("user_id,total,payment_status"),
          supabase.from("products").select("id,slug,division,name,description,base_price,config,volume_discount_threshold,discount_percent,active").order("name"),
          supabase.from("templates").select("id,template_type,product_id,name,description,content,active,created_at").order("updated_at", { ascending: false }),
        ]);
        if (profilesResult.error) throw new Error(profilesResult.error.message);
        if (ordersResult.error) throw new Error(ordersResult.error.message);
        if (productsResult.error) throw new Error(productsResult.error.message);
        if (templatesResult.error) throw new Error(templatesResult.error.message);
        if (!active) return;

        const orderStats = {};
        for (const order of ordersResult.data ?? []) {
          const stats = orderStats[order.user_id] ?? { count: 0, paidTotal: 0 };
          stats.count += 1;
          if (order.payment_status === "paid") {
            stats.paidTotal += Number(order.total) || 0;
          }
          orderStats[order.user_id] = stats;
        }

        setProfiles(profilesResult.data ?? []);
        setOrdersByUser(orderStats);
        setProducts(productsResult.data ?? []);
        setTemplates(templatesResult.data ?? []);
        setLoadError("");
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load management data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadManagementData();
    return () => {
      active = false;
    };
  }, []);

  const visibleProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((profile) => (
      `${profile.full_name ?? ""} ${profile.email ?? ""} ${profile.company ?? ""}`.toLowerCase().includes(term)
    ));
  }, [profiles, search]);

  const visibleTemplates = useMemo(
    () => templates.filter((template) => template.template_type === templateFilter),
    [templates, templateFilter],
  );

  function startCustomerEdit(profile) {
    setEditingCustomer(profile.id);
    setCustomerForm({
      full_name: profile.full_name ?? "",
      company: profile.company ?? "",
    });
    setNotice("");
  }

  async function saveCustomer(event) {
    event.preventDefault();
    if (!editingCustomer || !supabase) return;

    setBusy(editingCustomer);
    setNotice("");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: customerForm.full_name.trim(),
          company: customerForm.company.trim(),
        })
        .eq("id", editingCustomer)
        .select("id,full_name,company")
        .single();
      if (error) throw new Error(error.message);

      setProfiles((current) => current.map((profile) => (
        profile.id === data.id ? { ...profile, ...data } : profile
      )));
      setEditingCustomer(null);
      setNotice("Customer profile updated. Role was not changed.");
    } catch (error) {
      setNotice(`Could not update the customer: ${error instanceof Error ? error.message : "Unexpected error."}`);
    } finally {
      setBusy("");
    }
  }

  function startProductEdit(product) {
    setProductForm(product ? productToForm(product) : emptyProduct());
    setNotice("");
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (!supabase) return;

    let config;
    try {
      config = JSON.parse(productForm.configText);
      const basePrice = Number(productForm.base_price);
      normalizeProductConfig(config, { base_price: basePrice });
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productForm.slug.trim())) {
        throw new Error("Slug must use lowercase letters, numbers and hyphens.");
      }
      if (!productForm.name.trim() || !productForm.division.trim()) {
        throw new Error("Product name and division are required.");
      }
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        throw new Error("Base price must be greater than zero.");
      }
      if (!Number.isFinite(Number(productForm.volume_discount_threshold))
        || Number(productForm.volume_discount_threshold) < 1
        || !Number.isFinite(Number(productForm.discount_percent))
        || Number(productForm.discount_percent) < 0
        || Number(productForm.discount_percent) > 100) {
        throw new Error("Enter a valid discount threshold and percentage.");
      }
    } catch (error) {
      setNotice(`Check product details: ${error instanceof Error ? error.message : "Invalid JSON."}`);
      return;
    }

    setBusy("product");
    setNotice("");
    try {
      const payload = {
        ...(productForm.id ? { id: productForm.id } : {}),
        slug: productForm.slug.trim(),
        division: productForm.division.trim(),
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        base_price: Number(productForm.base_price),
        volume_discount_threshold: Number(productForm.volume_discount_threshold),
        discount_percent: Number(productForm.discount_percent),
        active: productForm.active,
        config,
      };
      const { data, error } = await supabase.from("products").upsert(payload).select(
        "id,slug,division,name,description,base_price,config,volume_discount_threshold,discount_percent,active",
      ).single();
      if (error) throw new Error(error.message);

      setProducts((current) => [
        ...current.filter((product) => product.id !== data.id),
        data,
      ].sort((first, second) => first.name.localeCompare(second.name)));
      setProductForm(emptyProduct());
      setNotice(`${data.name} saved to the product catalog.`);
    } catch (error) {
      setNotice(`Could not save product: ${error instanceof Error ? error.message : "Unexpected error."}`);
    } finally {
      setBusy("");
    }
  }

  async function toggleProduct(product) {
    if (!supabase) return;
    setBusy(product.id);
    setNotice("");
    try {
      const { data, error } = await supabase
        .from("products")
        .update({ active: !product.active })
        .eq("id", product.id)
        .select("id,active")
        .single();
      if (error) throw new Error(error.message);
      setProducts((current) => current.map((item) => item.id === data.id ? { ...item, active: data.active } : item));
      setNotice(`${product.name} is now ${data.active ? "active" : "inactive"}.`);
    } catch (error) {
      setNotice(`Could not update product: ${error instanceof Error ? error.message : "Unexpected error."}`);
    } finally {
      setBusy("");
    }
  }

  function startTemplateEdit(template, templateType = templateFilter) {
    setTemplateForm(template ? templateToForm(template) : emptyTemplate(templateType));
    setNotice("");
  }

  async function saveTemplate(event) {
    event.preventDefault();
    if (!supabase) return;

    let content;
    try {
      content = JSON.parse(templateForm.contentText);
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        throw new Error("Template content must be a JSON object.");
      }
      if (templateForm.template_type === "design") {
        if (content.color && !/^#[0-9a-f]{6}$/i.test(content.color)) {
          throw new Error("Design color must be a six-digit hex value.");
        }
        if (content.font_size !== undefined
          && (!Number.isFinite(Number(content.font_size)) || Number(content.font_size) < 8 || Number(content.font_size) > 100)) {
          throw new Error("Design font size must be between 8 and 100.");
        }
      } else {
        const bleed = Number(content.bleed_mm);
        const dpi = Number(content.dpi);
        if (!Number.isFinite(bleed) || bleed < 0 || bleed > 25) {
          throw new Error("Bleed must be between 0 and 25 mm.");
        }
        if (!Number.isInteger(dpi) || dpi < 72 || dpi > 600) {
          throw new Error("DPI must be a whole number between 72 and 600.");
        }
      }
      if (!templateForm.name.trim()) throw new Error("Template name is required.");
    } catch (error) {
      setNotice(`Check template details: ${error instanceof Error ? error.message : "Invalid JSON."}`);
      return;
    }

    setBusy("template");
    setNotice("");
    try {
      const payload = {
        ...(templateForm.id ? { id: templateForm.id } : {}),
        template_type: templateForm.template_type,
        product_id: templateForm.product_id || null,
        name: templateForm.name.trim(),
        description: templateForm.description.trim(),
        active: templateForm.active,
        content,
        ...(adminId ? { created_by: adminId } : {}),
      };
      const { data, error } = await supabase.from("templates").upsert(payload).select(
        "id,template_type,product_id,name,description,content,active,created_at",
      ).single();
      if (error) throw new Error(error.message);

      setTemplates((current) => [
        ...current.filter((template) => template.id !== data.id),
        data,
      ].sort((first, second) => second.created_at.localeCompare(first.created_at)));
      setTemplateForm(emptyTemplate(templateForm.template_type));
      setNotice(`${data.name} template saved.`);
    } catch (error) {
      setNotice(`Could not save template: ${error instanceof Error ? error.message : "Unexpected error."}`);
    } finally {
      setBusy("");
    }
  }

  async function toggleTemplate(template) {
    if (!supabase) return;
    setBusy(template.id);
    setNotice("");
    try {
      const { data, error } = await supabase
        .from("templates")
        .update({ active: !template.active })
        .eq("id", template.id)
        .select("id,active")
        .single();
      if (error) throw new Error(error.message);
      setTemplates((current) => current.map((item) => item.id === data.id ? { ...item, active: data.active } : item));
      setNotice(`${template.name} is now ${data.active ? "active" : "inactive"}.`);
    } catch (error) {
      setNotice(`Could not update template: ${error instanceof Error ? error.message : "Unexpected error."}`);
    } finally {
      setBusy("");
    }
  }

  if (!supabase) {
    return (
      <section className="mt-7 rounded-3xl border border-stone-800 bg-stone-900 p-6">
        <h2 className="text-lg font-semibold">Management tools</h2>
        <p className="mt-2 text-sm text-stone-400">Configure Supabase and sign in as an administrator to manage customers, products and templates.</p>
      </section>
    );
  }

  const tabs = [
    { id: "customers", label: `Customers (${profiles.filter((profile) => profile.role === "customer").length})` },
    { id: "products", label: `Products (${products.length})` },
    { id: "templates", label: `Templates (${templates.length})` },
  ];

  return (
    <section className="mt-7 rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6" aria-labelledby="management-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">Administration</p>
          <h2 id="management-heading" className="mt-2 text-xl font-semibold">Users, products & templates</h2>
          <p className="mt-1 text-xs text-stone-500">Admin role assignment stays restricted to the system owner.</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Admin management sections">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setSection(tab.id)} aria-pressed={section === tab.id}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${section === tab.id ? "border-lime-300 bg-lime-300 text-stone-950" : "border-stone-700 text-stone-300 hover:border-stone-500"}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {notice && <p role="status" className="mt-5 rounded-xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">{notice}</p>}
      {loadError && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">Could not load admin data: {loadError}</p>}
      {loading && <p className="mt-5 text-sm text-stone-400">Loading admin data…</p>}

      {!loading && section === "customers" && (
        <div className="mt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-400">View customer order history and update customer contact details. Roles cannot be changed here.</p>
            <input aria-label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, company or email" className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm outline-none focus:border-lime-300 sm:max-w-xs" />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-stone-800">
            <table className={tableClass}>
              <thead className="bg-stone-950 text-xs uppercase text-stone-500">
                <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Paid value</th><th className="px-4 py-3">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {visibleProfiles.map((profile) => {
                  const stats = ordersByUser[profile.id] ?? { count: 0, paidTotal: 0 };
                  const isEditing = editingCustomer === profile.id;
                  return (
                    <tr key={profile.id}>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <form onSubmit={saveCustomer} className="space-y-2">
                            <input aria-label="Customer name" value={customerForm.full_name} onChange={(event) => setCustomerForm((current) => ({ ...current, full_name: event.target.value }))} className={inputClass} />
                            <p className="break-all text-xs text-stone-500">{profile.email}</p>
                            <div className="flex gap-2">
                              <button type="submit" disabled={busy === profile.id} className="inline-flex items-center gap-1 rounded-lg bg-lime-300 px-2.5 py-1.5 text-xs font-bold text-stone-950 disabled:opacity-50"><Save size={13} />Save</button>
                              <button type="button" onClick={() => setEditingCustomer(null)} className="rounded-lg border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300">Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <><p className="font-semibold text-stone-100">{profile.full_name || "Unnamed customer"}</p><p className="break-all text-xs text-stone-500">{profile.email}</p></>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing
                          ? <input aria-label="Customer company" value={customerForm.company} onChange={(event) => setCustomerForm((current) => ({ ...current, company: event.target.value }))} className={inputClass} />
                          : <span className="text-stone-300">{profile.company || "—"}</span>}
                      </td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${profile.role === "admin" ? "bg-orange-300/10 text-orange-300" : "bg-stone-800 text-stone-300"}`}>{profile.role}</span></td>
                      <td className="px-4 py-3 text-stone-300">{stats.count}</td>
                      <td className="px-4 py-3 text-stone-300">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(stats.paidTotal)}</td>
                      <td className="px-4 py-3">
                        {profile.role === "customer" && !isEditing && (
                          <button type="button" onClick={() => startCustomerEdit(profile)} className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-2.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-lime-300 hover:text-lime-300"><Pencil size={13} />Edit</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleProfiles.length === 0 && <tr><td colSpan="6" className="px-4 py-8 text-center text-sm text-stone-500">No matching users.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && section === "products" && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={saveProduct} className="space-y-3 rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{productForm.id ? "Edit product" : "Add product"}</h3>
              <button type="button" onClick={() => startProductEdit(null)} className="text-xs font-semibold text-lime-300">New</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Slug<input required value={productForm.slug} onChange={(event) => setProductForm((current) => ({ ...current, slug: event.target.value }))} className={inputClass} /></label>
              <label className={labelClass}>Division<input required value={productForm.division} onChange={(event) => setProductForm((current) => ({ ...current, division: event.target.value }))} className={inputClass} /></label>
              <label className={labelClass}>Product name<input required value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
              <label className={labelClass}>Base price (INR)<input required type="number" min="0.01" step="0.01" value={productForm.base_price} onChange={(event) => setProductForm((current) => ({ ...current, base_price: event.target.value }))} className={inputClass} /></label>
              <label className={labelClass}>Discount quantity<input required type="number" min="1" step="1" value={productForm.volume_discount_threshold} onChange={(event) => setProductForm((current) => ({ ...current, volume_discount_threshold: event.target.value }))} className={inputClass} /></label>
              <label className={labelClass}>Default discount %<input required type="number" min="0" max="100" step="0.01" value={productForm.discount_percent} onChange={(event) => setProductForm((current) => ({ ...current, discount_percent: event.target.value }))} className={inputClass} /></label>
            </div>
            <label className={labelClass}>Description<textarea required rows="2" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} /></label>
            <label className={labelClass}>Configuration JSON<textarea required rows="12" value={productForm.configText} onChange={(event) => setProductForm((current) => ({ ...current, configText: event.target.value }))} className={`${inputClass} font-mono text-xs`} /></label>
            <label className="flex items-center gap-2 text-sm text-stone-300"><input type="checkbox" checked={productForm.active} onChange={(event) => setProductForm((current) => ({ ...current, active: event.target.checked }))} />Active in storefront</label>
            <button type="submit" disabled={busy === "product"} className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-2.5 text-sm font-bold text-stone-950 disabled:opacity-50"><Save size={15} />{busy === "product" ? "Saving…" : "Save product"}</button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-stone-800">
            <table className={tableClass}>
              <thead className="bg-stone-950 text-xs uppercase text-stone-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Storefront</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-stone-800">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3"><p className="font-semibold">{product.name}</p><p className="text-xs text-stone-500">{product.division} · {product.slug}</p></td>
                    <td className="px-4 py-3">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(product.base_price))}</td>
                    <td className="px-4 py-3">{product.active ? "Active" : "Hidden"}</td>
                    <td className="px-4 py-3"><div className="flex gap-2">
                      <button type="button" onClick={() => startProductEdit(product)} className="rounded-lg border border-stone-700 px-2.5 py-1.5 text-xs font-semibold hover:border-lime-300">Edit</button>
                      <button type="button" disabled={busy === product.id} onClick={() => void toggleProduct(product)} className="rounded-lg border border-stone-700 px-2.5 py-1.5 text-xs font-semibold hover:border-orange-300 disabled:opacity-50">{product.active ? "Deactivate" : "Activate"}</button>
                    </div></td>
                  </tr>
                ))}
                {products.length === 0 && <tr><td colSpan="4" className="px-4 py-8 text-center text-sm text-stone-500">No products yet. Add one with a valid configuration.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && section === "templates" && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={saveTemplate} className="space-y-3 rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{templateForm.id ? "Edit template" : "Add template"}</h3>
              <button type="button" onClick={() => startTemplateEdit(null)} className="text-xs font-semibold text-lime-300">New</button>
            </div>
            <label className={labelClass}>Template kind
              <select disabled={Boolean(templateForm.id)} value={templateForm.template_type} onChange={(event) => {
                const nextType = event.target.value;
                setTemplateForm((current) => ({ ...emptyTemplate(nextType), id: current.id }));
              }} className={inputClass}>
                <option value="design">Customer design preset</option>
                <option value="production">Production specification</option>
              </select>
            </label>
            <label className={labelClass}>Applies to
              <select value={templateForm.product_id} onChange={(event) => setTemplateForm((current) => ({ ...current, product_id: event.target.value }))} className={inputClass}>
                <option value="">All products</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className={labelClass}>Name<input required value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
            <label className={labelClass}>Description<textarea rows="2" value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} /></label>
            <label className={labelClass}>Template data (JSON)<textarea required rows="10" value={templateForm.contentText} onChange={(event) => setTemplateForm((current) => ({ ...current, contentText: event.target.value }))} className={`${inputClass} font-mono text-xs`} /></label>
            <p className="text-[11px] leading-5 text-stone-500">
              {templateForm.template_type === "design"
                ? 'Design keys: text, color, font_size, position { x, y, rotation }.'
                : "Production keys: bleed_mm (0–25) and dpi (72–600). Each new quote snapshots the newest active matching spec."}
            </p>
            <label className="flex items-center gap-2 text-sm text-stone-300"><input type="checkbox" checked={templateForm.active} onChange={(event) => setTemplateForm((current) => ({ ...current, active: event.target.checked }))} />Active</label>
            <button type="submit" disabled={busy === "template"} className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-2.5 text-sm font-bold text-stone-950 disabled:opacity-50"><Save size={15} />{busy === "template" ? "Saving…" : "Save template"}</button>
          </form>

          <div>
            <div className="mb-3 flex gap-2">
              {[
                { id: "design", label: "Design presets" },
                { id: "production", label: "Production specs" },
              ].map((filter) => (
                <button key={filter.id} type="button" onClick={() => {
                  setTemplateFilter(filter.id);
                  setTemplateForm(emptyTemplate(filter.id));
                }} aria-pressed={templateFilter === filter.id}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold ${templateFilter === filter.id ? "border-lime-300 bg-lime-300 text-stone-950" : "border-stone-700 text-stone-300"}`}>
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-stone-800">
              <table className={tableClass}>
                <thead className="bg-stone-950 text-xs uppercase text-stone-500"><tr><th className="px-4 py-3">Template</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
                <tbody className="divide-y divide-stone-800">
                  {visibleTemplates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-4 py-3"><p className="font-semibold">{template.name}</p><p className="text-xs text-stone-500">{template.description || template.template_type}</p></td>
                      <td className="px-4 py-3 text-stone-300">{products.find((product) => product.id === template.product_id)?.name ?? "All products"}</td>
                      <td className="px-4 py-3">{template.active ? "Active" : "Inactive"}</td>
                      <td className="px-4 py-3"><div className="flex gap-2">
                        <button type="button" onClick={() => startTemplateEdit(template)} className="rounded-lg border border-stone-700 px-2.5 py-1.5 text-xs font-semibold hover:border-lime-300">Edit</button>
                        <button type="button" disabled={busy === template.id} onClick={() => void toggleTemplate(template)} className="rounded-lg border border-stone-700 px-2.5 py-1.5 text-xs font-semibold hover:border-orange-300 disabled:opacity-50">{template.active ? "Deactivate" : "Activate"}</button>
                      </div></td>
                    </tr>
                  ))}
                  {visibleTemplates.length === 0 && <tr><td colSpan="4" className="px-4 py-8 text-center text-sm text-stone-500">No templates of this kind yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
