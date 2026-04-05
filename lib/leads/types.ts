export type LeadTemperature = "hot" | "warm" | "cold";

/** Full row shape for CSV export (matches `public.leads` columns). */
export type LeadExportRow = {
  id: string;
  event_id: string;
  captured_by: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  source_tag: string | null;
  temperature: LeadTemperature | null;
  transcript: string | null;
  ai_pain_points: unknown;
  ai_interests: unknown;
  ai_next_steps: unknown;
  ai_urgency: string | null;
  ai_temperature: string | null;
  ai_temperature_reason: string | null;
  consent_given: boolean;
  consent_timestamp: string | null;
  created_at: string;
};

export type LeadListRow = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  source_tag: string | null;
  temperature: LeadTemperature | null;
  ai_pain_points: unknown;
  ai_interests: unknown;
  ai_next_steps: unknown;
  ai_urgency: string | null;
  ai_temperature: string | null;
  ai_temperature_reason: string | null;
};
