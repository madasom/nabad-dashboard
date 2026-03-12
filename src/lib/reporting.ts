import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  computeCompositeScore,
  type CommunityAlert,
  type SiteProfile,
} from "@/data/nabad";
import type { ScoredSite } from "@/hooks/useSitesData";
import type { Alert as ApiAlert } from "@/hooks/useAlertsData";
import type { CommunityResponse } from "@/hooks/useCommunityResponses";

export type ReportId =
  | "hotspot-identification"
  | "early-warning-alert"
  | "displacement-alert"
  | "community-needs-summary"
  | "malnutrition-alert"
  | "health-service-gap"
  | "sadd";

export type ExportFormat = "pdf" | "csv" | "xlsx";

export interface ReportTemplate {
  id: ReportId;
  name: string;
  description: string;
  category: string;
  lastGenerated: string;
}

interface ReportSection {
  title: string;
  body?: string[];
  table?: Array<Record<string, string | number>>;
}

interface ReportKeyStat {
  label: string;
  value: string;
  note?: string;
}

interface ReportChartSeries {
  label: string;
  color: [number, number, number];
  values: number[];
}

interface ReportChart {
  title: string;
  type: "bar" | "line";
  labels: string[];
  series: ReportChartSeries[];
  footnote?: string;
}

interface BuiltReport {
  title: string;
  filenameBase: string;
  summary: string[];
  overview?: string[];
  keyDrivers?: string[];
  recommendedActions?: string[];
  keyStats?: ReportKeyStat[];
  charts?: ReportChart[];
  methodology?: string[];
  sections: ReportSection[];
  exportRows: Array<Record<string, string | number>>;
}

type ReportSite = SiteProfile & Partial<ScoredSite>;
type ReportAlert = ApiAlert | (CommunityAlert & { siteName?: string });

export interface ReportDataContext {
  sites?: ReportSite[];
  alerts?: ReportAlert[];
  communityResponses?: CommunityResponse[];
}

const HOTSPOT_PENTA3_THRESHOLD = 50;
const HOTSPOT_GAM_THRESHOLD = 15;
const SUDDEN_ARRIVALS_THRESHOLD = 100;
const ETT_CONTEXT_LINES = [
  "Emergency Trends Tracking was initiated in February 2025 to monitor displacement movements during the Jilaal dry season.",
  "The latest ETT round used in this dashboard reflects the reduced operational coverage phase that continued after funding and access constraints from mid-2025.",
  "ETT is crisis-based and tracks sudden displacement events or emerging crises, with data collected through Key Informant Interviews at location level.",
];
const ETT_METHODOLOGY_LINES = [
  "ETT focuses on the main urban centers and surrounding villages for each assessed district rather than a full district census.",
  "New arrivals represent people arriving in a settlement during the reporting week and may include secondary displacement, not only first-time displacement.",
  "Findings are estimates because most indicators reflect the majority profile reported for a location rather than a complete individual-level registry.",
];
const ETT_DEFINITION_ROWS = [
  { Term: "New arrivals", Meaning: "People reported to have arrived in a settlement during the reporting week; may include secondary displacement." },
  { Term: "Urban settlements", Meaning: "Neighbourhoods in the main administrative town of each district." },
  { Term: "Rural settlements", Meaning: "Villages outside the main urban center." },
  { Term: "IDP sites", Meaning: "Camp and camp-like settings hosting internally displaced people." },
  { Term: "SRSD / SROD / OC", Meaning: "Origin shorthand used in the imported dataset for same district, other district, or other country." },
];
const ETT_LIMITATION_ROWS = [
  { Limitation: "KII-based estimates", Implication: "Results should be treated as indicative rather than exact counts." },
  { Limitation: "Majority-profile reporting", Implication: "Origin, reason for displacement, and needs describe the dominant pattern at site level, not every household." },
  { Limitation: "Partial district coverage", Implication: "ETT covers priority urban centers and surrounding villages only; some districts do not have full geographic coverage." },
  { Limitation: "Operational interruptions", Implication: "Coverage changed during 2025 because of funding and access constraints, so trends should be read with that context." },
];

export const reportTemplates: ReportTemplate[] = [
  {
    id: "hotspot-identification",
    name: "Hotspot Identification Report",
    description: "Locations crossing priority thresholds for Penta3, GAM, and sudden arrivals.",
    category: "hotspots",
    lastGenerated: "2026-03-09",
  },
  {
    id: "early-warning-alert",
    name: "Early Warning Alert Report",
    description: "Triggered alerts for displacement, health, protection, and other early warning signals.",
    category: "alerts",
    lastGenerated: "2026-03-09",
  },
  {
    id: "displacement-alert",
    name: "Displacement Alert Report",
    description: "New arrivals and displacement trends by district and site.",
    category: "displacement",
    lastGenerated: "2026-03-09",
  },
  {
    id: "community-needs-summary",
    name: "Community Needs Summary Report",
    description: "Top reported needs and concentration of community-reported issues.",
    category: "community",
    lastGenerated: "2026-03-09",
  },
  {
    id: "malnutrition-alert",
    name: "Malnutrition Alert Report",
    description: "GAM prevalence summary with nutrition hotspot prioritization.",
    category: "nutrition",
    lastGenerated: "2026-03-09",
  },
  {
    id: "health-service-gap",
    name: "Health Service Gap Report",
    description: "Low-coverage areas and dropout-risk proxy based on immunization gap.",
    category: "health",
    lastGenerated: "2026-03-09",
  },
  {
    id: "sadd",
    name: "SADD Report",
    description: "Sex, age, and disability disaggregation snapshot with current data gaps noted.",
    category: "accountability",
    lastGenerated: "2026-03-09",
  },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return `${value.toFixed(1)}%`;
}

