"use server";

import { requireManager } from "@/lib/auth/profile";
import { isUuid } from "@/lib/validation/is-uuid";
import { redirect } from "next/navigation";

export type EventFormState = { error: string | null };

export const eventFormInitialState: EventFormState = { error: null };

export async function createEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const { supabase, profile } = await requireManager();

  const name = formData.get("name")?.toString().trim();
  const location = formData.get("location")?.toString().trim() || null;
  const dateRaw = formData.get("date")?.toString().trim();
  const date = dateRaw || null;
  const briefing = formData.get("briefing")?.toString().trim() || null;

  if (!name) {
    return { error: "Event name is required." };
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      company_id: profile.company_id,
      name,
      location,
      date,
      briefing,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create event." };
  }

  redirect(`/events/${data.id}`);
}

export async function updateEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const { supabase, profile } = await requireManager();

  const eventId = formData.get("eventId")?.toString();
  if (!eventId || !isUuid(eventId)) {
    return { error: "Invalid event." };
  }

  const name = formData.get("name")?.toString().trim();
  const location = formData.get("location")?.toString().trim() || null;
  const dateRaw = formData.get("date")?.toString().trim();
  const date = dateRaw || null;
  const briefing = formData.get("briefing")?.toString().trim() || null;

  if (!name) {
    return { error: "Event name is required." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: "Event not found or not in your workspace." };
  }

  const { error } = await supabase
    .from("events")
    .update({
      name,
      location,
      date,
      briefing,
    })
    .eq("id", eventId)
    .eq("company_id", profile.company_id);

  if (error) {
    return { error: error.message };
  }

  redirect(`/events/${eventId}`);
}
