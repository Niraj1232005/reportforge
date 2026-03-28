import type { User } from "@supabase/supabase-js";
import { DEFAULT_FONT_LIBRARY } from "@/lib/document-settings";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { sanitizeSingleLineText } from "@/lib/sanitize";
import type { EditorDraftData, ReportRecord, UserProfile } from "@/types/editor";

const PROFILE_FIELDS =
  "id, full_name, college_name, default_font, created_at, updated_at";
const REPORT_FIELDS = "id, user_id, title, content, created_at, updated_at";

const ensureSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
};

const buildDefaultProfile = (user: User): UserProfile => {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    full_name: sanitizeSingleLineText(
      metadata.full_name || user.email?.split("@")[0] || "ReportForge User",
      "ReportForge User",
      120
    ),
    college_name: sanitizeSingleLineText(metadata.college_name || "", "", 160),
    default_font: sanitizeSingleLineText(
      metadata.default_font || DEFAULT_FONT_LIBRARY[0],
      DEFAULT_FONT_LIBRARY[0],
      80
    ),
  };
};

export const getProfileForUser = async (user: User): Promise<UserProfile> => {
  const client = ensureSupabase();
  const fallbackProfile = buildDefaultProfile(user);
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return {
      ...fallbackProfile,
      ...(data as UserProfile),
    };
  }

  const { data: created, error: createError } = await client
    .from("profiles")
    .upsert(fallbackProfile, { onConflict: "id" })
    .select(PROFILE_FIELDS)
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return (created as UserProfile) ?? fallbackProfile;
};

export const updateProfileForUser = async (
  userId: string,
  profile: Pick<UserProfile, "full_name" | "college_name" | "default_font">
): Promise<UserProfile> => {
  const client = ensureSupabase();
  const payload = {
    id: userId,
    full_name: sanitizeSingleLineText(profile.full_name, "ReportForge User", 120),
    college_name: sanitizeSingleLineText(profile.college_name, "", 160),
    default_font: sanitizeSingleLineText(
      profile.default_font,
      DEFAULT_FONT_LIBRARY[0],
      80
    ),
  };

  const { data, error } = await client
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile;
};

export const listReportsForUser = async (userId: string) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("reports")
    .select(REPORT_FIELDS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReportRecord[];
};

export const getReportForUser = async (userId: string, reportId: string) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("reports")
    .select(REPORT_FIELDS)
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ReportRecord | null;
};

export const saveReportForUser = async (
  userId: string,
  draft: EditorDraftData,
  reportId?: string | null
) => {
  const client = ensureSupabase();
  const payload = {
    ...(reportId ? { id: reportId } : {}),
    user_id: userId,
    title: sanitizeSingleLineText(draft.title, "Untitled Report", 200),
    content: draft,
  };

  const { data, error } = await client
    .from("reports")
    .upsert(payload, { onConflict: "id" })
    .select(REPORT_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ReportRecord;
};
