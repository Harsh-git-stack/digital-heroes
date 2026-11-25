"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseAccess } from "@/lib/use-supabase-access";
import { supabase } from "@/lib/supabase";
import AdminManagementPanels from "./management-panels";
import {
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileDown,
  LayoutDashboard,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";

const pipeline = ["quote", "order", "artwork", "proof", "production", "completed"];

const labels = {
  quote: "Quote",
  order: "Order",
  artwork: "Artwork",
  proof: "Proof",
  production: "Production",
  completed: "Completed",
};

const startingJobs = [
  { id: "PF-1048", customer: "Alex Morgan", product: "Race number set", quantity: 250, total: 4680, date: "25 Nov 2026", status: "proof", proofApproved: false, proofVersion: 2 },
  { id: "PF-1047", customer: "Mira Shah", product: "Custom product labels", quantity: 1200, total: 5890, date: "24 Nov 2026", status: "production", proofApproved: true, proofVersion: 1 },
  { id: "PF-1046", customer: "Dev Patel", product: "Laser-cut display", quantity: 80, total: 13200, date: "24 Nov 2026", status: "artwork", proofApproved: false, proofVersion: 0 },
  { id: "PF-1045", customer: "Nina Rao", product: "Acrylic trophies", quantity: 16, total: 6720, date: "23 Nov 2026", status: "order", proofApproved: false, proofVersion: 0 },
  { id: "PF-1043", customer: "Ridge Club", product: "MTB event boards", quantity: 300, total: 18450, date: "21 Nov 2026", status: "completed", proofApproved: true, proofVersion: 3 },
  { id: "PF-1041", customer: "Studio North", product: "Custom stamps", quantity: 25, total: 6270, date: "20 Nov 2026", status: "quote", proofApproved: false, proofVersion: 0 },
];

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

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
}

