import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const REQUIRED_SECRETS = ["UPSTASH_REDIS_URL", "UPSTASH_REDIS_TOKEN", "JWT_SECRET"] as const;

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

  const missing = REQUIRED_SECRETS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  console.log(`[secrets] All secrets loaded (project: ${projectId})`);
}