function formatNeedLabel(value: string) {
  const map: Record<string, string> = {
    newArrivals: "New arrivals",
    wash: "WASH",
    health: "Health",
    food: "Food",
    protection: "Protection",
  };
  return map[value] ?? value;
}

function getAlertPriority(alert: { severity?: string | null }) {
  const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return order[(alert.severity ?? "low").toLowerCase()] ?? 1;
}

function getSites(context?: ReportDataContext) {
  return context?.sites ?? [];
}

function rankAvailableSites(context?: ReportDataContext) {
  return getSites(context)
    .map((site) => {
      const score = site._score ?? computeCompositeScore(site);
      return { ...site, score };
    })
    .sort((a, b) => b.score.composite - a.score.composite);
}

function getAlerts(context?: ReportDataContext) {
  return context?.alerts ?? [];
}

function normalizeAnswerValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => normalizeAnswerValue(item)).filter(Boolean).join(", ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map((item) => normalizeAnswerValue(item)).filter(Boolean).join(", ");
  return "";
}

function inferNeedCategory(text: string) {
  const normalized = text.toLowerCase();
  if (/arrival|displac|evict|movement/.test(normalized)) return "New arrivals";
  if (/wash|water|latrine|sanitation|hygiene/.test(normalized)) return "WASH";
  if (/health|clinic|awd|cholera|vaccine|penta|nutrition|gam|malnutrition/.test(normalized)) return "Health";
  if (/food|cash|livelihood|shelter|nfi/.test(normalized)) return "Food";
  if (/protect|gbv|harass|safety|violence/.test(normalized)) return "Protection";
  return "Other";
}

function inferSeverity(text: string) {
  const normalized = text.toLowerCase();
  if (/critical|severe|urgent|life.?threat|outbreak/.test(normalized)) return "critical";
  if (/high|immediate|acute|serious/.test(normalized)) return "high";
  if (/medium|moderate/.test(normalized)) return "medium";
  return "medium";
}

function normalizeCommunityResponses(context?: ReportDataContext) {
  const responses = context?.communityResponses ?? [];

  return responses.map((response) => {
    const answers = response.answers ?? {};
    const site =
      normalizeAnswerValue(answers.site) ||
      normalizeAnswerValue(answers.siteName) ||
      normalizeAnswerValue(answers.settlement) ||
      normalizeAnswerValue(answers.location) ||
      "Community response";
    const district =
      normalizeAnswerValue(answers.district) ||
      normalizeAnswerValue(answers.districtName) ||
      "Unspecified";
    const message =
      normalizeAnswerValue(answers.message) ||
      normalizeAnswerValue(answers.description) ||
      normalizeAnswerValue(answers.comments) ||
      normalizeAnswerValue(answers.notes) ||
      normalizeAnswerValue(answers.feedback) ||
      "Community submission received.";
    const categoryText =
      normalizeAnswerValue(answers.category) ||
      normalizeAnswerValue(answers.need) ||
      normalizeAnswerValue(answers.priorityNeed) ||
      normalizeAnswerValue(answers.mainNeed);
    const severityText =
      normalizeAnswerValue(answers.severity) ||
      normalizeAnswerValue(answers.priority) ||
      normalizeAnswerValue(answers.urgency);

    return {
      id: response.id,
      site,
      siteName: site,
      district,
      channel: response.form.title,
      category: categoryText || inferNeedCategory(message),
      severity: (severityText || inferSeverity(message)).toLowerCase(),
      message,
      reportedAt: response.submittedAt,
    };
  });
}

