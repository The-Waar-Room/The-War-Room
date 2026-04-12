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
  health: IntegrationHealth;
}

export interface IntegrationHealthCheck {
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

export interface IntegrationHealthValue {
  label: string;
  value: string | null;
}

export interface IntegrationHealth {
  state: "ok" | "action-required";
  summary: string;
  checks: IntegrationHealthCheck[];
  detectedValues: IntegrationHealthValue[];
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

type AnalyticsAdminAccountSummariesResponse = {
  accountSummaries?: Array<{
    propertySummaries?: Array<{
      property?: string;
    }>;
  }>;
  nextPageToken?: string;
};

type AnalyticsAdminDataStreamsResponse = {
  dataStreams?: Array<{
    type?: string;
    androidAppStreamData?: {
      packageName?: string;
    };
  }>;
  nextPageToken?: string;
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

const BIGQUERY_DATA_PROJECT_ID =
  process.env.CRASHLYTICS_BIGQUERY_PROJECT_ID ??
  process.env.FIREBASE_PROJECT_ID ??
  process.env.GOOGLE_CLOUD_PROJECT;

const BIGQUERY_QUERY_PROJECT_ID =
  process.env.CRASHLYTICS_BIGQUERY_QUERY_PROJECT_ID ??
  process.env.BIGQUERY_QUERY_PROJECT_ID ??
  process.env.GCP_PROJECT_ID ??
  BIGQUERY_DATA_PROJECT_ID;

const CRASHLYTICS_DATASET =
  process.env.CRASHLYTICS_BIGQUERY_DATASET ?? "firebase_crashlytics";

const SESSIONS_DATASET =
  process.env.CRASHLYTICS_SESSIONS_BIGQUERY_DATASET ?? "firebase_sessions";

const discoveredAnalyticsProperties = new Map<AdminAppId, string | null>();

type AnalyticsPropertyResolution = {
  propertyId: string | null;
  source: "env" | "auto" | "missing";
  errorMessage?: string;
};

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

function buildHealth(
  state: IntegrationHealth["state"],
  summary: string,
  checks: IntegrationHealthCheck[],
  detectedValues: IntegrationHealthValue[]
): IntegrationHealth {
  return {
    state,
    summary,
    checks,
    detectedValues,
  };
}

function parseGoogleApiError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);

