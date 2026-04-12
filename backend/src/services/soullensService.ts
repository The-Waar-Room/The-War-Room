import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestore } from "../config/firebase";
import { getModel } from "../config/vertexai";

export type SoulLensReligion = "hinduism";

export type SoulLensEmotion = "anxious" | "lost" | "angry" | "motivated" | "grateful" | "grieving";

export interface SoulLensProfile {
  selectedReligion: SoulLensReligion;
  sacredMomentTime: string | null;
  languagePreference: string;
  themeMode: "system" | "light" | "dark" | "sepia" | "midnight";
}

export interface SoulLensVerse {
  id: string;
  religion: SoulLensReligion;
  scriptureName: string;
  reference: string;
  originalText: string;
  transliteration?: string;
  translation: string;
  context: string;
  themes: string[];
  moods: SoulLensEmotion[];
  isPlaceholder: boolean;
}

interface GenerateInsightParams {
  operation: "explain" | "reframe";
  verseId: string;
  religion: SoulLensReligion;
  verseText: string;
  translation: string;
  emotion?: SoulLensEmotion;
}

interface GenerateInsightResult {
  text: string;
  cacheHit: boolean;
  tokenInput: number;
  tokenOutput: number;
}

const PROMPT_VERSION = "2026-04-10-v1";

const SUPPORTED_RELIGIONS: SoulLensReligion[] = ["hinduism"];

const SUPPORTED_EMOTIONS: SoulLensEmotion[] = [
  "anxious",
  "lost",
  "angry",
  "motivated",
  "grateful",
  "grieving",
];

const DEFAULT_PROFILE: SoulLensProfile = {
  selectedReligion: "hinduism",
  sacredMomentTime: null,
  languagePreference: "en",
  themeMode: "system",
};

const PLACEHOLDER_VERSES: Record<SoulLensReligion, SoulLensVerse[]> = {
  hinduism: [
    {
      id: "gita-placeholder-1",
      religion: "hinduism",
      scriptureName: "Bhagavad Gita",
      reference: "Chapter 2, Verse 47",
      originalText: "Karmany evadhikaras te ma phalesu kadacana.",
      transliteration:
        "Karmany evadhikaras te ma phalesu kadacana ma karma-phala-hetur bhur ma te sango 'stv akarmani.",
      translation:
        "You have a right to your actions, but not to cling to the outcome. This placeholder rendering is for product development until licensed text is loaded.",
      context:
        "Placeholder context: a teaching on acting with steadiness and without attachment to results.",
      themes: ["duty", "discipline", "steadiness"],
      moods: ["anxious", "lost", "motivated"],
      isPlaceholder: true,
    },
    {
      id: "gita-placeholder-2",
      religion: "hinduism",
      scriptureName: "Bhagavad Gita",
      reference: "Chapter 6, Verse 5",
      originalText: "Uddhared atmanatmanam.",
      transliteration: "Uddhared atmanatmanam natmanam avasadayet.",
      translation:
        "Lift yourself through clear effort and do not let yourself sink. This is placeholder product text pending the licensed corpus.",
      context:
        "Placeholder context: inner discipline and self-guidance during moments of struggle.",
      themes: ["self-mastery", "resilience"],
      moods: ["lost", "grieving", "motivated"],
      isPlaceholder: true,
    },
  ],
};

export function isSoulLensReligion(value: string): value is SoulLensReligion {
  return SUPPORTED_RELIGIONS.includes(value as SoulLensReligion);
}

export function isSoulLensEmotion(value: string): value is SoulLensEmotion {
  return SUPPORTED_EMOTIONS.includes(value as SoulLensEmotion);
}

export function listSoulLensReligions(): SoulLensReligion[] {
  return [...SUPPORTED_RELIGIONS];
}

export function listSoulLensEmotions(): SoulLensEmotion[] {
  return [...SUPPORTED_EMOTIONS];
}

export function getSoulLensVerses(religion: SoulLensReligion): SoulLensVerse[] {
  return PLACEHOLDER_VERSES[religion];
}

export function getSoulLensVerseById(
  religion: SoulLensReligion,
  verseId: string
): SoulLensVerse | null {
  return PLACEHOLDER_VERSES[religion].find((verse) => verse.id === verseId) ?? null;
}

export function getSoulLensDailyVerse(
  religion: SoulLensReligion,
  dateKey = getDateKey()
): SoulLensVerse {
  const verses = PLACEHOLDER_VERSES[religion];
  const index = getDeterministicIndex(`${religion}:${dateKey}`, verses.length);
  return verses[index];
}

