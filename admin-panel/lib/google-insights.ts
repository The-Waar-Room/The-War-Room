import { GoogleAuth } from "google-auth-library";
import { type AdminAppId, getAdminAppLabel } from "@/lib/admin-apps";

export interface IntegrationMetric {
  label: string;
  note: string;
  value: string | null;
}

export interface InsightOverviewResponse {
  appId: string;
  configured: boolean;
  source: string;
  message: string;
  summary: IntegrationMetric[];
  highlights: string[];
}

type AppConfig = {
  label: string;
  packageName: string;
  analyticsPropertyId?: string;
};

type AnalyticsBatchResponse = {
  reports?: AnalyticsReport[];
  error?: { message?: string };
};

type AnalyticsReport = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
  totals?: Array<{
    metricValues?: Array<{ value?: string }>;
  }>;
};

type BigQueryResponse = {
  schema?: { fields?: Array<{ name: string }> };
  rows?: Array<{ f: Array<{ v: string | null }> }>;
  errors?: Array<{ message?: string }>;
  error?: { message?: string };
  jobComplete?: boolean;
};

const GOOGLE_CREDENTIALS = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const APP_CONFIG: Record<AdminAppId, AppConfig> = {
  deScroll: {
    label: "deScroll",
    packageName: "com.sudoajay.descroll",
    analyticsPropertyId:
      process.env.GA4_PROPERTY_ID_DESCROLL ??
      process.env.GOOGLE_ANALYTICS_PROPERTY_ID_DESCROLL,
  },
  soullens: {
    label: "SoulLens",
    packageName: "com.sudoajay.soullens",
    analyticsPropertyId:
      process.env.GA4_PROPERTY_ID_SOULLENS ??
      process.env.GOOGLE_ANALYTICS_PROPERTY_ID_SOULLENS,
  },
};

const BIGQUERY_PROJECT_ID =
  process.env.CRASHLYTICS_BIGQUERY_PROJECT_ID ??
  process.env.FIREBASE_PROJECT_ID ??
  process.env.GOOGLE_CLOUD_PROJECT;

const CRASHLYTICS_DATASET =
  process.env.CRASHLYTICS_BIGQUERY_DATASET ?? "firebase_crashlytics";

const SESSIONS_DATASET =
  process.env.CRASHLYTICS_SESSIONS_BIGQUERY_DATASET ?? "firebase_sessions";

function getGoogleAuth(scopes: string[]) {
  const { projectId, clientEmail, privateKey } = GOOGLE_CREDENTIALS;

  if (projectId && clientEmail && privateKey) {
    return new GoogleAuth({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes,
    });
  }

  return new GoogleAuth({ scopes });
}

async function getAccessToken(scopes: string[]) {
  const auth = getGoogleAuth(scopes);
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (!token?.token) {
    throw new Error("Unable to obtain Google API access token");
  }

  return token.token;
}

async function googleJsonFetch<T>(
  url: string,
  init: RequestInit,
  scopes: string[]
): Promise<T> {
  const accessToken = await getAccessToken(scopes);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Google API request failed with ${response.status}`
    );
  }

  return (await response.json()) as T;
}

function buildEmptyOverview(
  appId: AdminAppId,
  source: string,
  message: string,
  summary: IntegrationMetric[],
  highlights: string[]
): InsightOverviewResponse {
  return {
    appId,
    configured: false,
    source,
    message,
    summary,
    highlights,
  };
}

function defaultAnalyticsSummary(): IntegrationMetric[] {
  return [
    {
      label: "Active users",
      value: null,
      note: "Daily and 28-day active audience trend",
    },
    {
      label: "Realtime users",
      value: null,
      note: "Active users in the last 30 minutes",
    },
    {
      label: "Engagement time",
      value: null,
      note: "Average engagement time per active user",
    },
    {
      label: "Top version",
      value: null,
      note: "Most active app version in the selected range",
    },
  ];
}

function defaultCrashlyticsSummary(): IntegrationMetric[] {
  return [
    {
      label: "Crash-free users",
      value: null,
      note: "Percentage of users without a fatal crash in range",
    },
    {
      label: "Fatal crashes",
      value: null,
      note: "Critical crash count in the selected range",
    },
    {
      label: "Non-fatal issues",
      value: null,
      note: "Distinct non-fatal and ANR issues in range",
    },
    {
      label: "Top affected version",
      value: null,
      note: "Version with the most reported crash events",
    },
  ];
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

function formatWholeNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0m";
  }

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m`;
}

