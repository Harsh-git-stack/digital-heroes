"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "./supabase";

export function useSupabaseAccess(requiredRole) {
  const router = useRouter();
  const [access, setAccess] = useState(() => ({
    status: isSupabaseConfigured ? "checking" : "demo",
    user: null,
    role: null,
    error: "",
  }));

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let active = true;

    async function checkAccess() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError) {
        setAccess({ status: "error", user: null, role: null, error: sessionError.message });
        return;
      }

      if (!sessionData.session) {
        setAccess({ status: "signed-out", user: null, role: null, error: "" });
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      if (!active) return;

      if (error) {
        if (error.name === "AuthSessionMissingError") {
          setAccess({ status: "signed-out", user: null, role: null, error: "" });
          router.replace("/login");
          return;
        }

        setAccess({ status: "error", user: null, role: null, error: error.message });
        return;
      }

      if (!data.user) {
        setAccess({ status: "signed-out", user: null, role: null, error: "" });
        router.replace("/login");
        return;
      }

      if (!requiredRole) {
        setAccess({ status: "authenticated", user: data.user, role: null, error: "" });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!active) return;
      if (profileError) {
        setAccess({ status: "error", user: data.user, role: null, error: profileError.message });
      } else if (profile?.role !== requiredRole) {
        setAccess({ status: "forbidden", user: data.user, role: profile?.role ?? null, error: "" });
      } else {
        setAccess({ status: "authenticated", user: data.user, role: profile.role, error: "" });
      }
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, [requiredRole, router]);

  return access;
}
