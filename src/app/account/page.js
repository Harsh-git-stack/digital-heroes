"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Package2,
  Palette,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { useSupabaseAccess } from "@/lib/use-supabase-access";
import { supabase } from "@/lib/supabase";

const initialOrders = [
  { id: "PF-1048", product: "Race number set", date: "25 Nov 2026", quantity: 250, total: 4680, status: "proof", detail: "Proof v2 is ready for review" },
  { id: "PF-1042", product: "Custom product labels", date: "18 Nov 2026", quantity: 1000, total: 5445, status: "production", detail: "Printing in progress" },
  { id: "PF-1031", product: "MTB event boards", date: "02 Nov 2026", quantity: 40, total: 5664, status: "completed", detail: "Completed 12 Nov 2026" },
];

const initialDesigns = [
  { id: "DS-208", name: "Ridge Run 2026", product: "Race & event numbers", updated: "Updated 24 Nov 2026", color: "bg-orange-300" },
  { id: "DS-193", name: "Field Notes labels", product: "Labels & stickers", updated: "Updated 14 Nov 2026", color: "bg-lime-300" },
  { id: "DS-177", name: "North Ridge board", product: "MTB boards", updated: "Updated 30 Oct 2026", color: "bg-cyan-300" },
];

const statusLabels = {
  quote: "Quote",
  order: "Order confirmed",
  artwork: "Artwork",
  proof: "Proof review",
  production: "Production",
  completed: "Completed",
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function StatusBadge({ status }) {
  const styles = {
    quote: "bg-stone-800 text-stone-300",
    order: "bg-sky-400/10 text-sky-300",
    artwork: "bg-violet-400/10 text-violet-300",
    proof: "bg-orange-400/10 text-orange-300",
    production: "bg-lime-400/10 text-lime-300",
    completed: "bg-stone-700 text-stone-200",
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{statusLabels[status]}</span>;
}

export default function CustomerAccountPage() {
  const access = useSupabaseAccess();
  const router = useRouter();
  const [activeView, setActiveView] = useState("overview");
  const [orders, setOrders] = useState(initialOrders);
  const [proofDecision, setProofDecision] = useState("pending");
  const [notice, setNotice] = useState("");

  const navigation = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: Package2 },
    { id: "designs", label: "Saved designs", icon: Palette },
    { id: "profile", label: "Profile", icon: UserRound },
  ];

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "completed"),
    [orders],
  );

  function decideProof(decision) {
    setProofDecision(decision);
    if (decision === "approved") {
      setOrders((current) => current.map((order) => (
        order.id === "PF-1048" ? { ...order, status: "production", detail: "Proof approved · awaiting production" } : order
      )));
      setNotice("Demo only: this approval is local and has not been saved to an account.");
      return;
    }

    setNotice("Demo only: your change request is local and has not been sent to production.");
  }

  function prepareReorder(designName) {
    setNotice(`Demo only: “${designName}” is ready to configure again; no order has been placed.`);
  }

  async function signOut() {
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setNotice(`Could not sign out: ${error.message}`);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setNotice(signOutError instanceof Error ? `Could not sign out: ${signOutError.message}` : "Could not sign out. Please try again.");
    }
  }

  if (access.status === "checking" || access.status === "signed-out") {
    return <AccessMessage title="Checking your account…" />;
  }

  if (access.status === "error") {
    return <AccessMessage title="We couldn’t verify your account" detail={access.error} />;
  }

  if (access.status === "authenticated") {
    return <ConnectedCustomerAccount user={access.user} onSignOut={signOut} />;
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime-300 text-stone-950"><Package2 size={18} /></span>
            PRINTFORGE<span className="-ml-3 text-lime-300">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/#configure" className="hidden text-sm font-semibold text-stone-300 transition hover:text-lime-300 sm:block">New project</Link>
            <button type="button" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-stone-800 text-stone-300">
              <Bell size={17} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-300" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-stone-800 text-xs font-bold text-lime-300" aria-label="Demo customer avatar">AM</div>
            {access.status === "authenticated" && <button type="button" onClick={signOut} className="text-xs font-semibold text-stone-400 hover:text-stone-100">Sign out</button>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8">
        <div role="note" className="rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-3 text-xs leading-5 text-orange-100">
          <strong>{access.status === "demo" ? "Preview mode:" : "Account verified:"}</strong>{" "}
          {access.status === "demo"
            ? "sample customer data and actions are local only. Add Supabase configuration to enable sign-in."
            : `signed in as ${access.user?.email}. Orders, designs and proof actions are still sample-only and are not saved.`}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-stone-500">Customer workspace</p>
            <p className="mt-2 text-sm font-semibold">Alex Morgan</p>
            <p className="text-xs text-stone-500">alex@example.com · Demo account</p>
          </div>
          <nav aria-label="Customer dashboard" className="flex gap-2 overflow-x-auto lg:grid">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => { setActiveView(id); setNotice(""); }}
                aria-current={activeView === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition lg:w-full ${activeView === id ? "bg-lime-300 text-stone-950" : "text-stone-400 hover:bg-stone-900 hover:text-stone-100"}`}
              >
                <Icon size={17} />{label}
              </button>
            ))}
            <Link href="/" className="hidden items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-stone-500 transition hover:bg-stone-900 hover:text-stone-100 lg:flex">
              <LogOut size={17} />Back to storefront
            </Link>
          </nav>
          <Link href="/admin" className="mt-6 hidden items-center gap-2 text-xs font-semibold text-stone-600 transition hover:text-lime-300 lg:flex">
            Staff console preview <ArrowRight size={13} />
          </Link>
        </aside>

        <section className="min-w-0">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">Your workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {activeView === "overview" ? "Good morning, Alex." : navigation.find((item) => item.id === activeView)?.label}
              </h1>
              <p className="mt-2 text-sm text-stone-400">Keep your print work moving from one clear place.</p>
            </div>
            <Link href="/#configure" className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 text-sm font-bold text-stone-950 transition hover:bg-lime-200">
              Start a project <ArrowRight size={16} />
            </Link>
          </div>

          {notice && <p role="status" className="mb-5 rounded-xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">{notice}</p>}

          {activeView === "overview" && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Active orders", activeOrders.length, "Across production stages"],
                  ["Proofs to review", proofDecision === "pending" ? "1" : "0", proofDecision === "pending" ? "One needs your approval" : "You are all caught up"],
                  ["Saved designs", initialDesigns.length, "Ready to order again"],
                ].map(([label, value, detail]) => (
                  <article key={label} className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
                    <p className="text-sm text-stone-400">{label}</p>
                    <p className="mt-3 text-3xl font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-stone-500">{detail}</p>
                  </article>
                ))}
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                <article className="rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div><h2 className="text-lg font-semibold">Recent orders</h2><p className="mt-1 text-xs text-stone-500">Your latest production work</p></div>
                    <button type="button" onClick={() => setActiveView("orders")} className="text-xs font-bold text-lime-300 hover:text-lime-200">View all</button>
                  </div>
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex flex-col gap-3 rounded-2xl border border-stone-800 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{order.product}</p><StatusBadge status={order.status} /></div>
                          <p className="mt-1 text-xs text-stone-500">{order.id} · {order.date} · {order.quantity} units</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">{currency.format(order.total)}</p>
                      </div>
                    ))}
                  </div>
                </article>

                {proofDecision === "pending" ? (
                  <article className="rounded-3xl bg-orange-300 p-5 text-stone-950 sm:p-6">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-stone-950/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em]">Action needed</span>
                      <FileCheck2 size={20} />
                    </div>
                    <h2 className="mt-6 text-xl font-semibold">Your race numbers proof is ready.</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-800">Version 2 · Order PF-1048<br />Check the artwork before it moves to production.</p>
                    <div className="mt-6 rounded-2xl border border-stone-950/15 bg-white/40 p-4">
                      <div className="grid aspect-[1.4] place-items-center rounded-xl border-2 border-dashed border-stone-800/30 bg-white">
                        <div className="grid h-32 w-24 place-items-center border-4 border-stone-950 text-center">
                          <span className="text-[8px] font-bold uppercase tracking-[.16em]">Trail / 2026</span>
                          <span className="text-5xl font-black">27</span>
                          <span className="text-[8px] font-bold uppercase">Run your line</span>
                        </div>
                      </div>
                      <p className="mt-2 text-[10px] font-semibold text-stone-700">Preview · printable area shown</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => decideProof("changes_requested")} className="rounded-full border border-stone-950/30 px-3 py-3 text-xs font-bold transition hover:bg-stone-950/5">Request changes</button>
                      <button type="button" onClick={() => decideProof("approved")} className="inline-flex items-center justify-center gap-1 rounded-full bg-stone-950 px-3 py-3 text-xs font-bold text-white transition hover:bg-stone-800"><Check size={14} /> Approve</button>
                    </div>
                  </article>
                ) : (
                  <article className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
                    <CheckCircle2 className="text-lime-300" size={24} />
                    <h2 className="mt-4 text-xl font-semibold">{proofDecision === "approved" ? "Proof approved" : "Change request noted"}</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-400">{proofDecision === "approved" ? "The demo order moved to production." : "A new proof revision would appear here after the production team responds."}</p>
                    <p className="mt-5 text-xs text-stone-600">This state is only stored in this browser session.</p>
                  </article>
                )}
              </div>
              <div className="mt-5 rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div><h2 className="text-lg font-semibold">Saved designs</h2><p className="mt-1 text-xs text-stone-500">Pick up where you left off</p></div>
                  <button type="button" onClick={() => setActiveView("designs")} className="text-xs font-bold text-lime-300 hover:text-lime-200">View designs</button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {initialDesigns.map((design) => (
                    <article key={design.id} className="flex items-center gap-3 rounded-2xl border border-stone-800 p-3">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-stone-950 ${design.color}`}><Palette size={19} /></div>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{design.name}</p><p className="truncate text-xs text-stone-500">{design.product}</p></div>
                      <button type="button" aria-label={`Reorder ${design.name}`} onClick={() => prepareReorder(design.name)} className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border border-stone-700 text-stone-300 hover:border-lime-300 hover:text-lime-300"><RotateCcw size={15} /></button>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeView === "orders" && (
            <article className="rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
              <div className="mb-5"><h2 className="text-lg font-semibold">Order history</h2><p className="mt-1 text-xs text-stone-500">Track progress, review proofs and reorder completed work.</p></div>
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="grid gap-3 rounded-2xl border border-stone-800 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{order.product}</p><StatusBadge status={order.status} /></div>
                      <p className="mt-1 text-xs text-stone-500">{order.id} · {order.date} · {order.quantity} units</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-400"><Clock3 size={13} />{order.detail}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 md:justify-end">
                      <p className="text-sm font-semibold">{currency.format(order.total)}</p>
                      {order.status === "completed" ? (
                        <button type="button" onClick={() => setNotice("Demo only: receipt downloads are not connected yet.")} className="inline-flex items-center gap-2 rounded-full border border-stone-700 px-3 py-2 text-xs font-bold hover:border-stone-500"><ArrowDownToLine size={14} /> Receipt</button>
                      ) : (
                        <button type="button" onClick={() => setNotice(`Demo only: ${order.id} status is not connected to Supabase.`)} className="inline-flex items-center gap-2 rounded-full border border-stone-700 px-3 py-2 text-xs font-bold hover:border-stone-500">Details <ChevronRight size={14} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {activeView === "designs" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {initialDesigns.map((design) => (
                <article key={design.id} className="overflow-hidden rounded-3xl border border-stone-800 bg-stone-900">
                  <div className={`grid aspect-[1.5] place-items-center ${design.color}`}>
                    <div className="grid h-28 w-36 place-items-center rounded-2xl border border-stone-950/15 bg-white/70 text-center text-stone-950 shadow-xl">
                      <span className="text-[9px] font-bold uppercase tracking-[.18em]">{design.product}</span>
                      <span className="text-xl font-black">{design.name}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-stone-500">{design.updated}</p>
                    <h2 className="mt-1 font-semibold">{design.name}</h2>
                    <button type="button" onClick={() => prepareReorder(design.name)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-2.5 text-xs font-bold text-stone-950"><RotateCcw size={14} /> Reorder design</button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeView === "profile" && (
            <article className="max-w-2xl rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-lime-300 text-lg font-bold text-stone-950">AM</div>
                <div><h2 className="text-lg font-semibold">Account details</h2><p className="text-sm text-stone-500">Demo profile · not connected to authentication</p></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[["Full name", "Alex Morgan"], ["Email", "alex@example.com"], ["Company", "North Ridge Events"], ["Account type", "Customer"]].map(([label, value]) => (
                  <label key={label} className="text-xs font-semibold uppercase tracking-[.12em] text-stone-500">{label}<input readOnly value={value} className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950 px-3 py-3 text-sm font-normal normal-case tracking-normal text-stone-200" /></label>
                ))}
              </div>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}

function AccessMessage({ title, detail }) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-950 px-5 text-stone-100">
      <section className="max-w-md rounded-3xl border border-stone-800 bg-stone-900 p-7 text-center">
        <Package2 className="mx-auto text-lime-300" size={28} />
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        {detail && <p className="mt-2 break-words text-sm text-red-200">{detail}</p>}
        <Link href="/" className="mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-bold text-stone-950">Back to storefront</Link>
      </section>
    </main>
  );
}

function ConnectedCustomerAccount({ user, onSignOut }) {
  const [activeView, setActiveView] = useState("overview");
  const [dashboard, setDashboard] = useState({
    loading: true,
    error: "",
    profile: null,
    orders: [],
    designs: [],
    proofs: [],
    products: [],
  });
  const [notice, setNotice] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [busyProofId, setBusyProofId] = useState("");
  const [busyDesignId, setBusyDesignId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const navigation = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: Package2 },
    { id: "designs", label: "Saved designs", icon: Palette },
    { id: "profile", label: "Profile", icon: UserRound },
  ];

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [profileResult, ordersResult, designsResult] = await Promise.all([
          supabase.from("profiles").select("full_name,email,company,role").eq("id", user.id).maybeSingle(),
          supabase.from("orders").select("id,order_number,product_id,design_id,quantity,total,status,payment_status,payment_method,payment_reference,created_at").order("created_at", { ascending: false }),
          supabase.from("designs").select("id,product_id,name,content,status,updated_at,created_at").order("updated_at", { ascending: false }),
        ]);

        if (profileResult.error) throw new Error(profileResult.error.message);
        if (ordersResult.error) throw new Error(ordersResult.error.message);
        if (designsResult.error) throw new Error(designsResult.error.message);

        const orderRows = ordersResult.data ?? [];
        const designRows = designsResult.data ?? [];
        const orderIds = orderRows.map((order) => order.id);
        const productIds = [...new Set([
          ...orderRows.map((order) => order.product_id),
          ...designRows.map((design) => design.product_id),
        ].filter(Boolean))];

        const [proofsResult, productsResult] = await Promise.all([
          orderIds.length
            ? supabase.from("proofs").select("id,order_id,version,file_url,status,customer_note,created_at").in("order_id", orderIds).order("version", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          productIds.length
            ? supabase.from("products").select("id,name,slug").in("id", productIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (proofsResult.error) throw new Error(proofsResult.error.message);
        if (productsResult.error) throw new Error(productsResult.error.message);

        const proofRows = await Promise.all((proofsResult.data ?? []).map(async (proof) => {
          if (!proof.file_url) return { ...proof, previewUrl: "", previewError: "" };
          if (/^https?:\/\//i.test(proof.file_url)) return { ...proof, previewUrl: proof.file_url, previewError: "" };

          const { data, error } = await supabase.storage.from("artwork").createSignedUrl(proof.file_url, 300);
          return {
            ...proof,
            previewUrl: data?.signedUrl ?? "",
            previewError: error?.message ?? "",
          };
        }));

        if (!active) return;

        const productMap = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
        const latestProofByOrder = new Map();
        for (const proof of proofRows) {
          if (!latestProofByOrder.has(proof.order_id)) latestProofByOrder.set(proof.order_id, proof);
        }

        const formatDate = (value) => new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(value));

        setDashboard({
          loading: false,
          error: "",
          profile: profileResult.data,
          orders: orderRows.map((order) => ({
            ...order,
            idLabel: `PF-${order.order_number}`,
            product: productMap.get(order.product_id)?.name ?? "Print order",
            date: formatDate(order.created_at),
            detail: statusLabels[order.status] ?? order.status,
            proof: latestProofByOrder.get(order.id) ?? null,
          })),
          designs: designRows.map((design) => ({
            ...design,
            product: productMap.get(design.product_id)?.name ?? "Print design",
            updated: formatDate(design.updated_at ?? design.created_at),
          })),
          proofs: proofRows,
          products: productsResult.data ?? [],
        });
      } catch (loadError) {
        if (!active) return;
        setDashboard((current) => ({
          ...current,
          loading: false,
          error: loadError instanceof Error ? loadError.message : "Could not load your account data.",
        }));
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [reloadKey, user.id]);

  const activeOrders = dashboard.orders.filter((order) => order.status !== "completed");
  const pendingProofs = dashboard.proofs.filter((proof) => proof.status === "pending" || proof.status === "changes_requested");
  const profileName = dashboard.profile?.full_name || user.user_metadata?.full_name || user.email || "Customer";
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  async function respondToProof(proof, decision) {
    if (decision === "changes_requested" && !proofNote.trim()) {
      setNotice("Add a note describing the changes you need.");
      return;
    }

    setBusyProofId(proof.id);
    setNotice("");
    try {
      const { error } = await supabase.rpc("respond_to_proof", {
        p_proof_id: proof.id,
        p_decision: decision,
        p_note: decision === "changes_requested" ? proofNote.trim() : null,
      });

      if (error) {
        setNotice(`Could not update the proof: ${error.message}`);
        return;
      }

      setProofNote("");
      setNotice(decision === "approved" ? "Proof approved and saved." : "Your change request has been sent.");
      setReloadKey((current) => current + 1);
    } catch (responseError) {
      setNotice(responseError instanceof Error ? `Could not update the proof: ${responseError.message}` : "Could not update the proof. Please try again.");
    } finally {
      setBusyProofId("");
    }
  }

  async function reorderDesign(design) {
    const configuration = design.content?.configuration;
    const product = dashboard.products.find((item) => item.id === design.product_id);
    if (!configuration || !product?.slug || !configuration.width_mm || !configuration.height_mm || !configuration.quantity || !configuration.material) {
      setNotice("This saved design is missing the configuration needed to create a new quote.");
      return;
    }

    setBusyDesignId(design.id);
    setNotice("");
    try {
      const { data, error } = await supabase.rpc("create_customer_order", {
        p_product_slug: product.slug,
        p_quantity: Number(configuration.quantity),
        p_width_mm: Number(configuration.width_mm),
        p_height_mm: Number(configuration.height_mm),
        p_material: configuration.material,
        p_design_content: { ...design.content, name: `${design.name} (reorder)` },
      });

      if (error) {
        setNotice(`Could not create a reorder quote: ${error.message}`);
        return;
      }

      const createdOrder = Array.isArray(data) ? data[0] : data;
      if (!createdOrder?.created_order_number) {
        setNotice("The reorder quote was not created. Please try again.");
        return;
      }

      setNotice(`Reorder quote #${createdOrder.created_order_number} created. No payment has been taken.`);
      setReloadKey((current) => current + 1);
    } catch (reorderError) {
      setNotice(reorderError instanceof Error ? `Could not create a reorder quote: ${reorderError.message}` : "Could not create a reorder quote. Please try again.");
    } finally {
      setBusyDesignId("");
    }
  }

  if (dashboard.loading) {
    return <AccessMessage title="Loading your account…" />;
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime-300 text-stone-950"><Package2 size={18} /></span>
            PRINTFORGE<span className="-ml-3 text-lime-300">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/#configure" className="hidden text-sm font-semibold text-stone-300 transition hover:text-lime-300 sm:block">New project</Link>
            <button type="button" onClick={onSignOut} className="text-xs font-semibold text-stone-400 hover:text-stone-100">Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8">
        <div role="note" className="rounded-2xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-xs leading-5 text-lime-100">
          <strong>Connected account:</strong> displaying this signed-in user’s Supabase orders, designs and proof records. Online payments are not implemented; admins record external payments after receiving them.
        </div>
        {dashboard.error && <p role="alert" className="mt-3 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">Could not load account data: {dashboard.error}</p>}
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-stone-500">Customer workspace</p>
            <p className="mt-2 text-sm font-semibold">{profileName}</p>
            <p className="break-all text-xs text-stone-500">{dashboard.profile?.email || user.email}</p>
          </div>
          <nav aria-label="Customer dashboard" className="flex gap-2 overflow-x-auto lg:grid">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => { setActiveView(id); setNotice(""); }}
                aria-current={activeView === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition lg:w-full ${activeView === id ? "bg-lime-300 text-stone-950" : "text-stone-400 hover:bg-stone-900 hover:text-stone-100"}`}
              >
                <Icon size={17} />{label}
              </button>
            ))}
            <Link href="/" className="hidden items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-stone-500 transition hover:bg-stone-900 hover:text-stone-100 lg:flex">
              <LogOut size={17} />Back to storefront
            </Link>
            {dashboard.profile?.role === "admin" && (
              <Link href="/admin" className="hidden items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-lime-300 transition hover:bg-stone-900 lg:flex">
                <LayoutDashboard size={17} />Staff dashboard
              </Link>
            )}
          </nav>
        </aside>

        <section className="min-w-0">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">Your workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{activeView === "overview" ? `Welcome, ${profileName.split(/\s+/)[0]}.` : navigation.find((item) => item.id === activeView)?.label}</h1>
              <p className="mt-2 text-sm text-stone-400">Keep your print work moving from one clear place.</p>
            </div>
            <Link href="/#configure" className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 text-sm font-bold text-stone-950 transition hover:bg-lime-200">
              Start a project <ArrowRight size={16} />
            </Link>
          </div>

          {notice && <p role="status" className="mb-5 rounded-xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">{notice}</p>}

          {activeView === "overview" && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Active orders", activeOrders.length, "Across active stages"],
                  ["Proofs to review", pendingProofs.length, pendingProofs.length ? "Customer review needed" : "You are all caught up"],
                  ["Saved designs", dashboard.designs.length, "Ready to quote again"],
                ].map(([label, value, detail]) => (
                  <article key={label} className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
                    <p className="text-sm text-stone-400">{label}</p>
                    <p className="mt-3 text-3xl font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-stone-500">{detail}</p>
                  </article>
                ))}
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                <article className="rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div><h2 className="text-lg font-semibold">Recent orders</h2><p className="mt-1 text-xs text-stone-500">Your latest production work</p></div>
                    <button type="button" onClick={() => setActiveView("orders")} className="text-xs font-bold text-lime-300 hover:text-lime-200">View all</button>
                  </div>
                  <div className="space-y-3">
                    {dashboard.orders.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex flex-col gap-3 rounded-2xl border border-stone-800 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{order.product}</p><StatusBadge status={order.status} /></div>
                          <p className="mt-1 text-xs text-stone-500">{order.idLabel} · {order.date} · {order.quantity} units</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">{currency.format(Number(order.total))}</p>
                      </div>
                    ))}
                    {dashboard.orders.length === 0 && <p className="rounded-2xl border border-dashed border-stone-800 px-4 py-8 text-center text-sm text-stone-500">No orders yet. Create a quote from the storefront to get started.</p>}
                  </div>
                </article>

                <article className="rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
                  <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Proof review</h2><p className="mt-1 text-xs text-stone-500">Latest proof for your orders</p></div><FileCheck2 size={20} className="text-orange-300" /></div>
                  {pendingProofs[0] ? (
                    <div className="mt-5 rounded-2xl border border-orange-300/20 bg-orange-300/5 p-4">
                      <p className="text-sm font-semibold">{dashboard.orders.find((order) => order.id === pendingProofs[0].order_id)?.product ?? "Print order"} · version {pendingProofs[0].version}</p>
                      <p className="mt-1 text-xs text-stone-400">Order {dashboard.orders.find((order) => order.id === pendingProofs[0].order_id)?.idLabel}</p>
                      {pendingProofs[0].previewUrl
                        ? <a href={pendingProofs[0].previewUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-lime-300 underline">Open proof in new tab <ArrowRight size={13} /></a>
                        : <p className="mt-3 text-xs text-orange-200">{pendingProofs[0].previewError ? `Preview unavailable: ${pendingProofs[0].previewError}` : "Proof file has not been attached yet."}</p>}
                      {pendingProofs[0].customer_note && <p className="mt-3 text-xs text-stone-300">Previous note: {pendingProofs[0].customer_note}</p>}
                      <label className="mt-4 block text-xs font-semibold text-stone-300">Change request note
                        <textarea value={proofNote} onChange={(event) => setProofNote(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm font-normal text-stone-100 outline-none focus:border-lime-300" placeholder="Describe the changes you need" />
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" disabled={!pendingProofs[0].previewUrl || busyProofId === pendingProofs[0].id} onClick={() => respondToProof(pendingProofs[0], "changes_requested")} className="rounded-full border border-stone-700 px-3 py-2.5 text-xs font-bold hover:border-stone-500 disabled:opacity-40">Request changes</button>
                        <button type="button" disabled={!pendingProofs[0].previewUrl || busyProofId === pendingProofs[0].id} onClick={() => respondToProof(pendingProofs[0], "approved")} className="inline-flex items-center justify-center gap-1 rounded-full bg-lime-300 px-3 py-2.5 text-xs font-bold text-stone-950 disabled:opacity-40"><Check size={14} /> Approve</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-stone-800 px-4 py-8 text-center text-sm text-stone-500">No proofs are waiting for your review.</div>
                  )}
                </article>
              </div>
            </>
          )}

          {activeView === "orders" && (
            <article className="rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
              <div className="mb-5"><h2 className="text-lg font-semibold">Order history</h2><p className="mt-1 text-xs text-stone-500">Track order status and review the latest proof.</p></div>
              <div className="space-y-3">
                {dashboard.orders.map((order) => (
                  <div key={order.id} className="grid gap-3 rounded-2xl border border-stone-800 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{order.product}</p><StatusBadge status={order.status} /></div>
                      <p className="mt-1 text-xs text-stone-500">{order.idLabel} · {order.date} · {order.quantity} units</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-400"><Clock3 size={13} />{order.detail}</p>
                      {order.proof && <p className="mt-2 text-xs text-stone-500">Latest proof v{order.proof.version}: {order.proof.status}</p>}
                    </div>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{currency.format(Number(order.total))}</p>
                        <p className="mt-1 text-xs text-stone-500">{order.payment_status === "paid" || order.payment_status === "mock_paid" ? "Paid" : order.payment_status === "failed" ? "Payment failed" : "Payment pending"}</p>
                        {order.payment_status === "pending" && <p className="mt-1 max-w-xs text-xs text-stone-500">Contact the print team to arrange payment externally. The admin will update this order after receiving it.</p>}
                        {order.payment_method && <p className="mt-1 text-xs text-stone-500">{order.payment_method.replace("_", " ")} · Ref {order.payment_reference}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {dashboard.orders.length === 0 && <p className="rounded-2xl border border-dashed border-stone-800 px-4 py-10 text-center text-sm text-stone-500">No orders have been created yet.</p>}
              </div>
            </article>
          )}

          {activeView === "designs" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboard.designs.map((design, index) => {
                const colors = ["bg-orange-300", "bg-lime-300", "bg-cyan-300"];
                return (
                  <article key={design.id} className="overflow-hidden rounded-3xl border border-stone-800 bg-stone-900">
                    <div className={`grid aspect-[1.5] place-items-center ${colors[index % colors.length]}`}>
                      <div className="grid h-28 w-36 place-items-center rounded-2xl border border-stone-950/15 bg-white/70 p-3 text-center text-stone-950 shadow-xl">
                        <span className="max-w-full truncate text-[9px] font-bold uppercase tracking-[.18em]">{design.product}</span>
                        <span className="max-w-full truncate text-xl font-black" style={{ color: design.content?.color || undefined }}>{design.content?.text || design.name}</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-stone-500">Updated {design.updated}</p>
                      <h2 className="mt-1 truncate font-semibold">{design.name}</h2>
                      <button type="button" disabled={busyDesignId === design.id} onClick={() => reorderDesign(design)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-2.5 text-xs font-bold text-stone-950 disabled:opacity-50"><RotateCcw size={14} /> {busyDesignId === design.id ? "Creating quote…" : "Create reorder quote"}</button>
                    </div>
                  </article>
                );
              })}
              {dashboard.designs.length === 0 && <p className="rounded-2xl border border-dashed border-stone-800 px-4 py-10 text-center text-sm text-stone-500 sm:col-span-2 xl:col-span-3">Saved designs from your quotes will appear here.</p>}
            </div>
          )}

          {activeView === "profile" && (
            <article className="max-w-2xl rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-lime-300 text-lg font-bold text-stone-950">{initials}</div>
                <div><h2 className="text-lg font-semibold">Account details</h2><p className="text-sm text-stone-500">Supabase authenticated profile</p></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[["Full name", dashboard.profile?.full_name || profileName], ["Email", dashboard.profile?.email || user.email], ["Company", dashboard.profile?.company || "Not provided"], ["Account type", "Customer"]].map(([label, value]) => (
                  <label key={label} className="text-xs font-semibold uppercase tracking-[.12em] text-stone-500">{label}<input readOnly value={value} className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950 px-3 py-3 text-sm font-normal normal-case tracking-normal text-stone-200" /></label>
                ))}
              </div>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