function sanitizeBigQueryIdentifier(value: string) {
  return value.replace(/[^A-Za-z0-9_]/g, "_");
}

function parseMetricValue(report: AnalyticsReport | undefined, index: number) {
  return Number(report?.totals?.[0]?.metricValues?.[index]?.value ?? 0);
}

function parseFirstRow(report: AnalyticsReport | undefined) {
  const row = report?.rows?.[0];
  return {
    dimension: row?.dimensionValues?.[0]?.value ?? null,
    metric: Number(row?.metricValues?.[0]?.value ?? 0),
  };
}

function mapBigQueryRows(response: BigQueryResponse) {
  const fields = response.schema?.fields ?? [];
  const rows = response.rows ?? [];

  return rows.map((row) =>
    fields.reduce<Record<string, string | null>>(
      (accumulator, field, index) => {
        accumulator[field.name] = row.f[index]?.v ?? null;
        return accumulator;
      },
      {}
    )
  );
}

async function queryBigQuery(projectId: string, query: string) {
  const response = await googleJsonFetch<BigQueryResponse>(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: "POST",
      body: JSON.stringify({
        query,
        useLegacySql: false,
        timeoutMs: 20000,
      }),
    },
    ["https://www.googleapis.com/auth/bigquery.readonly"]
  );

  if (!response.jobComplete) {
    throw new Error("BigQuery request timed out before completion");
  }

  if (response.error?.message || response.errors?.[0]?.message) {
    throw new Error(response.error?.message || response.errors?.[0]?.message);
  }

  return mapBigQueryRows(response);
}

