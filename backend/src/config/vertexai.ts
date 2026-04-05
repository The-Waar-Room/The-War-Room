import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";

let model: GenerativeModel;

export function initVertexAI(): void {
  const projectId = process.env.GCP_PROJECT_ID;
  const region = process.env.GCP_REGION ?? "asia-south1";

  if (!projectId) {
    throw new Error("GCP_PROJECT_ID not set — run loadSecrets() first");
  }

  const vertexAI = new VertexAI({ project: projectId, location: region });

  model = vertexAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
    },
  });

  console.log("[vertexai] Gemini 2.5 Flash initialized (standard mode)");
}

export function getModel(): GenerativeModel {
  if (!model) throw new Error("Vertex AI not initialized — call initVertexAI() first");
  return model;
}