export async function getSoulLensProfile(userId: string): Promise<SoulLensProfile> {
  const db = getFirestore();
  const snapshot = await db.collection("soullens_profiles").doc(userId).get();

  if (!snapshot.exists) {
    return DEFAULT_PROFILE;
  }

  const data = snapshot.data() as Partial<SoulLensProfile> | undefined;
  return {
    selectedReligion:
      data?.selectedReligion && isSoulLensReligion(data.selectedReligion)
        ? data.selectedReligion
        : DEFAULT_PROFILE.selectedReligion,
    sacredMomentTime: data?.sacredMomentTime ?? DEFAULT_PROFILE.sacredMomentTime,
    languagePreference: data?.languagePreference ?? DEFAULT_PROFILE.languagePreference,
    themeMode:
      data?.themeMode === "light" ||
      data?.themeMode === "dark" ||
      data?.themeMode === "system" ||
      data?.themeMode === "sepia" ||
      data?.themeMode === "midnight"
        ? data.themeMode
        : DEFAULT_PROFILE.themeMode,
  };
}

export async function upsertSoulLensProfile(
  userId: string,
  updates: Partial<SoulLensProfile>
): Promise<SoulLensProfile> {
  const db = getFirestore();
  const nextProfile = {
    ...(await getSoulLensProfile(userId)),
    ...updates,
  };

  await db
    .collection("soullens_profiles")
    .doc(userId)
    .set(
      {
        ...nextProfile,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return nextProfile;
}

export async function generateSoulLensInsight(
  params: GenerateInsightParams
): Promise<GenerateInsightResult> {
  const cacheKey = createCacheKey(params);
  const db = getFirestore();
  const cacheRef = db.collection("soullens_ai_cache").doc(cacheKey);
  const existing = await cacheRef.get();

  if (existing.exists) {
    const cached = existing.data() as { text?: string } | undefined;
    if (cached?.text) {
      return {
        text: cached.text,
        cacheHit: true,
        tokenInput: 0,
        tokenOutput: 0,
      };
    }
  }

  const model = getModel();
  const response = await model.generateContent({
    systemInstruction: {
      role: "system",
      parts: [{ text: buildSystemPrompt(params.operation) }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildUserPrompt(params),
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: params.operation === "explain" ? 220 : 260,
      temperature: params.operation === "explain" ? 0.5 : 0.7,
    },
  });

  const rawText =
    response.response.candidates?.[0]?.content?.parts?.[0]?.text ??
    "I could not generate an insight right now.";
  const text = rawText.trim();
  const usage = response.response.usageMetadata;

  await cacheRef.set(
    {
      cache_key: cacheKey,
      operation: params.operation,
      verse_id: params.verseId,
      religion: params.religion,
      emotion: params.emotion ?? null,
      prompt_version: PROMPT_VERSION,
      text,
      created_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    text,
    cacheHit: false,
    tokenInput: usage?.promptTokenCount ?? 0,
    tokenOutput: usage?.candidatesTokenCount ?? 0,
  };
}

function buildSystemPrompt(operation: "explain" | "reframe"): string {
  if (operation === "explain") {
    return [
      "You write for SoulLens, an AI daily scripture companion.",
      "Explain spiritual text in plain, respectful English for a general audience.",
      "Do not claim certainty about doctrine or legal rulings.",
      "Stay anchored to the verse and translation provided.",
      "Keep the answer under 140 words.",
      "Do not use bullet points.",
      "Do not mention that the text may be placeholder content.",
    ].join(" ");
  }

  return [
    "You write for SoulLens, an AI daily scripture companion.",
    "Reframe the verse for the user's current emotional state with empathy, clarity, and restraint.",
    "Be spiritually respectful and non-preachy.",
    "Do not offer mental health diagnosis or crisis advice.",
    "Keep the answer under 160 words.",
    "Write as a short reflective card, not a sermon.",
    "Do not use bullet points.",
  ].join(" ");
}

function buildUserPrompt(params: GenerateInsightParams): string {
  const verse = getSoulLensVerseById(params.religion, params.verseId);
  const context = verse?.context ?? "No additional context available.";

  if (params.operation === "explain") {
    return [
      `Religion: ${params.religion}`,
      `Verse ID: ${params.verseId}`,
      `Verse Text: ${params.verseText}`,
      `Translation: ${params.translation}`,
      `Context: ${context}`,
      "Task: Explain this verse in plain English so a modern reader can understand what it is inviting them to notice or practice today.",
    ].join("\n");
  }

  return [
    `Religion: ${params.religion}`,
    `Verse ID: ${params.verseId}`,
    `Verse Text: ${params.verseText}`,
    `Translation: ${params.translation}`,
    `Emotion: ${params.emotion ?? "unknown"}`,
    `Context: ${context}`,
    "Task: Write a short reflection that connects this verse to the user's present emotion and offers one grounded way to carry the verse into today.",
  ].join("\n");
}

function createCacheKey(params: GenerateInsightParams): string {
  const payload = [
    params.operation,
    params.religion,
    params.verseId,
    params.verseText,
    params.translation,
    params.emotion ?? "",
    PROMPT_VERSION,
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

function getDeterministicIndex(seed: string, length: number): number {
  const hash = createHash("sha256").update(seed).digest("hex");
  const value = parseInt(hash.slice(0, 8), 16);
  return value % length;
}

function getDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}
