export type AdminAppId = "descroll" | "soullens";

export const ADMIN_APPS: Array<{ id: AdminAppId; label: string }> = [
  { id: "descroll", label: "deScroll" },
  { id: "soullens", label: "SoulLens" },
];

export const DEFAULT_ADMIN_APP_ID: AdminAppId = "descroll";

export function isAdminAppId(
  value: string | null | undefined
): value is AdminAppId {
  return ADMIN_APPS.some((app) => app.id === value);
}

export function normalizeAdminAppId(
  value: string | null | undefined
): AdminAppId {
  return isAdminAppId(value) ? value : DEFAULT_ADMIN_APP_ID;
}

export function getAdminAppLabel(appId: string): string {
  return ADMIN_APPS.find((app) => app.id === appId)?.label ?? "deScroll";
}

export function getAdminAppSearchParam(appId: string): string {
  return `app=${encodeURIComponent(normalizeAdminAppId(appId))}`;
}

export function getAdminAppHref(pathname: string, appId: string): string {
  return `${pathname}?${getAdminAppSearchParam(appId)}`;
}
