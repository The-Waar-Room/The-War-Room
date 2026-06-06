import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const REQUIRED_SECRETS = ["JWT_SECRET"] as const;
const OPTIONAL_SECRETS = ["UPSTASH_REDIS_URL", "UPSTASH_REDIS_TOKEN"] as const;

export async function loadSecrets(): Promise<void> {
  const client = new SecretManagerServiceClient();
  const projectId = await client.getProjectId();

  if (!projectId) {
    throw new Error("Cannot determine GCP project ID from credentials");
  }

  process.env.GCP_PROJECT_ID = projectId;

  for (const secretName of REQUIRED_SECRETS) {
    if (process.env[secretName]) continue;

    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const value = version.payload?.data?.toString();

    if (!value) {
      throw new Error(`Secret ${secretName} is empty or missing`);
    }

    process.env[secretName] = value;
  }

  for (const secretName of OPTIONAL_SECRETS) {
    if (process.env[secretName]) continue;
    try {
      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name });
      const value = version.payload?.data?.toString();
      if (value) process.env[secretName] = value;
    } catch (error) {
      console.warn(`[secrets] Optional secret ${secretName} unavailable:`, error);
    }
  }

  const missing = REQUIRED_SECRETS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  console.log(`[secrets] All secrets loaded (project: ${projectId})`);
}