function clampChartValue(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function topDistrictSummary(context?: ReportDataContext) {
  const districts = getSites(context).reduce<Record<string, { sites: number; arrivals: number }>>((acc, site) => {
    const current = acc[site.district] ?? { sites: 0, arrivals: 0 };
    current.sites += 1;
    current.arrivals += site.newArrivals14d ?? 0;
    acc[site.district] = current;
    return acc;
  }, {});

  return Object.entries(districts)
    .map(([district, value]) => ({ district, ...value }))
    .sort((a, b) => b.arrivals - a.arrivals || b.sites - a.sites)[0] ?? null;
}

function withSharedMethodology(report: BuiltReport): BuiltReport {
  return {
    ...report,
    methodology: [...ETT_CONTEXT_LINES, ...(report.methodology ?? []), ...ETT_METHODOLOGY_LINES],
    sections: [
      ...report.sections,
      {
        title: "ETT Definitions",
        table: ETT_DEFINITION_ROWS,
      },
      {
        title: "ETT Limitations",
        table: ETT_LIMITATION_ROWS,
      },
    ],
  };
}

function buildHotspotReport(context?: ReportDataContext): BuiltReport {
  const rows = rankAvailableSites(context)
    .filter(
      (site) =>
        (site.penta3Coverage !== null && site.penta3Coverage < HOTSPOT_PENTA3_THRESHOLD) ||
        (site.gam !== null && site.gam > HOTSPOT_GAM_THRESHOLD) ||
        site.newArrivals14d >= SUDDEN_ARRIVALS_THRESHOLD
    )
    .map((site) => ({
      Site: site.name,
      District: site.district,
      "Penta3 Coverage": formatPercent(site.penta3Coverage),
      "GAM Prevalence": formatPercent(site.gam),
      "New Arrivals (14d)": site.newArrivals14d,
      Trigger: [
        site.penta3Coverage !== null && site.penta3Coverage < HOTSPOT_PENTA3_THRESHOLD ? "Penta3 < 50%" : null,
        site.gam !== null && site.gam > HOTSPOT_GAM_THRESHOLD ? "GAM > 15%" : null,
        site.newArrivals14d >= SUDDEN_ARRIVALS_THRESHOLD ? "Sudden arrivals" : null,
      ]
        .filter(Boolean)
        .join(", "),
      "Composite Risk": site.score.composite,
    }));

  return withSharedMethodology({
    title: "Hotspot Identification Report",
    filenameBase: "hotspot-identification-report",
    summary: [
      `${rows.length} locations currently cross at least one hotspot threshold.`,
      `Thresholds applied: Penta3 coverage below ${HOTSPOT_PENTA3_THRESHOLD}%, GAM above ${HOTSPOT_GAM_THRESHOLD}%, or sudden arrivals of ${SUDDEN_ARRIVALS_THRESHOLD}+ people in 14 days.`,
      `Highest-risk locations are ranked using the existing composite site prioritization model.`,
    ],
    overview: [
      "This snapshot highlights the locations with the strongest convergence of displacement pressure, health risk, and unmet needs.",
      "Threshold triggers are combined with the composite vulnerability model so the output can support both rapid review and operational follow-up.",
    ],
    keyDrivers: [
      "Low Penta3 coverage signals reduced continuity of essential immunisation services.",
      "Elevated GAM prevalence indicates worsening nutrition risk and treatment pressure.",
      "Sudden arrivals increase demand on already stretched shelter, WASH, and health services.",
    ],
    recommendedActions: [
      "Verify the highest-ranked hotspots through partner follow-up within 72 hours.",
      "Prioritise outreach to sites crossing more than one threshold.",
      "Use the detailed annex to plan site-level verification and escalation.",
    ],
    keyStats: [
      { label: "Hotspots flagged", value: `${rows.length}` },
      { label: "Thresholds used", value: "3", note: "Penta3, GAM, arrivals" },
      { label: "Top district", value: rows[0]?.District ? String(rows[0].District) : "N/A" },
    ],
    charts: [
      {
        title: "Top hotspot composite risk",
        type: "bar",
        labels: rows.slice(0, 6).map((row) => String(row.Site)),
        series: [
          {
            label: "CVI",
            color: [22, 163, 74],
            values: rows.slice(0, 6).map((row) => Number(row["Composite Risk"])),
          },
        ],
        footnote: "Bars show the top currently flagged sites ranked by composite vulnerability.",
      },
    ],
    methodology: [
      "Sites are flagged when one or more trigger thresholds are crossed.",
      "Composite risk is derived from displacement, health, community signals, needs, and safety indicators already loaded into the dashboard.",
    ],
    sections: [
      {
        title: "Priority Hotspots",
        table: rows,
      },
    ],
    exportRows: rows,
  });
}

function buildEarlyWarningReport(context?: ReportDataContext): BuiltReport {
  const sites = getSites(context);
  const siteSignals = sites.flatMap((site) => {
    const items: Array<Record<string, string | number>> = [];
    if (site.newArrivals14d >= SUDDEN_ARRIVALS_THRESHOLD) {
      items.push({
        Date: format(new Date(site.lastReport), "yyyy-MM-dd"),
        Site: site.name,
        District: site.district,
        Trigger: "Displacement surge",
        Severity: "high",
        Detail: `${site.newArrivals14d} new arrivals recorded in the last 14 days.`,
      });
    }
    if (
      (site.gam !== null && site.gam > HOTSPOT_GAM_THRESHOLD) ||
      (site.penta3Coverage !== null && site.penta3Coverage < HOTSPOT_PENTA3_THRESHOLD)
    ) {
      items.push({
        Date: format(new Date(site.lastReport), "yyyy-MM-dd"),
        Site: site.name,
        District: site.district,
        Trigger: "Health threshold",
        Severity:
          site.gam !== null &&
          site.gam > HOTSPOT_GAM_THRESHOLD &&
          site.penta3Coverage !== null &&
          site.penta3Coverage < HOTSPOT_PENTA3_THRESHOLD
            ? "critical"
            : "high",
        Detail: `Penta3 ${formatPercent(site.penta3Coverage)}; GAM ${formatPercent(site.gam)}.`,
      });
    }
    return items;
  });

  const alertSignals = [...getAlerts(context), ...normalizeCommunityResponses(context)]
    .filter((alert) => getAlertPriority(alert) >= 2)
    .map((alert) => ({
      Date: format(new Date(alert.reportedAt), "yyyy-MM-dd HH:mm"),
      Site: alert.siteName ?? alert.site,
      District: alert.district,
      Trigger: formatNeedLabel(alert.category ?? "Other"),
      Severity: alert.severity,
      Detail: alert.message,
    }));

  const rows = [...alertSignals, ...siteSignals].sort((a, b) => {
    const severityDelta =
      getAlertPriority({ severity: b.Severity as CommunityAlert["severity"] }) -
      getAlertPriority({ severity: a.Severity as CommunityAlert["severity"] });
    return severityDelta || `${b.Date}`.localeCompare(`${a.Date}`);
  });
  const severityCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.Severity ?? "unknown");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return withSharedMethodology({
    title: "Early Warning Alert Report",
    filenameBase: "early-warning-alert-report",
    summary: [
      `${rows.length} early warning signals are active across displacement, health, and community alert channels.`,
      "Community-reported alerts with medium severity or above are merged with automatic threshold-based site triggers.",
      "This report is intended as an action log for follow-up, verification, and escalation.",
    ],
    overview: [
      "The snapshot merges automatic threshold triggers with community-reported alerts into a single operational alert picture.",
      "Severity and recency are emphasized so teams can identify which signals require the fastest follow-up.",
    ],
    keyDrivers: [
      "Displacement surges can alter service demand within days.",
      "Health threshold breaches raise risk of secondary deterioration if not verified quickly.",
      "Community alerts often surface localized protection and WASH issues before formal assessments catch up.",
    ],
    recommendedActions: [
      "Review critical and high alerts first and assign a follow-up owner.",
      "Triangulate site-level triggers with partner or field verification.",
      "Document resolved alerts and re-opened alerts in the next reporting round.",
    ],
    keyStats: [
      { label: "Active signals", value: `${rows.length}` },
      { label: "Critical/high", value: `${(severityCounts.critical ?? 0) + (severityCounts.high ?? 0)}` },
      { label: "Community inputs", value: `${alertSignals.length}` },
    ],
    charts: [
      {
        title: "Alert severity distribution",
        type: "bar",
        labels: ["Critical", "High", "Medium", "Low"],
        series: [
          {
            label: "Signals",
            color: [239, 68, 68],
            values: [
              severityCounts.critical ?? 0,
              severityCounts.high ?? 0,
              severityCounts.medium ?? 0,
              severityCounts.low ?? 0,
            ],
          },
        ],
      },
    ],
    methodology: [
      "Included triggers: sudden arrivals, low Penta3 coverage, high GAM prevalence, and community alerts tagged by category/severity.",
      "Signals are sorted by severity first, then by most recent report date.",
    ],
    sections: [
      {
        title: "Active Alert Feed",
        table: rows,
      },
    ],
    exportRows: rows,
  });
}

