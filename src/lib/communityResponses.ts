import type { CommunityResponse } from "@/hooks/useCommunityResponses";
import type { ScoredSite } from "@/hooks/useSitesData";

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getAnswerString(answers: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const direct = answers[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }

  const normalizedKeys = new Map(Object.keys(answers).map((key) => [normalizeText(key), key]));
  for (const key of keys) {
    const matchedKey = normalizedKeys.get(normalizeText(key));
    const value = matchedKey ? answers[matchedKey] : undefined;
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

export type NormalizedCommunityResponse = {
  id: string;
  submittedAt: string;
  formTitle: string;
  formSlug: string;
  siteLabel: string;
  districtLabel: string;
  summary: string;
  answers: Record<string, unknown>;
};

export function normalizeCommunityResponse(response: CommunityResponse): NormalizedCommunityResponse {
  const answers = response.answers ?? {};
  const siteLabel =
    getAnswerString(answers, ["site", "siteName", "settlement", "location", "site location"]) || "Unspecified site";
  const districtLabel =
    getAnswerString(answers, ["district", "districtName", "district name", "region"]) || "Unspecified area";
  const summary =
    getAnswerString(answers, ["message", "description", "comments", "notes", "feedback"]) ||
    Object.entries(answers)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .slice(0, 3)
      .join(" | ");

  return {
    id: response.id,
    submittedAt: response.submittedAt,
    formTitle: response.form.title,
    formSlug: response.form.slug,
    siteLabel,
    districtLabel,
    summary: summary || "Community submission received.",
    answers,
  };
}

export function responseMatchesSite(response: CommunityResponse, site: ScoredSite) {
  const normalized = normalizeCommunityResponse(response);
  const siteName = normalizeText(site.name);
  const district = normalizeText(site.district);
  const region = normalizeText(site.originRegion ?? site.raw?.["Region Name"] ?? "");
  const siteLabel = normalizeText(normalized.siteLabel);
  const districtLabel = normalizeText(normalized.districtLabel);

  if (siteLabel && (siteLabel === siteName || siteName.includes(siteLabel) || siteLabel.includes(siteName))) return true;
  if (districtLabel && (districtLabel === district || districtLabel === region)) return true;

  return false;
}