export async function getAnalyticsOverview(
  appId: AdminAppId
): Promise<InsightOverviewResponse> {
  const appConfig = APP_CONFIG[appId];
  const defaultHighlights = [
    "Active users over time",
    "User retention",
    "Top events by count",
    "Active users by country",
    "Active users by device model",
    "App versions",
  ];

  if (!appConfig.analyticsPropertyId) {
    return buildEmptyOverview(
      appId,
      "Firebase Analytics / GA4",
      `Set GA4_PROPERTY_ID_${appId === "deScroll" ? "DESCROLL" : "SOULLENS"} in the admin panel environment to load ${appConfig.label} analytics data.`,
      defaultAnalyticsSummary(),
      defaultHighlights
    );
  }

  try {
    const property = `properties/${appConfig.analyticsPropertyId}`;
    const batchResponse = await googleJsonFetch<AnalyticsBatchResponse>(
      `https://analyticsdata.googleapis.com/v1beta/${property}:batchRunReports`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
              metrics: [
                { name: "activeUsers" },
                { name: "totalUsers" },
                { name: "userEngagementDuration" },
                { name: "engagedSessionsPerActiveUser" },
              ],
            },
            {
              dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
              dimensions: [{ name: "appVersion" }],
              metrics: [{ name: "activeUsers" }],
              orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
              limit: "1",
            },
            {
              dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
              dimensions: [{ name: "eventName" }],
              metrics: [{ name: "eventCount" }],
              orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
              limit: "1",
            },
            {
              dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
              dimensions: [{ name: "country" }],
              metrics: [{ name: "activeUsers" }],
              orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
              limit: "1",
            },
            {
              dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
              dimensions: [{ name: "deviceModel" }],
              metrics: [{ name: "activeUsers" }],
              orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
              limit: "1",
            },
          ],
        }),
      },
      ["https://www.googleapis.com/auth/analytics.readonly"]
    );

    const realtimeResponse = await googleJsonFetch<AnalyticsReport>(
      `https://analyticsdata.googleapis.com/v1beta/${property}:runRealtimeReport`,
      {
        method: "POST",
        body: JSON.stringify({
          metrics: [{ name: "activeUsers" }],
        }),
      },
      ["https://www.googleapis.com/auth/analytics.readonly"]
    );

    const reports = batchResponse.reports ?? [];
    const activeUsers = parseMetricValue(reports[0], 0);
    const totalUsers = parseMetricValue(reports[0], 1);
    const engagementSeconds = parseMetricValue(reports[0], 2);
    const engagedSessionsPerActiveUser = parseMetricValue(reports[0], 3);
    const topVersion = parseFirstRow(reports[1]);
    const topEvent = parseFirstRow(reports[2]);
    const topCountry = parseFirstRow(reports[3]);
    const topDevice = parseFirstRow(reports[4]);
    const realtimeUsers = Number(
      realtimeResponse.rows?.[0]?.metricValues?.[0]?.value ?? 0
    );

    const averageEngagementSeconds =
      activeUsers > 0 ? engagementSeconds / activeUsers : 0;

    return {
      appId,
      configured: true,
      source: "Firebase Analytics / GA4",
      message: `Showing live GA4 metrics for ${appConfig.label} from the last 28 days.`,
      summary: [
        {
          label: "Active users",
          value: formatWholeNumber(activeUsers || totalUsers),
          note: "Users active in the selected 28-day range",
        },
        {
          label: "Realtime users",
          value: formatWholeNumber(realtimeUsers),
          note: "Active users in the last 30 minutes",
        },
        {
          label: "Engagement time",
          value: formatDuration(averageEngagementSeconds),
          note: `Engaged sessions/user: ${engagedSessionsPerActiveUser.toFixed(2)}`,
        },
        {
          label: "Top version",
          value: topVersion.dimension ?? "Unknown",
          note: `${formatCompactNumber(topVersion.metric)} active users`,
        },
      ],
      highlights: [
        topEvent.dimension
          ? `Top event: ${topEvent.dimension} (${formatCompactNumber(topEvent.metric)})`
          : "Top events by count",
        topCountry.dimension
          ? `Top country: ${topCountry.dimension}`
          : "Active users by country",
        topDevice.dimension
          ? `Top device: ${topDevice.dimension}`
          : "Active users by device model",
        `Realtime users: ${formatWholeNumber(realtimeUsers)}`,
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown analytics error";

    return buildEmptyOverview(
      appId,
      "Firebase Analytics / GA4",
      `Unable to load GA4 metrics for ${appConfig.label}. Check Analytics Data API access, property permissions, and env vars. ${message}`,
      defaultAnalyticsSummary(),
      defaultHighlights
    );
  }
}

