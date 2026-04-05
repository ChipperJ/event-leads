import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserProfile = {
  id: string;
  company_id: string;
  role: "manager" | "rep";
};

export async function requireProfile(): Promise<{
  supabase: ReturnType<typeof createClient>;
  profile: UserProfile;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: row, error } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("id", user.id)
    .single();

  if (error || !row) {
    redirect("/onboarding");
  }

  if (row.role !== "manager" && row.role !== "rep") {
    redirect("/onboarding");
  }

  return {
    supabase,
    profile: {
      id: row.id,
      company_id: row.company_id,
      role: row.role,
    },
  };
}

export async function requireManager(): Promise<{
  supabase: ReturnType<typeof createClient>;
  profile: UserProfile;
}> {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "manager") {
    redirect("/dashboard");
  }
  return ctx;
}
