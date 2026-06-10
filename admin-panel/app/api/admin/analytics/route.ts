import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeAdminAppId } from "@/lib/admin-apps";
import { getAnalyticsOverview } from "@/lib/google-insights";

function parseRangeDays(value: string | null) {
  const numeric = Number(value);
  return numeric === 7 || numeric === 28 || numeric === 90 ? numeric : 28;
}

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildCsv(overview: Awaited<ReturnType<typeof getAnalyticsOverview>>) {
  const lines: string[] = [];

  lines.push(["App", "Range", "Source", "Message"].map(escapeCsv).join(","));
  lines.push(
    [
      overview.appId,
      `${overview.rangeDays} days`,
      overview.source,
      overview.message,
    ]
      .map(escapeCsv)
      .join(",")
  );
  lines.push("");

  lines.push(["Summary Label", "Value", "Note"].join(","));
  for (const item of overview.summary) {
    lines.push(
      [item.label, item.value ?? "", item.note].map(escapeCsv).join(",")
    );
  }

  const sections: Array<{
    title: string;
    rows: Array<{ label: string; value: string | number; note?: string }>;
  }> = [
    {
      title: "Retention",
      rows: overview.details?.retention ?? [],
    },
    {
      title: "Traffic Sources",
      rows: overview.details?.trafficSources ?? [],
    },
    {
      title: "Top Events",
      rows: overview.details?.topEvents ?? [],
    },
    {
      title: "Top Countries",
      rows: overview.details?.topCountries ?? [],
    },
    {
      title: "Top Devices",
      rows: overview.details?.topDevices ?? [],
    },
    {
      title: "Top Versions",
      rows: overview.details?.topVersions ?? [],
    },
    {
      title: "Trend",
      rows: overview.details?.trend ?? [],
    },
  ];

  for (const section of sections) {
    if (!section.rows.length) {
      continue;
    }

    lines.push("");
    lines.push(escapeCsv(section.title));
    lines.push(["Label", "Value", "Note"].join(","));
    for (const row of section.rows) {
      lines.push(
        [row.label, row.value, row.note ?? ""].map(escapeCsv).join(",")
      );
    }
  }

  return lines.join("\n");
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const appId = normalizeAdminAppId(searchParams.get("app"));
  const rangeDays = parseRangeDays(searchParams.get("days"));
  const format = searchParams.get("format");

  const overview = await getAnalyticsOverview(appId, rangeDays);

  if (format === "csv") {
    const csv = buildCsv(overview);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"analytics-${appId}-${rangeDays}d.csv\"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(overview);
}