  try {
    const parsed = JSON.parse(rawMessage) as {
      error?: { code?: number; message?: string; status?: string };
    };

    return {
      message: parsed.error?.message ?? rawMessage,
      status: parsed.error?.status ?? null,
      code: parsed.error?.code ?? null,
    };
  } catch {
    return {
      message: rawMessage,
      status: null,
      code: null,
    };
  }
}

function buildBigQueryAccessMessage(appLabel: string, reason: string) {
  if (
    reason.includes("bigquery.jobs.create") ||
    reason.includes("Access Denied")
  ) {
    const queryProject = BIGQUERY_QUERY_PROJECT_ID ?? "your query project";
    const dataProject = BIGQUERY_DATA_PROJECT_ID ?? "your Firebase project";

    return `Unable to load Crashlytics export data for ${appLabel}. Grant BigQuery Job User on ${queryProject} to the admin-panel service account, or set CRASHLYTICS_BIGQUERY_QUERY_PROJECT_ID to a project where it can create query jobs. It also needs dataset read access on ${dataProject}.`;
  }

  return `Unable to load Crashlytics export data for ${appLabel}. Enable BigQuery export for Crashlytics and Firebase Sessions, then verify dataset access. ${reason}`;
}

async function discoverAnalyticsPropertyId(appId: AdminAppId) {
  if (discoveredAnalyticsProperties.has(appId)) {
    return discoveredAnalyticsProperties.get(appId) ?? null;
  }

  const appConfig = APP_CONFIG[appId];
  let pageToken: string | undefined;

  try {
    do {
      const params = new URLSearchParams({ pageSize: "200" });
      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const summaries =
        await googleJsonFetch<AnalyticsAdminAccountSummariesResponse>(
          `https://analyticsadmin.googleapis.com/v1beta/accountSummaries?${params.toString()}`,
          { method: "GET" },
          ["https://www.googleapis.com/auth/analytics.readonly"]
        );

      for (const accountSummary of summaries.accountSummaries ?? []) {
        for (const propertySummary of accountSummary.propertySummaries ?? []) {
          const property = propertySummary.property;
          if (!property) {
            continue;
          }

          const streams =
            await googleJsonFetch<AnalyticsAdminDataStreamsResponse>(
              `https://analyticsadmin.googleapis.com/v1beta/${property}/dataStreams?pageSize=200`,
              { method: "GET" },
              ["https://www.googleapis.com/auth/analytics.readonly"]
            );

          const hasMatchingAndroidStream = (streams.dataStreams ?? []).some(
            (stream) =>
              stream.type === "ANDROID_APP_STREAM" &&
              stream.androidAppStreamData?.packageName === appConfig.packageName
          );

          if (hasMatchingAndroidStream) {
            const propertyId = property.split("/")[1] ?? null;
            discoveredAnalyticsProperties.set(appId, propertyId);
            return propertyId;
          }
        }
      }

      pageToken = summaries.nextPageToken;
    } while (pageToken);
  } catch (error) {
    discoveredAnalyticsProperties.set(appId, null);
    const { message } = parseGoogleApiError(error);
    return { propertyId: null, errorMessage: message };
  }

  discoveredAnalyticsProperties.set(appId, null);
  return { propertyId: null };
}

async function resolveAnalyticsPropertyId(
  appId: AdminAppId
): Promise<AnalyticsPropertyResolution> {
  const configuredPropertyId = APP_CONFIG[appId].analyticsPropertyId;

  if (configuredPropertyId) {
    return {
      propertyId: configuredPropertyId,
      source: "env",
    };
  }

  const discovered = await discoverAnalyticsPropertyId(appId);
  if (typeof discovered === "string") {
    return {
      propertyId: discovered,
      source: "auto",
    };
  }

  if (discovered?.propertyId) {
    return {
      propertyId: discovered.propertyId,
      source: "auto",
    };
  }

  return {
    propertyId: null,
    source: "missing",
    errorMessage: discovered?.errorMessage,
  };
}

function buildEmptyOverview(
  appId: AdminAppId,
  source: string,
  message: string,
  summary: IntegrationMetric[],
  highlights: string[],
  health: IntegrationHealth
): InsightOverviewResponse {
  return {
    appId,
    configured: false,
    source,
    message,
    summary,
    highlights,
    health,
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

  const propertyResolution = await resolveAnalyticsPropertyId(appId);
  const analyticsPropertyId = propertyResolution.propertyId;

  const analyticsDetectedValues: IntegrationHealthValue[] = [
    { label: "Firebase project", value: GOOGLE_CREDENTIALS.projectId ?? null },
    { label: "Android package", value: appConfig.packageName },
    {
      label: "Configured GA4 property",
      value: appConfig.analyticsPropertyId ?? null,
    },
    {
      label: "Resolved GA4 property",
      value: analyticsPropertyId,
    },
  ];

  if (!analyticsPropertyId) {
    const analyticsHealth = buildHealth(
      "action-required",
      propertyResolution.errorMessage
        ? "Analytics property lookup failed before a usable GA4 property could be resolved."
        : "Analytics is waiting on a GA4 property ID or Analytics Admin API discovery access.",
      [
        {
          label: "GA4 property ID",
          status: "error",
          detail:
            "Set GA4_PROPERTY_ID_DESCROLL or GA4_PROPERTY_ID_SOULLENS, or allow the admin-panel credentials to read Analytics Admin account summaries and data streams.",
        },
        {
          label: "Analytics Admin API access",
          status: propertyResolution.errorMessage ? "error" : "warning",
          detail:
            propertyResolution.errorMessage ??
            "Auto-discovery was attempted but no linked Android app stream property was found yet.",
        },
      ],
      analyticsDetectedValues
    );

    return buildEmptyOverview(
      appId,
      "Firebase Analytics / GA4",
      `Unable to find a linked GA4 property for ${appConfig.label}. Set GA4_PROPERTY_ID_${appId === "deScroll" ? "DESCROLL" : "SOULLENS"}, or grant Analytics Admin API access so the property can be auto-discovered from the Android app stream.`,
      defaultAnalyticsSummary(),
      defaultHighlights,
      analyticsHealth
    );
  }

  try {
    const property = `properties/${analyticsPropertyId}`;
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
                { name: "engagedSessions" },
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
    const engagedSessions = parseMetricValue(reports[0], 3);
    const topVersion = parseFirstRow(reports[1]);
    const topEvent = parseFirstRow(reports[2]);
    const topCountry = parseFirstRow(reports[3]);
    const topDevice = parseFirstRow(reports[4]);
    const realtimeUsers = Number(
      realtimeResponse.rows?.[0]?.metricValues?.[0]?.value ?? 0
    );

    const averageEngagementSeconds =
      activeUsers > 0 ? engagementSeconds / activeUsers : 0;
    const engagedSessionsPerActiveUser =
      activeUsers > 0 ? engagedSessions / activeUsers : 0;

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
      health: buildHealth(
        "ok",
        propertyResolution.source === "env"
          ? "Analytics is using the configured GA4 property ID."
          : "Analytics is using an auto-discovered GA4 property from the Android app stream.",
        [
          {
            label: "GA4 property resolution",
            status: "ok",
            detail:
              propertyResolution.source === "env"
                ? "Resolved from environment variable."
                : "Resolved automatically from the Analytics Admin API.",
          },
          {
            label: "Analytics Data API access",
            status: "ok",
            detail: "The admin-panel credentials can read GA4 reporting data.",
          },
        ],
        analyticsDetectedValues
      ),
    };
  } catch (error) {
    const { message } = parseGoogleApiError(error);

    const analyticsHealth = buildHealth(
      "action-required",
      "Analytics credentials reached GA4 property resolution, but reporting access is still blocked.",
      [
        {
          label: "GA4 property resolution",
          status: "ok",
          detail: `Resolved property ${analyticsPropertyId}.`,
        },
        {
          label: "Analytics Data API access",
          status: "error",
          detail: message,
        },
      ],
      analyticsDetectedValues
    );

    return buildEmptyOverview(
      appId,
      "Firebase Analytics / GA4",
      `Unable to load GA4 metrics for ${appConfig.label}. Check Analytics Data API access, property permissions, and env vars. ${message}`,
      defaultAnalyticsSummary(),
      defaultHighlights,
      analyticsHealth
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

  const crashlyticsDetectedValues: IntegrationHealthValue[] = [
    { label: "Firebase project", value: BIGQUERY_DATA_PROJECT_ID ?? null },
    { label: "Query project", value: BIGQUERY_QUERY_PROJECT_ID ?? null },
    { label: "Crashlytics dataset", value: CRASHLYTICS_DATASET },
    { label: "Sessions dataset", value: SESSIONS_DATASET },
    { label: "Android package", value: appConfig.packageName },
  ];

  if (!BIGQUERY_DATA_PROJECT_ID) {
    const crashlyticsHealth = buildHealth(
      "action-required",
      "Crashlytics export queries are blocked because the Firebase project is not configured for the admin panel.",
      [
        {
          label: "Firebase project env",
          status: "error",
          detail:
            "Set CRASHLYTICS_BIGQUERY_PROJECT_ID or FIREBASE_PROJECT_ID so the export tables can be located.",
        },
      ],
      crashlyticsDetectedValues
    );

    return buildEmptyOverview(
      appId,
      "Firebase Crashlytics via BigQuery",
      `Set CRASHLYTICS_BIGQUERY_PROJECT_ID or FIREBASE_PROJECT_ID in the admin panel environment to query Crashlytics exports for ${appConfig.label}.`,
      defaultCrashlyticsSummary(),
      defaultHighlights,
      crashlyticsHealth
    );
  }

  const bigQueryQueryProjectId =
    BIGQUERY_QUERY_PROJECT_ID ?? BIGQUERY_DATA_PROJECT_ID;

  const crashTable = `\`${BIGQUERY_DATA_PROJECT_ID}.${CRASHLYTICS_DATASET}.${sanitizeBigQueryIdentifier(appConfig.packageName)}_ANDROID\``;
  const sessionsTable = `\`${BIGQUERY_DATA_PROJECT_ID}.${SESSIONS_DATASET}.${sanitizeBigQueryIdentifier(appConfig.packageName)}_ANDROID\``;

  try {
    const [
      crashSummaryRows,
      topVersionRows,
      topDeviceRows,
      topIssueRows,
      cfuRows,
    ] = await Promise.all([
      queryBigQuery(
        bigQueryQueryProjectId,
        `
            SELECT
              COUNT(DISTINCT IF(error_type = 'FATAL', event_id, NULL)) AS fatal_crashes,
              COUNT(DISTINCT IF(error_type != 'FATAL', issue_id, NULL)) AS non_fatal_issues
            FROM ${crashTable}
            WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
          `
      ),
      queryBigQuery(
        bigQueryQueryProjectId,
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
        bigQueryQueryProjectId,
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
        bigQueryQueryProjectId,
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
        bigQueryQueryProjectId,
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
      health: buildHealth(
        "ok",
        "Crashlytics export tables and BigQuery query execution are both accessible.",
        [
          {
            label: "BigQuery query jobs",
            status: "ok",
            detail: `Query jobs are running in ${bigQueryQueryProjectId}.`,
          },
          {
            label: "Crashlytics export datasets",
            status: "ok",
            detail: `Reading ${CRASHLYTICS_DATASET} and ${SESSIONS_DATASET} in ${BIGQUERY_DATA_PROJECT_ID}.`,
          },
        ],
        crashlyticsDetectedValues
      ),
    };
  } catch (error) {
    const { message } = parseGoogleApiError(error);

    const crashlyticsHealth = buildHealth(
      "action-required",
      message.includes("bigquery.jobs.create")
        ? "Crashlytics data export tables may exist, but the credentials cannot create BigQuery query jobs in the selected query project."
        : "Crashlytics access is partially configured, but one of the required BigQuery permissions or datasets is still missing.",
      [
        {
          label: "BigQuery query jobs",
          status: message.includes("bigquery.jobs.create")
            ? "error"
            : "warning",
          detail: message.includes("bigquery.jobs.create")
            ? `Grant BigQuery Job User on ${bigQueryQueryProjectId}, or point CRASHLYTICS_BIGQUERY_QUERY_PROJECT_ID at a project where this service account can create jobs.`
            : message,
        },
        {
          label: "Crashlytics export datasets",
          status: message.includes("bigquery.jobs.create")
            ? "warning"
            : "error",
          detail: `Expected datasets: ${CRASHLYTICS_DATASET} and ${SESSIONS_DATASET} in ${BIGQUERY_DATA_PROJECT_ID}.`,
        },
      ],
      crashlyticsDetectedValues
    );

    return buildEmptyOverview(
      appId,
      "Firebase Crashlytics via BigQuery",
      buildBigQueryAccessMessage(appConfig.label, message),
      defaultCrashlyticsSummary(),
      defaultHighlights,
      crashlyticsHealth
    );
  }
}

export function getAppInsightsLabel(appId: AdminAppId) {
  return getAdminAppLabel(appId);
}
