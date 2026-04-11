export type AdminAppId = "descroll" | "soullens";

export const ADMIN_APPS: Array<{ id: AdminAppId; label: string }> = [
  { id: "descroll", label: "deScroll" },
  { id: "soullens", label: "SoulLens" },
];

export const DEFAULT_ADMIN_APP_ID: AdminAppId = "descroll";

const ADMIN_APP_ALIASES: Record<string, AdminAppId> = {
  descroll: "descroll",
  descrollapp: "descroll",
  deScroll: "descroll",
  descrolldescroll: "descroll",
  comsudoajaydescroll: "descroll",
  soullens: "soullens",
  comsudoajaysoullens: "soullens",
};

export function isAdminAppId(
  value: string | null | undefined
): value is AdminAppId {
  return ADMIN_APPS.some((app) => app.id === value);
}

export function normalizeAdminAppId(
  value: string | null | undefined
): AdminAppId {
  if (isAdminAppId(value)) {
    return value;
  }

  const normalizedKey = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ADMIN_APP_ALIASES[normalizedKey] ?? DEFAULT_ADMIN_APP_ID;
}

export function getAdminAppLabel(appId: string): string {
  const normalizedAppId = normalizeAdminAppId(appId);
  return (
    ADMIN_APPS.find((app) => app.id === normalizedAppId)?.label ?? "deScroll"
  );
}

export function getAdminAppSearchParam(appId: string): string {
  return `app=${encodeURIComponent(normalizeAdminAppId(appId))}`;
}

export function getAdminAppHref(pathname: string, appId: string): string {
  return `${pathname}?${getAdminAppSearchParam(appId)}`;
}
