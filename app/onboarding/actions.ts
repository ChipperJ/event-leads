"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type OnboardingState = { error: string | null };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    redirect("/dashboard");
  }

  const companyName = formData.get("companyName")?.toString().trim();
  const fullName = formData.get("fullName")?.toString().trim();
  const role = formData.get("role")?.toString();

  if (!companyName || !fullName) {
    return { error: "Company name and full name are required." };
  }

  if (role !== "manager" && role !== "rep") {
    return { error: "Choose a valid role." };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName })
    .select("id")
    .single();

  if (companyError || !company) {
    return {
      error: companyError?.message ?? "Could not create your workspace.",
    };
  }

  const { error: userError } = await supabase.from("users").insert({
    id: user.id,
    company_id: company.id,
    role,
    full_name: fullName,
    email: user.email ?? "",
  });

  if (userError) {
    return { error: userError.message };
  }

  redirect("/dashboard");
}