function buildDisplacementReport(context?: ReportDataContext): BuiltReport {
  const rowsSource = getSites(context)
    .filter((site) => site.newArrivals14d > 0)
    .map((site) => ({
      site: site.name,
      district: site.district,
      arrivals: site.newArrivals14d,
      reportedAt: site.lastReport,
      source: site.source ?? "IOM",
    }));

  const byDistrict = rowsSource.reduce<Record<string, { events: number; arrivals: number }>>((acc, event) => {
    const current = acc[event.district] ?? { events: 0, arrivals: 0 };
    current.events += 1;
    current.arrivals += event.arrivals;
    acc[event.district] = current;
    return acc;
  }, {});

  const districtRows = Object.entries(byDistrict)
    .map(([district, value]) => ({
      District: district,
      "Reported Events": value.events,
      "Total Arrivals": value.arrivals,
      "Average Arrivals / Event": Math.round(value.arrivals / value.events),
    }))
    .sort((a, b) => Number(b["Total Arrivals"]) - Number(a["Total Arrivals"]));

  const siteRows = rowsSource
    .map((event) => ({
      Date: format(new Date(event.reportedAt), "yyyy-MM-dd"),
      Site: event.site,
      District: event.district,
      Arrivals: event.arrivals,
      Source: event.source,
    }))
    .sort((a, b) => Number(b.Arrivals) - Number(a.Arrivals));

  const topDistrict = districtRows[0];

  return withSharedMethodology({
    title: "Displacement Alert Report",
    filenameBase: "displacement-alert-report",
    summary: [
      `${rowsSource.length} site records with displacement signals are currently available from imported datasets.`,
      `${districtRows[0]?.District ?? "No district"} currently reports the highest arrival burden.`,
      "District-level totals are paired with site-level event detail for operational targeting.",
    ],
    overview: [
      "This displacement snapshot summarizes where arrival pressure is currently being reported across the loaded site set.",
      "District trends provide the geographic overview, while site rows show the event detail needed for follow-up.",
    ],
    keyDrivers: [
      "Arrival concentration indicates where service demand may rise fastest.",
      "Repeated reporting in the same district can signal persistent movement rather than a single event.",
      "Site-level origin and cause fields help link displacement to specific shocks.",
    ],
    recommendedActions: [
      "Prioritise verification in the highest-arrival districts.",
      "Cross-check sudden arrival spikes with community alerts and health indicators.",
      "Use the site-level annex for field tasking and referral planning.",
    ],
    keyStats: [
      { label: "Active site records", value: `${rowsSource.length}` },
      { label: "Total arrivals", value: `${rowsSource.reduce((sum, row) => sum + row.arrivals, 0).toLocaleString()}` },
      { label: "Top district", value: topDistrict ? String(topDistrict.District) : "N/A", note: topDistrict ? `${topDistrict["Total Arrivals"]} arrivals` : undefined },
    ],
    charts: [
      {
        title: "District arrivals",
        type: "bar",
        labels: districtRows.slice(0, 6).map((row) => String(row.District)),
        series: [
          {
            label: "Arrivals",
            color: [249, 115, 22],
            values: districtRows.slice(0, 6).map((row) => Number(row["Total Arrivals"])),
          },
        ],
      },
    ],
    methodology: [
      "District trends are aggregated from site-level displacement events currently loaded into the dashboard.",
      "Site table is ordered by arrival volume to show the strongest current displacement pressure first.",
    ],
    sections: [
      {
        title: "District Trend Summary",
        table: districtRows,
      },
      {
        title: "Site-Level Arrival Events",
        table: siteRows,
      },
    ],
    exportRows: siteRows,
  });
}