export async function getCrashlyticsOverview(
  appId: AdminAppId
): Promise<InsightOverviewResponse> {
  const appConfig = APP_CONFIG[appId];
  const defaultHighlights = [
    "Crash-free users",
    "Crash-free sessions",
    "Fatal vs non-fatal",
    "Issues by app version",
    "Issues by device model",
    "New and regressed issues",
  ];

  if (!BIGQUERY_PROJECT_ID) {
    return buildEmptyOverview(
      appId,
      "Firebase Crashlytics via BigQuery",
      `Set CRASHLYTICS_BIGQUERY_PROJECT_ID or FIREBASE_PROJECT_ID in the admin panel environment to query Crashlytics exports for ${appConfig.label}.`,
      defaultCrashlyticsSummary(),
      defaultHighlights
    );
  }

  const crashTable = `\`${BIGQUERY_PROJECT_ID}.${CRASHLYTICS_DATASET}.${sanitizeBigQueryIdentifier(appConfig.packageName)}_ANDROID\``;
  const sessionsTable = `\`${BIGQUERY_PROJECT_ID}.${SESSIONS_DATASET}.${sanitizeBigQueryIdentifier(appConfig.packageName)}_ANDROID\``;

  try {
    const [
      crashSummaryRows,
      topVersionRows,
      topDeviceRows,
      topIssueRows,
      cfuRows,
    ] = await Promise.all([
      queryBigQuery(
        BIGQUERY_PROJECT_ID,
        `
            SELECT
              COUNT(DISTINCT IF(error_type = 'FATAL', event_id, NULL)) AS fatal_crashes,
              COUNT(DISTINCT IF(error_type != 'FATAL', issue_id, NULL)) AS non_fatal_issues
            FROM ${crashTable}
            WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
          `
      ),
      queryBigQuery(
        BIGQUERY_PROJECT_ID,
        `
            SELECT application.display_version AS version, COUNT(DISTINCT event_id) AS crash_events
            FROM ${crashTable}
            WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
            GROUP BY version
            ORDER BY crash_events DESC
            LIMIT 1
          `
      ),
      queryBigQuery(
        BIGQUERY_PROJECT_ID,
        `
            SELECT device.model AS device_model, COUNT(DISTINCT event_id) AS crash_events
            FROM ${crashTable}
            WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
            GROUP BY device_model
            ORDER BY crash_events DESC
            LIMIT 1
          `
      ),
      queryBigQuery(
        BIGQUERY_PROJECT_ID,
        `
            SELECT issue_id, COUNT(DISTINCT event_id) AS crash_events
            FROM ${crashTable}
            WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
            GROUP BY issue_id
            ORDER BY crash_events DESC
            LIMIT 1
          `
      ),
      queryBigQuery(
        BIGQUERY_PROJECT_ID,
        `
            WITH sessions AS (
              SELECT DISTINCT instance_id
              FROM ${sessionsTable}
              WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
            ),
            fatals AS (
              SELECT DISTINCT installation_uuid
              FROM ${crashTable}
              WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
                AND error_type = 'FATAL'
            )
            SELECT SAFE_MULTIPLY(
              100,
              1 - SAFE_DIVIDE((SELECT COUNT(*) FROM fatals), (SELECT COUNT(*) FROM sessions))
            ) AS crash_free_users_pct
          `
      ),
    ]);

    const crashSummary = crashSummaryRows[0] ?? {};
    const topVersion = topVersionRows[0] ?? {};
    const topDevice = topDeviceRows[0] ?? {};
    const topIssue = topIssueRows[0] ?? {};
    const crashFreeUsersPct = Number(cfuRows[0]?.crash_free_users_pct ?? 0);
    const fatalCrashes = Number(crashSummary.fatal_crashes ?? 0);
    const nonFatalIssues = Number(crashSummary.non_fatal_issues ?? 0);
    const topVersionName = topVersion.version ?? "Unknown";
    const topVersionCrashes = Number(topVersion.crash_events ?? 0);
    const topDeviceName = topDevice.device_model ?? "Unknown";
    const topIssueId = topIssue.issue_id ?? null;

    return {
      appId,
      configured: true,
      source: "Firebase Crashlytics via BigQuery",
      message: `Showing Crashlytics export data for ${appConfig.label} from the last 28 days.`,
      summary: [
        {
          label: "Crash-free users",
          value: formatPercent(crashFreeUsersPct),
          note: "Computed from Crashlytics and Firebase Sessions exports",
        },
        {
          label: "Fatal crashes",
          value: formatWholeNumber(fatalCrashes),
          note: "Distinct fatal crash events in range",
        },
        {
          label: "Non-fatal issues",
          value: formatWholeNumber(nonFatalIssues),
          note: "Distinct non-fatal and ANR issue IDs in range",
        },
        {
          label: "Top affected version",
          value: topVersionName,
          note: `${formatCompactNumber(topVersionCrashes)} crash events`,
        },
      ],
      highlights: [
        topDeviceName !== "Unknown"
          ? `Top crash device: ${topDeviceName}`
          : "Issues by device model",
        topIssueId ? `Top issue: ${topIssueId}` : "New and regressed issues",
        `Fatal crashes: ${formatWholeNumber(fatalCrashes)}`,
        `Non-fatal issues: ${formatWholeNumber(nonFatalIssues)}`,
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Crashlytics error";

    return buildEmptyOverview(
      appId,
      "Firebase Crashlytics via BigQuery",
      `Unable to load Crashlytics export data for ${appConfig.label}. Enable BigQuery export for Crashlytics and Firebase Sessions, then verify dataset access. ${message}`,
      defaultCrashlyticsSummary(),
      defaultHighlights
    );
  }
}

export function getAppInsightsLabel(appId: AdminAppId) {
  return getAdminAppLabel(appId);
}
