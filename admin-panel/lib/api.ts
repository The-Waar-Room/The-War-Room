const BASE_URL = process.env.BACKEND_BASE_URL;

async function callBackend<T>(
  path: string,
  init: RequestInit,
  adminToken: string
): Promise<T> {
  if (!BASE_URL) {
    throw new Error("BACKEND_BASE_URL is not configured");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function setGlobalKillSwitch(
  enabled: boolean,
  adminToken: string
) {
  return callBackend(
    "/api/admin/kill-switch",
    {
      method: "POST",
      body: JSON.stringify({ enabled }),
    },
    adminToken
  );
}

export async function banUser(uid: string, appId: string, adminToken: string) {
  return callBackend(
    "/api/admin/ban-user",
    {
      method: "POST",
      body: JSON.stringify({ uid, appId }),
    },
    adminToken
  );
}
