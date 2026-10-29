import { VertexAI, GenerativeModel, GenerationConfig } from "@google-cloud/vertexai";

// Not offered on pay-as-you-go in asia-south1, so the default location is global.
const MODEL_ID = "gemini-3.5-flash-lite";

let model: GenerativeModel;

export function initVertexAI(): void {
  const projectId = process.env.GCP_PROJECT_ID;
  const region = process.env.GCP_REGION ?? "global";

  if (!projectId) {
    throw new Error("GCP_PROJECT_ID not set — run loadSecrets() first");
  }

  // The SDK builds "<location>-aiplatform.googleapis.com" by default, which does not exist for global.
  const vertexAI = new VertexAI({
    project: projectId,
    location: region,
    apiEndpoint: region === "global" ? "aiplatform.googleapis.com" : undefined,
  });

  model = vertexAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      temperature: 0.7,
    },
  });

  console.log(`[vertexai] ${MODEL_ID} initialized (location: ${region})`);
}

export function getModel(): GenerativeModel {
  if (!model) throw new Error("Vertex AI not initialized — call initVertexAI() first");
  return model;
}

/**
 * Pins Gemini 3.x thinking to MINIMAL for a request. Thinking tokens are billed as
 * output and count against maxOutputTokens. This SDK version has no typed
 * thinkingConfig field, but generationConfig is sent to the API as-is.
 * Do not use thinkingBudget here: it is deprecated for Gemini 3 and can return 400.
 * A per-request generationConfig replaces the model-level one, so this must be
 * applied on every generateContent call.
 */
export function withMinimalThinking(config: GenerationConfig): GenerationConfig {
  return { ...config, thinkingConfig: { thinkingLevel: "MINIMAL" } } as GenerationConfig;
}
