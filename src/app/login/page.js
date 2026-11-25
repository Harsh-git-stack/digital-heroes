"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Layers3, LoaderCircle } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("sign-in");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured. Add the project URL and publishable or anon key to .env.local, then restart the dev server.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "sign-in") {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", signInData.user.id)
          .maybeSingle();
        if (profileError) {
          setError(`Signed in, but your account role could not be loaded: ${profileError.message}`);
          return;
        }

        router.replace(profile?.role === "admin" ? "/admin" : "/account");
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim(), company: company.trim() },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.replace("/account");
        router.refresh();
      } else {
        setMessage("Account created. Check your email to confirm the address, then sign in.");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The authentication request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setError("");
  }

  return (
    <main className="grid min-h-screen bg-stone-950 text-stone-100 lg:grid-cols-[1fr_.85fr]">
      <section className="relative hidden overflow-hidden bg-lime-300 p-10 text-stone-950 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-36 top-24 h-96 w-96 rounded-full border-[48px] border-stone-950/10" />
        <Link href="/" className="relative inline-flex items-center gap-3 font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-stone-950 text-lime-300"><Layers3 size={20} /></span>
          PRINTFORGE<span className="-ml-3 text-stone-700">.</span>
        </Link>
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[.2em]">Print work, made personal</p>
          <h1 className="mt-5 text-6xl font-semibold leading-[.94] tracking-[-.06em] xl:text-7xl">Your next great print starts here.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-stone-800">Keep your designs, proofs and repeat orders together in one workspace.</p>
        </div>
        <p className="relative text-xs font-semibold text-stone-800">Configure · Proof · Produce</p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-400 transition hover:text-stone-100 lg:hidden">
            <ArrowLeft size={16} /> PrintForge
          </Link>
          <p className="text-xs text-stone-500">Need help? <a href="mailto:hello@printforge.example" className="font-semibold text-lime-300 hover:text-lime-200">Contact us</a></p>
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-12">
          <div className="mb-8 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-lime-300 text-stone-950"><Layers3 size={20} /></span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">Customer workspace</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{mode === "sign-in" ? "Welcome back." : "Create your account."}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-400">
            {mode === "sign-in" ? "Sign in to review proofs and manage your print orders." : "Save designs, follow orders and approve proofs online."}
          </p>

          <div className="mt-7 grid grid-cols-2 rounded-xl border border-stone-800 bg-stone-900 p-1">
            {[["sign-in", "Sign in"], ["sign-up", "Create account"]].map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => changeMode(value)}
                aria-pressed={mode === value}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === value ? "bg-lime-300 text-stone-950" : "text-stone-400 hover:text-stone-100"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "sign-up" && (
              <>
                <label className="block text-sm font-medium text-stone-300">
                  Full name
                  <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 outline-none focus:border-lime-300" />
                </label>
                <label className="block text-sm font-medium text-stone-300">
                  Company <span className="font-normal text-stone-500">· optional</span>
                  <input autoComplete="organization" value={company} onChange={(event) => setCompany(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 outline-none focus:border-lime-300" />
                </label>
              </>
            )}
            <label className="block text-sm font-medium text-stone-300">
              Email address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 outline-none focus:border-lime-300" />
            </label>
            <label className="block text-sm font-medium text-stone-300">
              Password
              <input required minLength={6} type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 outline-none focus:border-lime-300" />
              {mode === "sign-up" && <span className="mt-1 block text-xs text-stone-500">Use at least 6 characters.</span>}
            </label>

            {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            {message && <p role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">{message}</p>}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3.5 text-sm font-bold text-stone-950 transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-70">
              {busy ? <><LoaderCircle size={16} className="animate-spin" /> Working…</> : <>{mode === "sign-in" ? "Sign in" : "Create account"} <ArrowRight size={16} /></>}
            </button>
          </form>

          {!isSupabaseConfigured && (
            <p className="mt-5 rounded-xl border border-orange-300/20 bg-orange-300/10 p-3 text-xs leading-5 text-orange-100">
              Supabase keys are missing. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code>, then restart the server.
            </p>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-stone-500">
            By continuing, you agree to use this account for your print orders. Online checkout is not available; payments are arranged directly with the print team.
          </p>
          <Link href="/" className="mx-auto mt-6 flex w-fit items-center gap-2 text-xs font-semibold text-stone-500 transition hover:text-lime-300">
            Back to storefront <ArrowLeft size={13} />
          </Link>
        </div>
      </section>
    </main>
  );
}