export default function AdminDashboardPage() {
  const access = useSupabaseAccess("admin");
  const [jobs, setJobs] = useState(startingJobs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [liveJobsLoading, setLiveJobsLoading] = useState(true);
  const [liveJobsError, setLiveJobsError] = useState("");
  const [customerCount, setCustomerCount] = useState(0);
  const [busyJobId, setBusyJobId] = useState("");
  const [busyProofJobId, setBusyProofJobId] = useState("");
  const [busyFileJobId, setBusyFileJobId] = useState("");
  const [busyPaymentJobId, setBusyPaymentJobId] = useState("");
  const [paymentFormJobId, setPaymentFormJobId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [generatedFiles, setGeneratedFiles] = useState({});

  useEffect(() => {
    if (access.status !== "authenticated" || !supabase) return undefined;

    let active = true;

    async function loadJobs() {
      try {
        const [ordersResult, customersResult] = await Promise.all([
          supabase.from("orders").select("id,order_number,user_id,product_id,quantity,total,status,payment_status,payment_method,payment_reference,created_at").order("created_at", { ascending: false }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
        ]);
        if (ordersResult.error) throw new Error(ordersResult.error.message);
        if (customersResult.error) throw new Error(customersResult.error.message);

        const orderRows = ordersResult.data ?? [];
        const orderIds = orderRows.map((order) => order.id);
        const userIds = [...new Set(orderRows.map((order) => order.user_id))];
        const productIds = [...new Set(orderRows.map((order) => order.product_id).filter(Boolean))];

        const [proofsResult, profilesResult, productsResult] = await Promise.all([
          orderIds.length
            ? supabase.from("proofs").select("order_id,version,status").in("order_id", orderIds).order("version", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          userIds.length
            ? supabase.from("profiles").select("id,full_name,email").in("id", userIds)
            : Promise.resolve({ data: [], error: null }),
          productIds.length
            ? supabase.from("products").select("id,name,division").in("id", productIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (proofsResult.error) throw new Error(proofsResult.error.message);
        if (profilesResult.error) throw new Error(profilesResult.error.message);
        if (productsResult.error) throw new Error(productsResult.error.message);

        if (!active) return;
        const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
        const productMap = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
        const latestProofByOrder = new Map();
        for (const proof of proofsResult.data ?? []) {
          if (!latestProofByOrder.has(proof.order_id)) latestProofByOrder.set(proof.order_id, proof);
        }

        setJobs(orderRows.map((order) => {
          const proof = latestProofByOrder.get(order.id);
          const createdAt = new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(new Date(order.created_at));
          const profile = profileMap.get(order.user_id);

          return {
            databaseId: order.id,
            id: `PF-${order.order_number}`,
            customer: profile?.company || profile?.full_name || profile?.email || "Customer",
            product: productMap.get(order.product_id)?.name ?? "Print order",
            family: productMap.get(order.product_id)?.division ?? "Other",
            quantity: order.quantity,
            total: Number(order.total),
            paymentStatus: order.payment_status,
            paymentMethod: order.payment_method,
            paymentReference: order.payment_reference,
            date: createdAt,
            status: order.status,
            proofApproved: proof?.status === "approved",
            proofVersion: proof?.version ?? 0,
          };
        }));
        setCustomerCount(customersResult.count ?? 0);
        setLiveJobsError("");
      } catch (loadError) {
        if (!active) return;
        setLiveJobsError(loadError instanceof Error ? loadError.message : "Could not load production jobs.");
      } finally {
        if (active) setLiveJobsLoading(false);
      }
    }

    void loadJobs();
    return () => {
      active = false;
    };
  }, [access.status]);

  const visibleJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      const matchesSearch = !term || `${job.id} ${job.customer} ${job.product}`.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [jobs, search, statusFilter]);

  const counts = useMemo(() => pipeline.reduce((result, status) => {
    result[status] = jobs.filter((job) => job.status === status).length;
    return result;
  }, {}), [jobs]);

  const reportMetrics = useMemo(() => {
    const paidJobs = jobs.filter((job) => job.paymentStatus === "paid");
    const paidRevenue = paidJobs.reduce((total, job) => total + Number(job.total || 0), 0);
    return {
      paidRevenue,
      paidOrders: paidJobs.length,
      pendingPayments: jobs.filter((job) => job.paymentStatus === "pending").length,
    };
  }, [jobs]);

  const throughput = useMemo(() => {
    const groups = new Map();
    for (const job of jobs) {
      if (job.status !== "completed") continue;
      const family = job.family ?? (
        /label/i.test(job.product) ? "Labels & Stickers"
          : /race|event|number/i.test(job.product) ? "Race & Event Numbers"
            : /mtb|board/i.test(job.product) ? "MTB Boards"
              : /troph/i.test(job.product) ? "Trophies"
                : "Other"
      );
      groups.set(family, (groups.get(family) ?? 0) + 1);
    }
    return [...groups.entries()].sort((first, second) => second[1] - first[1]).slice(0, 4);
  }, [jobs]);

  async function updateStatus(jobId, nextStatus) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) return;

    if ((nextStatus === "production" || nextStatus === "completed") && !job.proofApproved) {
      setNotice(`${job.id} cannot enter ${labels[nextStatus].toLowerCase()} until a proof is approved.`);
      return;
    }

    if (access.status === "authenticated") {
      setBusyJobId(jobId);
      setNotice("");
      try {
        const { error } = await supabase.rpc("advance_order_status", {
          p_order_id: job.databaseId,
          p_status: nextStatus,
        });
        if (error) {
          setNotice(`Could not update ${job.id}: ${error.message}`);
          return;
        }
      } catch (updateError) {
        setNotice(updateError instanceof Error ? `Could not update ${job.id}: ${updateError.message}` : `Could not update ${job.id}. Please try again.`);
        return;
      } finally {
        setBusyJobId("");
      }
    }

    setJobs((current) => current.map((item) => item.id === jobId ? { ...item, status: nextStatus } : item));
    setNotice(access.status === "authenticated"
      ? `${jobId} moved to ${labels[nextStatus]} and saved.`
      : `Demo only: ${jobId} moved to ${labels[nextStatus]}. This change is not saved.`);
  }

  async function recordManualPayment(event, job) {
    event.preventDefault();
    const reference = paymentReference.trim();
    if (reference.length < 2 || reference.length > 120) {
      setNotice("Enter a payment reference between 2 and 120 characters.");
      return;
    }

    setBusyPaymentJobId(job.id);
    setNotice("");
    try {
      const { error } = await supabase.rpc("record_manual_payment", {
        p_order_id: job.databaseId,
        p_method: paymentMethod,
        p_reference: reference,
      });
      if (error) {
        setNotice(`Could not record payment for ${job.id}: ${error.message}`);
        return;
      }

      setJobs((current) => current.map((item) => item.id === job.id
        ? { ...item, paymentStatus: "paid", paymentMethod, paymentReference: reference }
        : item));
      setPaymentFormJobId("");
      setPaymentReference("");
      setNotice(`External payment recorded for ${job.id}.`);
    } catch (error) {
      setNotice(`Could not record payment for ${job.id}: ${error instanceof Error ? error.message : "Unexpected error."}`);
    } finally {
      setBusyPaymentJobId("");
    }
  }

  function showFileNotice(job) {
    setNotice(`${job.id} files are only available after payment, proof approval and production status.`);
  }

  function exportOrdersReport() {
    const csvCell = (value) => {
      const text = String(value ?? "");
      const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const rows = [
      ["order", "customer", "product", "quantity", "total_inr", "payment_status", "payment_method", "payment_reference", "status", "created_at"],
      ...visibleJobs.map((job) => [
        job.id,
        job.customer,
        job.product,
        job.quantity,
        job.total,
        job.paymentStatus ?? "unknown",
        job.paymentMethod ?? "",
        job.paymentReference ?? "",
        job.status,
        job.date,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `printforge-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice(`Exported ${visibleJobs.length} order row(s) to CSV.`);
  }

  async function publishProof(job, file) {
    if (access.status !== "authenticated" || !supabase) {
      setNotice("Sign in as an administrator to upload proof files.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setNotice("Proof files must be 15 MB or smaller.");
      return;
    }
    if (!["pdf", "png", "jpg", "jpeg"].includes(file.name.toLowerCase().split(".").pop())) {
      setNotice("Proof files must be PDF, PNG or JPG.");
      return;
    }

    setBusyProofJobId(job.id);
    setNotice("");
    let uploadedPath = "";
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setNotice(`Could not verify the administrator session: ${sessionError.message}`);
        return;
      }
      if (!sessionData.session?.access_token) {
        setNotice("Your administrator session has expired. Sign in again.");
        return;
      }

      const safeFileName = file.name.replace(/[^\w.-]/g, "_").slice(-100);
      uploadedPath = `orders/${job.databaseId}/proofs/${window.crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("artwork").upload(uploadedPath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) {
        setNotice(`Could not upload the proof: ${uploadError.message}`);
        return;
      }

      const { data, error } = await supabase.rpc("create_order_proof", {
        p_order_id: job.databaseId,
        p_file_path: uploadedPath,
      });
      if (error) {
        const { error: cleanupError } = await supabase.storage.from("artwork").remove([uploadedPath]);
        setNotice(`Could not publish the proof: ${error.message}${cleanupError ? ` Cleanup also failed: ${cleanupError.message}` : ""}`);
        return;
      }

      const proof = Array.isArray(data) ? data[0] : data;
      if (!proof?.created_proof_version) {
        setNotice("Proof file uploaded but its version was not returned. Check the order before retrying.");
        return;
      }

      setJobs((current) => current.map((item) => item.id === job.id
        ? { ...item, status: "proof", proofApproved: false, proofVersion: proof.created_proof_version }
        : item));
      setNotice(`${job.id} proof version ${proof.created_proof_version} is ready for customer review.`);
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? `Could not publish the proof: ${uploadError.message}` : "Could not publish the proof. Please try again.");
    } finally {
      setBusyProofJobId("");
    }
  }

  async function generateFiles(job) {
    if (access.status !== "authenticated" || !supabase) {
      setNotice("Sign in as an administrator to generate production files.");
      return;
    }

    setBusyFileJobId(job.id);
    setNotice("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setNotice(`Could not verify the administrator session: ${sessionError.message}`);
        return;
      }
      if (!sessionData.session?.access_token) {
        setNotice("Your administrator session has expired. Sign in again.");
        return;
      }

      const response = await fetch("/api/admin/production-files", {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionData.session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ orderId: job.databaseId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setNotice(`Could not generate files: ${result.error || "Unexpected server error."}`);
        return;
      }

      setGeneratedFiles((current) => ({ ...current, [job.id]: result.files }));
      setNotice(`Production PDF, PNG and CSV files generated for ${job.id}.`);
    } catch (generationError) {
      setNotice(generationError instanceof Error ? `Could not generate files: ${generationError.message}` : "Could not generate files. Please try again.");
    } finally {
      setBusyFileJobId("");
    }
  }

  if (access.status === "checking" || access.status === "signed-out") {
    return <AdminAccessMessage title="Checking staff access…" />;
  }

  if (access.status === "error") {
    return <AdminAccessMessage title="We couldn’t verify staff access" detail={access.error} />;
  }

  if (access.status === "forbidden") {
    return <AdminAccessMessage title="Staff access required" detail="This account does not have the administrator role." />;
  }

  if (access.status === "authenticated" && liveJobsLoading) {
    return <AdminAccessMessage title="Loading production jobs…" />;
  }

  if (access.status === "authenticated" && liveJobsError) {
    return <AdminAccessMessage title="Could not load production jobs" detail={liveJobsError} />;
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime-300 text-stone-950"><Boxes size={18} /></span>
            PRINTFORGE<span className="-ml-3 text-lime-300">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/account" className="text-xs font-semibold text-stone-400 transition hover:text-lime-300">Customer preview</Link>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-stone-800 text-xs font-bold text-orange-300">{access.user?.email?.slice(0, 2).toUpperCase() ?? "ST"}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8">
        <div role="note" className="rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-3 text-xs leading-5 text-orange-100">
          <strong>{access.status === "demo" ? "Admin preview only:" : "Admin role verified:"}</strong>{" "}
          {access.status === "demo"
            ? "Supabase is not configured, so authentication and role checks are off. All jobs are fabricated demo records."
            : "job records and authorized status changes below are connected to Supabase."}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">Production workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Job control.</h1>
            <p className="mt-2 text-sm text-stone-400">A single queue from incoming order to finished print.</p>
          </div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500"><Clock3 size={14} /> Updated just now{access.status === "demo" ? " · sample data" : " · live orders"}</p>
        </div>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Order summary">
          {[
            { label: "Open jobs", value: jobs.filter((job) => job.status !== "completed").length, detail: "Across active stages", icon: LayoutDashboard },
            { label: "Ready for production", value: jobs.filter((job) => job.status === "production" && job.proofApproved).length, detail: "Approved proof on file", icon: CheckCircle2 },
            { label: "Awaiting proof", value: counts.proof, detail: "Customer review needed", icon: CircleAlert },
            { label: "Customers", value: access.status === "demo" ? 128 : customerCount, detail: access.status === "demo" ? "Demo account total" : "Registered customer accounts", icon: Users },
            { label: "Paid revenue", value: currency.format(reportMetrics.paidRevenue), detail: `${reportMetrics.paidOrders} paid order(s)`, icon: CheckCircle2 },
            { label: "Payment pending", value: reportMetrics.pendingPayments, detail: "Quotes and unpaid orders", icon: Clock3 },
          ].map(({ label, value, detail, icon: Icon }) => (
            <article key={label} className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
              <div className="flex items-center justify-between"><p className="text-sm text-stone-400">{label}</p><Icon size={17} className="text-stone-500" /></div>
              <p className="mt-4 text-3xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-stone-500">{detail}</p>
            </article>
          ))}
        </section>

        <AdminManagementPanels adminId={access.user?.id} />

        <section className="mt-7 rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6" aria-labelledby="pipeline-heading">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><h2 id="pipeline-heading" className="text-lg font-semibold">Production pipeline</h2><p className="mt-1 text-xs text-stone-500">{access.status === "demo" ? "Select a stage to update a demo job." : "Select a stage to update a saved order."}</p></div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {pipeline.map((stage, index) => (
                <div key={stage} className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => setStatusFilter(statusFilter === stage ? "all" : stage)} className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition ${statusFilter === stage ? "border-lime-300 bg-lime-300 text-stone-950" : "border-stone-700 text-stone-300 hover:border-stone-500"}`}>
                    {labels[stage]} <span className="ml-1 opacity-70">{counts[stage]}</span>
                  </button>
                  {index < pipeline.length - 1 && <ArrowRight size={12} className="text-stone-700" />}
                </div>
              ))}
            </div>
          </div>

          {notice && <p role="status" className="mt-5 rounded-xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">{notice}</p>}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search jobs</span>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer or product…" className="w-full rounded-xl border border-stone-800 bg-stone-950 py-3 pl-10 pr-3 text-sm outline-none placeholder:text-stone-600 focus:border-lime-300" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-950 px-3">
              <SlidersHorizontal size={15} className="text-stone-500" />
              <span className="sr-only">Filter order status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-36 bg-transparent py-3 text-sm text-stone-300 outline-none">
                <option value="all">All statuses</option>
                {pipeline.map((stage) => <option key={stage} value={stage}>{labels[stage]}</option>)}
              </select>
            </label>
            <button type="button" onClick={exportOrdersReport} className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-700 px-3 py-2.5 text-xs font-bold text-stone-300 transition hover:border-lime-300 hover:text-lime-300">
              <FileDown size={15} />Export CSV
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {visibleJobs.map((job) => {
              const canGenerateFiles = job.proofApproved
                && ["paid", "mock_paid"].includes(job.paymentStatus)
                && ["production", "completed"].includes(job.status);
              const canUploadProof = access.status === "authenticated"
                && !["production", "completed"].includes(job.status);
              return (
                <article key={job.id} className="grid gap-4 rounded-2xl border border-stone-800 p-4 xl:grid-cols-[1.15fr_.75fr_.6fr_.7fr_1fr] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-lime-300">{job.id}</span><StatusBadge status={job.status} /></div>
                    <h3 className="mt-2 truncate font-semibold">{job.product}</h3>
                    <p className="mt-1 text-xs text-stone-500">{job.customer} · {job.date} · {job.paymentStatus === "paid" || job.paymentStatus === "mock_paid" ? "Paid" : job.paymentStatus === "failed" ? "Payment failed" : "Payment pending"}</p>
                    {job.paymentMethod && <p className="mt-1 break-all text-[11px] text-stone-500">Manual {job.paymentMethod.replace("_", " ")} · Ref {job.paymentReference}</p>}
                  </div>
                  <div><p className="text-xs text-stone-500">Quantity</p><p className="mt-1 text-sm font-semibold">{job.quantity} units</p></div>
                  <div><p className="text-xs text-stone-500">Order total</p><p className="mt-1 text-sm font-semibold">{currency.format(job.total)}</p></div>
                  <div>
                    <p className="text-xs text-stone-500">Proof / files</p>
                    <p className={`mt-1 text-xs font-semibold ${job.proofApproved ? "text-lime-300" : "text-orange-300"}`}>
                      {job.proofApproved ? `Approved · v${job.proofVersion}` : job.proofVersion ? `Pending · v${job.proofVersion}` : "No proof"}
                    </p>
                    <p className="mt-1 text-[10px] text-stone-600">{job.proofApproved ? "Ready gate passed" : "Production files locked"}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                    <label className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-stone-700 px-3 py-2.5 text-xs font-bold text-stone-300 transition hover:border-lime-300 hover:text-lime-300 ${!canUploadProof || busyProofJobId === job.id ? "cursor-not-allowed opacity-40" : ""}`}>
                      {busyProofJobId === job.id ? "Uploading…" : "Upload proof"}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
                        disabled={!canUploadProof || busyProofJobId === job.id}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void publishProof(job, file);
                        }}
                      />
                    </label>
                    <label className="min-w-36 flex-1">
                      <span className="sr-only">Update {job.id} status</span>
                      <select value={job.status} disabled={busyJobId === job.id} onChange={(event) => updateStatus(job.id, event.target.value)} className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-xs text-stone-200 outline-none focus:border-lime-300 disabled:opacity-50">
                        {pipeline.map((stage) => <option key={stage} value={stage}>{labels[stage]}</option>)}
                      </select>
                    </label>
                    <button type="button" onClick={() => canGenerateFiles ? generateFiles(job) : showFileNotice(job)} disabled={!canGenerateFiles || busyFileJobId === job.id} title={canGenerateFiles ? "Generate production files" : "Payment, approved proof and production status are required"} className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-700 px-3 py-2.5 text-xs font-bold text-stone-300 transition hover:border-lime-300 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-40">
                      <ArrowDownToLine size={14} /> {busyFileJobId === job.id ? "Generating…" : "Files"}
                    </button>
                    {["pending", "failed"].includes(job.paymentStatus) && access.status === "authenticated" && (
                      paymentFormJobId === job.id ? (
                        <form onSubmit={(event) => void recordManualPayment(event, job)} className="grid gap-2 rounded-xl border border-stone-800 bg-stone-950 p-3 sm:grid-cols-2 xl:grid-cols-1">
                          <label className="text-[11px] font-semibold text-stone-400">Payment method
                            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-xs text-stone-200">
                              <option value="bank_transfer">Bank transfer</option>
                              <option value="upi">UPI</option>
                              <option value="cash">Cash</option>
                              <option value="other">Other</option>
                            </select>
                          </label>
                          <label className="text-[11px] font-semibold text-stone-400">Transaction / receipt reference
                            <input required minLength="2" maxLength="120" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-xs text-stone-200" />
                          </label>
                          <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
                            <button type="submit" disabled={busyPaymentJobId === job.id} className="rounded-lg bg-lime-300 px-3 py-2 text-xs font-bold text-stone-950 disabled:opacity-50">{busyPaymentJobId === job.id ? "Saving…" : "Confirm received"}</button>
                            <button type="button" onClick={() => { setPaymentFormJobId(""); setPaymentReference(""); }} className="rounded-lg border border-stone-700 px-3 py-2 text-xs text-stone-300">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button type="button" onClick={() => { setPaymentFormJobId(job.id); setPaymentReference(""); }} className="rounded-xl border border-orange-300/30 px-3 py-2.5 text-xs font-bold text-orange-200 transition hover:border-orange-300">Record external payment</button>
                      )
                    )}
                  </div>
                  {generatedFiles[job.id] && (
                    <div className="flex flex-wrap gap-3 text-xs sm:col-span-2 xl:col-span-5">
                      {generatedFiles[job.id].map((file) => (
                        <a key={file.type} href={file.url} target="_blank" rel="noreferrer" className="font-bold text-lime-300 underline">
                          Download {file.type.toUpperCase()}
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
            {visibleJobs.length === 0 && <p className="rounded-2xl border border-dashed border-stone-800 px-4 py-10 text-center text-sm text-stone-500">No jobs match those filters.</p>}
          </div>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <article className="rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Throughput snapshot</h2><p className="mt-1 text-xs text-stone-500">Completed orders by family</p></div><Boxes size={18} className="text-stone-500" /></div>
            <div className="mt-6 space-y-4">
              {throughput.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-xs"><span className="text-stone-300">{label}</span><span className="text-stone-500">{value} jobs</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-800"><div className="h-full rounded-full bg-lime-300" style={{ width: `${(value / throughput[0][1]) * 100}%` }} /></div>
                </div>
              ))}
              {throughput.length === 0 && <p className="text-xs text-stone-500">No completed orders yet.</p>}
            </div>
          </article>
          <article className="rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Today’s handoff</h2>
            <p className="mt-1 text-xs text-stone-500">Production readiness check</p>
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-lime-300/15 bg-lime-300/5 p-4">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-lime-300" />
                <div><p className="text-sm font-semibold">{jobs.filter((job) => job.proofApproved && job.status === "production").length} proof-approved order(s) in production</p><p className="mt-1 text-xs leading-5 text-stone-400">Generate files only after payment and proof approval.</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-orange-300/15 bg-orange-300/5 p-4">
                <CircleAlert size={17} className="mt-0.5 shrink-0 text-orange-300" />
                <div><p className="text-sm font-semibold">{counts.proof} customer proof review(s)</p><p className="mt-1 text-xs leading-5 text-stone-400">The customer dashboard displays available proof versions for review.</p></div>
              </div>
            </div>
            <Link href="/account" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-lime-300 hover:text-lime-200">Open customer proof preview <ArrowRight size={14} /></Link>
          </article>
        </section>
      </div>
    </main>
  );
}

function AdminAccessMessage({ title, detail }) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-950 px-5 text-stone-100">
      <section className="max-w-md rounded-3xl border border-stone-800 bg-stone-900 p-7 text-center">
        <Boxes className="mx-auto text-lime-300" size={28} />
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        {detail && <p className="mt-2 break-words text-sm text-stone-400">{detail}</p>}
        <Link href="/" className="mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-bold text-stone-950">Back to storefront</Link>
      </section>
    </main>
  );
}