function buildCommunityNeedsReport(context?: ReportDataContext): BuiltReport {
  const communitySignals = [...normalizeCommunityResponses(context), ...getAlerts(context)];
  const needCounts = communitySignals.reduce<Record<string, number>>((acc, alert) => {
    const key = formatNeedLabel(alert.category ?? "Other");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const topNeedRows = Object.entries(needCounts)
    .map(([need, count]) => ({
      Need: need,
      "Reported Alerts": count,
      Share: formatPercent((count / Math.max(communitySignals.length, 1)) * 100),
    }))
    .sort((a, b) => Number(b["Reported Alerts"]) - Number(a["Reported Alerts"]));

  const siteNeedRows = communitySignals
    .reduce<Record<string, { district: string; alerts: number; categories: Set<string> }>>((acc, alert) => {
      const key = alert.siteName ?? alert.site;
      const current = acc[key] ?? { district: alert.district ?? "Unspecified", alerts: 0, categories: new Set<string>() };
      current.alerts += 1;
      current.categories.add(formatNeedLabel(alert.category ?? "Other"));
      acc[key] = current;
      return acc;
    }, {})
    ;

  const concentrationRows = Object.entries(siteNeedRows)
    .map(([site, value]) => ({
      Site: site,
      District: value.district,
      "Alert Count": value.alerts,
      "Need Types": Array.from(value.categories).join(", "),
    }))
    .sort((a, b) => Number(b["Alert Count"]) - Number(a["Alert Count"]));

  return withSharedMethodology({
    title: "Community Needs Summary Report",
    filenameBase: "community-needs-summary-report",
    summary: [
      `${communitySignals.length} community inputs are summarized in this reporting window.`,
      `${topNeedRows[0]?.Need ?? "No need"} is the most frequently reported priority need.`,
      "Site concentration helps identify where repeated community concerns justify follow-up or verification.",
    ],
    overview: [
      "This snapshot condenses community-reported issues from alerts and form submissions into a ranked needs picture.",
      "The output is best used to identify repeated concern types and where they are concentrating geographically.",
    ],
    keyDrivers: [
      "Repeated need categories often indicate service gaps that are persisting across reporting rounds.",
      "High site concentration can point to emerging hotspot conditions requiring verification.",
      "Community submissions add granularity where formal site indicators remain sparse.",
    ],
    recommendedActions: [
      "Review the top need categories against ongoing partner coverage.",
      "Flag sites with repeated community reports for targeted follow-up.",
      "Use the annex to compare alert channels and narrative details.",
    ],
    keyStats: [
      { label: "Community inputs", value: `${communitySignals.length}` },
      { label: "Top need", value: topNeedRows[0]?.Need ? String(topNeedRows[0].Need) : "N/A" },
      { label: "Sites flagged", value: `${concentrationRows.length}` },
    ],
    charts: [
      {
        title: "Top reported needs",
        type: "bar",
        labels: topNeedRows.slice(0, 6).map((row) => String(row.Need)),
        series: [
          {
            label: "Reports",
            color: [234, 179, 8],
            values: topNeedRows.slice(0, 6).map((row) => Number(row["Reported Alerts"])),
          },
        ],
      },
    ],
    methodology: [
      "Community alerts from SMS, hotline, and CDMC channels are grouped by need category and site.",
      "Counts reflect frequency of reported issues rather than population-wide prevalence.",
    ],
    sections: [
      {
        title: "Top Reported Needs",
        table: topNeedRows,
      },
      {
        title: "Site Concentration of Community Reports",
        table: concentrationRows,
      },
    ],
    exportRows: concentrationRows,
  });
}

function buildMalnutritionReport(context?: ReportDataContext): BuiltReport {
  const sites = getSites(context);
  const districtRows = Object.entries(
    sites.reduce<Record<string, { totalGam: number; sites: number; hotspots: number }>>((acc, site) => {
      const current = acc[site.district] ?? { totalGam: 0, sites: 0, hotspots: 0 };
      current.totalGam += site.gam ?? 0;
      current.sites += 1;
      if (site.gam !== null && site.gam > HOTSPOT_GAM_THRESHOLD) current.hotspots += 1;
      acc[site.district] = current;
      return acc;
    }, {})
  ).map(([district, value]) => ({
    District: district,
    "Average GAM": formatPercent(value.totalGam / value.sites),
    "Hotspot Sites": value.hotspots,
    "Sites Assessed": value.sites,
  }));

  const hotspotRows = sites
    .filter((site) => site.gam !== null && site.gam > HOTSPOT_GAM_THRESHOLD)
    .sort((a, b) => (b.gam ?? 0) - (a.gam ?? 0))
    .map((site) => ({
      Site: site.name,
      District: site.district,
      "GAM Prevalence": formatPercent(site.gam),
      "Penta3 Coverage": formatPercent(site.penta3Coverage),
      "New Arrivals (14d)": site.newArrivals14d,
    }));

  return withSharedMethodology({
    title: "Malnutrition Alert Report",
    filenameBase: "malnutrition-alert-report",
    summary: [
      `${hotspotRows.length} sites are above the ${HOTSPOT_GAM_THRESHOLD}% GAM hotspot threshold.`,
      "District averages are included to show where nutrition risk is clustering geographically.",
      "Cross-reference with arrival pressure and immunization gaps supports prioritization of nutrition outreach.",
    ],
    overview: [
      "This nutrition snapshot highlights areas where GAM prevalence indicates elevated malnutrition pressure.",
      "District averages and hotspot rows are presented together to support quick review and targeted follow-up.",
    ],
    keyDrivers: [
      "Elevated GAM suggests worsening nutrition outcomes and treatment demand.",
      "Arrival pressure can intensify nutritional stress in under-served sites.",
      "Low immunization coverage may coincide with broader health access constraints.",
    ],
    recommendedActions: [
      "Prioritise nutrition follow-up in districts with the highest average GAM.",
      "Cross-check GAM hotspots against active health and displacement alerts.",
      "Use the annex to identify where nutrition outreach should be sequenced first.",
    ],
    keyStats: [
      { label: "Hotspot sites", value: `${hotspotRows.length}` },
      { label: "Threshold used", value: `${HOTSPOT_GAM_THRESHOLD}% GAM` },
      { label: "Top district", value: districtRows[0]?.District ? String(districtRows[0].District) : "N/A" },
    ],
    charts: [
      {
        title: "District GAM averages",
        type: "bar",
        labels: districtRows.slice(0, 6).map((row) => String(row.District)),
        series: [
          {
            label: "Average GAM",
            color: [220, 38, 38],
            values: districtRows.slice(0, 6).map((row) => Number.parseFloat(String(row["Average GAM"]))),
          },
        ],
        footnote: "Values are district-level means across currently loaded site profiles.",
      },
    ],
    methodology: [
      `Sites with GAM prevalence above ${HOTSPOT_GAM_THRESHOLD}% are classified as malnutrition hotspots in this report.`,
      "District averages are simple means across loaded site profiles.",
    ],
    sections: [
      {
        title: "District GAM Summary",
        table: districtRows,
      },
      {
        title: "Nutrition Hotspots",
        table: hotspotRows,
      },
    ],
    exportRows: hotspotRows,
  });
}

function buildHealthGapReport(context?: ReportDataContext): BuiltReport {
  const sites = getSites(context);
  const liveAlerts = [...getAlerts(context), ...normalizeCommunityResponses(context)];
  const rows = sites
    .map((site) => {
      const healthAlerts = liveAlerts.filter((alert) => (alert.siteName ?? alert.site) === site.name && (alert.category ?? "").toLowerCase() === "health").length;
      const coverageGap = Math.max(0, 100 - (site.penta3Coverage ?? 0));
      const dropoutProxy = Math.max(0, Math.round(coverageGap - 40));

      return {
        Site: site.name,
        District: site.district,
        "Penta3 Coverage": formatPercent(site.penta3Coverage),
        "Coverage Gap": formatPercent(coverageGap),
        "Dropout Risk Proxy": `${dropoutProxy}`,
        "Health Alerts": healthAlerts,
      };
    })
    .filter((site) => Number.parseFloat(`${site["Penta3 Coverage"]}`) < HOTSPOT_PENTA3_THRESHOLD || Number(site["Health Alerts"]) > 0)
    .sort((a, b) => Number.parseFloat(`${b["Coverage Gap"]}`) - Number.parseFloat(`${a["Coverage Gap"]}`));

  return withSharedMethodology({
    title: "Health Service Gap Report",
    filenameBase: "health-service-gap-report",
    summary: [
      `${rows.length} sites are flagged for low immunization coverage or active health-related alerts.`,
      "Coverage gap is measured as the shortfall from full Penta3 coverage; dropout risk is shown as a proxy indicator rather than a confirmed service utilization measure.",
      "This report is intended to support outreach, referral, and verification planning.",
    ],
    overview: [
      "This health service snapshot highlights areas where immunization coverage gaps or health-tagged alerts indicate service disruption.",
      "Coverage shortfall and the dropout-risk proxy are presented together to support fast review and prioritization.",
    ],
    keyDrivers: [
      "Low Penta3 coverage signals disruption in routine immunization continuity.",
      "Health-tagged community alerts add qualitative evidence of service gaps.",
      "Coverage gap helps identify where outreach and verification may be most urgent.",
    ],
    recommendedActions: [
      "Verify the lowest-coverage sites with partners or facility focal points.",
      "Prioritise low-coverage areas that also carry active health alerts.",
      "Use the detailed annex to guide referral and outreach planning.",
    ],
    keyStats: [
      { label: "Sites flagged", value: `${rows.length}` },
      { label: "Coverage threshold", value: "< 50%" },
      { label: "Top gap site", value: rows[0]?.Site ? String(rows[0].Site) : "N/A" },
    ],
    charts: [
      {
        title: "Largest Penta3 coverage gaps",
        type: "bar",
        labels: rows.slice(0, 6).map((row) => String(row.Site)),
        series: [
          {
            label: "Coverage gap",
            color: [14, 116, 144],
            values: rows.slice(0, 6).map((row) => Number.parseFloat(String(row["Coverage Gap"]))),
          },
        ],
      },
    ],
    methodology: [
      "Primary trigger: Penta3 coverage below 50% or at least one health-tagged community alert.",
      "Dropout risk proxy is derived from the residual Penta3 coverage gap because the current dataset does not carry a direct dropout field.",
    ],
    sections: [
      {
        title: "Low-Coverage and Health Alert Areas",
        table: rows,
      },
    ],
    exportRows: rows,
  });
}

function buildSaddReport(context?: ReportDataContext): BuiltReport {
  const sites = getSites(context);
  const totalFemale = sites.reduce((sum, site) => sum + (site.arrivalsFemale ?? 0), 0);
  const totalMale = sites.reduce((sum, site) => sum + (site.arrivalsMale ?? 0), 0);
  const totalChildren = sites.reduce((sum, site) => sum + (site.arrivalsChildren ?? 0), 0);
  const totalPopulation = totalFemale + totalMale + totalChildren;
  const saddRows = [
    {
      Indicator: "Female arrivals share",
      "Current %": totalPopulation ? `${formatPercent((totalFemale / totalPopulation) * 100)}` : "0%",
      Target: "Not set",
      Status: "Live displacement split",
    },
    {
      Indicator: "Male arrivals share",
      "Current %": totalPopulation ? `${formatPercent((totalMale / totalPopulation) * 100)}` : "0%",
      Target: "Not set",
      Status: "Live displacement split",
    },
    {
      Indicator: "Children arrivals share",
      "Current %": totalPopulation ? `${formatPercent((totalChildren / totalPopulation) * 100)}` : "0%",
      Target: "Not set",
      Status: "Live displacement split",
    },
    {
      Indicator: "Minority beneficiaries",
      "Current %": "Not available",
      Target: "Required",
      Status: "Data gap",
    },
    {
      Indicator: "Children with disabilities",
      "Current %": "Not available",
      Target: "Required",
      Status: "Data gap",
    },
    {
      Indicator: "Age disaggregation",
      "Current %": "Not available",
      Target: "Required",
      Status: "Data gap",
    },
  ];

  const accountabilityRows = [
    {
      Metric: "Community alerts logged",
      Value: getAlerts(context).length + normalizeCommunityResponses(context).length,
      Note: "Useful for complaint/feedback triangulation.",
    },
    {
      Metric: "Districts represented",
      Value: new Set(getSites(context).map((site) => site.district)).size,
      Note: "Current coverage of reporting footprint.",
    },
    {
      Metric: "Reference denominator",
      Value: totalPopulation,
      Note: "Percentages shown as dashboard-share indicators.",
    },
  ];

  return withSharedMethodology({
    title: "SADD Report",
    filenameBase: "sadd-report",
    summary: [
      "This report provides the currently available displacement SADD split and flags missing accountability dimensions.",
      "Age disaggregation is explicitly marked as unavailable so the report can also be used as a documentation note on current data limitations.",
      "Use this output as an accountability annex until fuller SADD fields are captured in imports/forms.",
    ],
    overview: [
      "This snapshot presents the current sex and child displacement split available from the live site dataset.",
      "It also clearly flags the accountability dimensions that are still unavailable in current imports and form responses.",
    ],
    keyDrivers: [
      "Sex and child arrival splits are currently the most reliable live SADD-adjacent fields in the database.",
      "Minority, disability, and age-band accountability dimensions remain missing from the current pipeline.",
      "Community alerts and forms can supplement accountability monitoring but do not replace structured disaggregation fields.",
    ],
    recommendedActions: [
      "Preserve the live displacement split as an interim SADD proxy.",
      "Add age-band, disability, and minority fields to forms or imports to complete the accountability picture.",
      "Use the annex to document current data gaps in donor or coordination reporting.",
    ],
    keyStats: [
      { label: "Female arrivals", value: totalFemale.toLocaleString() },
      { label: "Male arrivals", value: totalMale.toLocaleString() },
      { label: "Children arrivals", value: totalChildren.toLocaleString() },
    ],
    charts: [
      {
        title: "Live displacement SADD split",
        type: "bar",
        labels: ["Female", "Male", "Children"],
        series: [
          {
            label: "Arrivals",
            color: [22, 163, 74],
            values: [totalFemale, totalMale, totalChildren],
          },
        ],
      },
    ],
    methodology: [
      "Current SADD output uses live arrival sex/child splits where available and explicitly marks unavailable accountability fields.",
      "Percentages represent the current displacement split rather than a full beneficiary census.",
    ],
    sections: [
      {
        title: "Inclusion Snapshot",
        table: saddRows,
      },
      {
        title: "Accountability Notes",
        table: accountabilityRows,
      },
    ],
    exportRows: saddRows,
  });
}

function buildReport(reportId: ReportId, context?: ReportDataContext): BuiltReport {
  switch (reportId) {
    case "hotspot-identification":
      return buildHotspotReport(context);
    case "early-warning-alert":
      return buildEarlyWarningReport(context);
    case "displacement-alert":
      return buildDisplacementReport(context);
    case "community-needs-summary":
      return buildCommunityNeedsReport(context);
    case "malnutrition-alert":
      return buildMalnutritionReport(context);
    case "health-service-gap":
      return buildHealthGapReport(context);
    case "sadd":
      return buildSaddReport(context);
  }
}

function addWrappedLines(doc: jsPDF, lines: string[], startY: number, width: number) {
  let y = startY;
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(`- ${line}`, width);
    doc.text(wrapped, 40, y);
    y += wrapped.length * 12 + 4;
  });
  return y;
}

