import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      redirect("/dashboard");
    }
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Event Leads</h1>
        <p className="mt-3 text-lg text-foreground/80">
          Turn booth conversations into CRM-ready leads in under thirty
          seconds.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/auth/login">Sign in</ButtonLink>
        <ButtonLink href="/auth/signup" variant="secondary">
          Create account
        </ButtonLink>
      </div>
    </div>
  );
}
