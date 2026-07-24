import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserProfileRow } from "../types/supabase";

type AuthProfileState = {
  loading: boolean;
  session: Session | null;
  profile: UserProfileRow | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
};

function withTimeout<T>(task: PromiseLike<T>, fallback: T, timeoutMs = 7000) {
  return Promise.race([
    Promise.resolve(task).catch(() => fallback),
    new Promise<T>((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    })
  ]);
}

const ADMIN_EMAILS = ["joshuaverzosa879@gmail.com"];

async function fetchProfile(userId?: string, userEmail?: string) {
  if (!supabase || !userId) return null;

  const res = await withTimeout<any>(
    supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle(),
    { data: null, error: null }
  );

  const isOwnerEmail = Boolean(userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase()));
  
  if (res && res.data) {
    const prof = res.data as UserProfileRow;
    if (isOwnerEmail && prof.role !== "admin") {
      void supabase.from("user_profiles").update({ role: "admin" }).eq("id", userId);
      return { ...prof, role: "admin" as const };
    }
    return prof;
  }

  if (isOwnerEmail && userId) {
    const newProf: UserProfileRow = {
      id: userId,
      email: userEmail?.toLowerCase() || "",
      display_name: "Admin",
      username: "admin",
      role: "admin" as const,
      status: "active" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    void supabase.from("user_profiles").upsert({
      id: userId,
      email: userEmail?.toLowerCase(),
      display_name: "Admin",
      username: "admin",
      role: "admin",
      status: "active"
    });
    return newProf;
  }

  return null;
}

export function useAuthProfile(): AuthProfileState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    const nextProfile = await fetchProfile(session?.user.id, session?.user.email);
    if (nextProfile) setProfile(nextProfile);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let ignore = false;

    async function load() {
      const { data } = await withTimeout(
        supabase!.auth.getSession(),
        { data: { session: null }, error: null }
      );
      if (ignore) return;
      setSession(data.session);
      const nextProfile = await fetchProfile(data.session?.user.id, data.session?.user.email);
      if (nextProfile || !data.session) setProfile(nextProfile);
      setLoading(false);
    }

    void load();

    const { data } = supabase.auth.onAuthStateChange(async (_, nextSession) => {
      setSession(nextSession);
      const nextProfile = await fetchProfile(nextSession?.user.id, nextSession?.user.email);
      if (nextProfile || !nextSession) setProfile(nextProfile);
      setLoading(false);
    });

    return () => {
      ignore = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const userEmail = session?.user?.email?.toLowerCase();
  const isOwnerEmail = Boolean(userEmail && ADMIN_EMAILS.includes(userEmail));

  const roleIsAdmin =
    isOwnerEmail ||
    profile?.role === "admin" ||
    session?.user?.app_metadata?.role === "admin" ||
    session?.user?.user_metadata?.role === "admin";

  const isNotDisabled = profile ? profile.status !== "disabled" : true;

  return {
    loading,
    session,
    profile,
    isAdmin: Boolean(session && roleIsAdmin && isNotDisabled),
    refreshProfile
  };
}