function ensurePageSpace(doc: jsPDF, currentY: number, needed: number) {
  if (currentY + needed <= 780) return currentY;
  doc.addPage();
  return 44;
}

function drawSectionHeading(doc: jsPDF, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 40, y);
  return y + 14;
}

function drawKeyStats(doc: jsPDF, stats: ReportKeyStat[], startY: number, pageWidth: number) {
  if (!stats.length) return startY;
  let y = drawSectionHeading(doc, "Key figures", startY);
  const gap = 12;
  const cardWidth = (pageWidth - 80 - gap * (stats.length - 1)) / stats.length;
  const cardHeight = 62;

  stats.forEach((stat, idx) => {
    const x = 40 + idx * (cardWidth + gap);
    doc.setDrawColor(209, 213, 219);
    doc.setFillColor(245, 247, 245);
    doc.roundedRect(x, y, cardWidth, cardHeight, 8, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(stat.value, x + 10, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(stat.label, x + 10, y + 40);
    if (stat.note) {
      const note = doc.splitTextToSize(stat.note, cardWidth - 20);
      doc.setTextColor(91, 101, 94);
      doc.text(note, x + 10, y + 54);
      doc.setTextColor(0, 0, 0);
    }
  });

  return y + cardHeight + 18;
}

function drawChart(doc: jsPDF, chart: ReportChart, startY: number, pageWidth: number) {
  const chartX = 40;
  const chartY = startY;
  const chartWidth = pageWidth - 80;
  const chartHeight = 170;
  const plotX = chartX + 36;
  const plotY = chartY + 28;
  const plotWidth = chartWidth - 52;
  const plotHeight = chartHeight - 62;
  const seriesMax = Math.max(
    1,
    ...chart.series.flatMap((series) => series.values.map((value) => clampChartValue(value, 0))),
  );

  doc.setDrawColor(209, 213, 219);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(chart.title, chartX + 10, chartY + 18);

  doc.setDrawColor(229, 231, 235);
  for (let step = 0; step <= 4; step += 1) {
    const gridY = plotY + (plotHeight / 4) * step;
    doc.line(plotX, gridY, plotX + plotWidth, gridY);
  }

  const palette = chart.series;
  if (chart.type === "bar") {
    const groupWidth = plotWidth / Math.max(chart.labels.length, 1);
    const barWidth = Math.max(10, (groupWidth - 12) / Math.max(chart.series.length, 1));

    chart.labels.forEach((label, labelIdx) => {
      palette.forEach((series, seriesIdx) => {
        const value = clampChartValue(series.values[labelIdx], 0);
        const height = (value / seriesMax) * plotHeight;
        const x = plotX + labelIdx * groupWidth + 6 + seriesIdx * barWidth;
        const y = plotY + plotHeight - height;
        doc.setFillColor(...series.color);
        doc.rect(x, y, barWidth - 4, height, "F");
      });
      const wrapped = doc.splitTextToSize(label, groupWidth - 4).slice(0, 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(wrapped, plotX + labelIdx * groupWidth + groupWidth / 2, plotY + plotHeight + 12, {
        align: "center",
      });
    });
  } else {
    palette.forEach((series) => {
      doc.setDrawColor(...series.color);
      doc.setLineWidth(2);
      series.values.forEach((rawValue, idx) => {
        const value = clampChartValue(rawValue, 0);
        const x = plotX + (plotWidth / Math.max(series.values.length - 1, 1)) * idx;
        const y = plotY + plotHeight - (value / seriesMax) * plotHeight;
        if (idx > 0) {
          const prevValue = clampChartValue(series.values[idx - 1], 0);
          const prevX = plotX + (plotWidth / Math.max(series.values.length - 1, 1)) * (idx - 1);
          const prevY = plotY + plotHeight - (prevValue / seriesMax) * plotHeight;
          doc.line(prevX, prevY, x, y);
        }
        doc.setFillColor(...series.color);
        doc.circle(x, y, 2.5, "F");
      });
    });

    chart.labels.forEach((label, idx) => {
      const x = plotX + (plotWidth / Math.max(chart.labels.length - 1, 1)) * idx;
      const wrapped = doc.splitTextToSize(label, 48).slice(0, 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(wrapped, x, plotY + plotHeight + 12, { align: "center" });
    });
  }

  let legendX = chartX + 10;
  chart.series.forEach((series) => {
    doc.setFillColor(...series.color);
    doc.rect(legendX, chartY + chartHeight - 18, 10, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(series.label, legendX + 14, chartY + chartHeight - 10);
    legendX += doc.getTextWidth(series.label) + 40;
  });

  if (chart.footnote) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(91, 101, 94);
    doc.text(doc.splitTextToSize(chart.footnote, chartWidth - 20), chartX + 10, chartY + chartHeight - 28);
    doc.setTextColor(0, 0, 0);
  }

  return chartY + chartHeight + 16;
}

function buildPdfBlob(report: BuiltReport, includeNarrative: boolean, includeMethodology: boolean, includeRawData: boolean) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 44;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.title, 40, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated ${format(new Date(), "dd MMM yyyy, HH:mm")}`, 40, y);
  y += 22;

  if (report.overview?.length) {
    y = drawSectionHeading(doc, "Situation overview", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = addWrappedLines(doc, report.overview, y, pageWidth - 80);
    y += 6;
  }

  if (report.keyStats?.length) {
    y = ensurePageSpace(doc, y, 110);
    y = drawKeyStats(doc, report.keyStats.slice(0, 3), y, pageWidth);
  }

  if (includeNarrative) {
    y = ensurePageSpace(doc, y, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Key points", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = addWrappedLines(doc, report.summary, y, pageWidth - 80);
    y += 4;
  }

  if (report.keyDrivers?.length) {
    y = ensurePageSpace(doc, y, 110);
    y = drawSectionHeading(doc, "Key drivers", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = addWrappedLines(doc, report.keyDrivers, y, pageWidth - 80);
    y += 6;
  }

  if (report.charts?.length) {
    report.charts.forEach((chart) => {
      y = ensurePageSpace(doc, y, 200);
      y = drawChart(doc, chart, y, pageWidth);
    });
  }

  if (report.recommendedActions?.length) {
    y = ensurePageSpace(doc, y, 110);
    y = drawSectionHeading(doc, "Recommended actions", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = addWrappedLines(doc, report.recommendedActions, y, pageWidth - 80);
    y += 8;
  }

  if (includeMethodology && report.methodology?.length) {
    if (y > 700) {
      doc.addPage();
      y = 44;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Methodology notes", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = addWrappedLines(doc, report.methodology, y, pageWidth - 80);
    y += 8;
  }

  report.sections.forEach((section) => {
    if (y > 680) {
      doc.addPage();
      y = 44;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(section.title, 40, y);
    y += 14;

    if (section.body?.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y = addWrappedLines(doc, section.body, y, pageWidth - 80);
    }

    if (section.table?.length) {
      autoTable(doc, {
        startY: y,
        head: [Object.keys(section.table[0])],
        body: section.table.map((row) => Object.values(row)),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [27, 94, 32] },
        margin: { left: 40, right: 40 },
        theme: "grid",
      });
      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
      y += 18;
    }
  });

  if (includeRawData && report.exportRows.length) {
    doc.addPage();
    autoTable(doc, {
      startY: 44,
      head: [Object.keys(report.exportRows[0])],
      body: report.exportRows.map((row) => Object.values(row)),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [55, 71, 79] },
      margin: { left: 30, right: 30 },
      theme: "striped",
    });
  }

  return doc.output("blob");
}

function buildCsvBlob(rows: Array<Record<string, string | number>>) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

function buildXlsxBlob(rows: Array<Record<string, string | number>>, sheetName: string) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function getReportPreview(reportId: ReportId, context?: ReportDataContext) {
  return buildReport(reportId, context);
}

export function generateReportFile(options: {
  reportId: ReportId;
  format: ExportFormat;
  includeNarrative: boolean;
  includeMethodology: boolean;
  includeRawData: boolean;
  context?: ReportDataContext;
}) {
  const report = buildReport(options.reportId, options.context);
  const extension = options.format;
  const filename = `${report.filenameBase}-${slugify(format(new Date(), "yyyy-MM-dd-HHmm"))}.${extension}`;

  const blob =
    options.format === "pdf"
      ? buildPdfBlob(report, options.includeNarrative, options.includeMethodology, options.includeRawData)
      : options.format === "csv"
        ? buildCsvBlob(report.exportRows)
        : buildXlsxBlob(report.exportRows, report.title);

  const url = downloadBlob(blob, filename);

  return {
    filename,
    size: blob.size,
    url,
    report,
  };
}
