import { getChatAppProfile } from "./chatAppProfileService";

const DESCROLL_APP_KEYWORD = "deScroll".toLowerCase();

const WELLNESS_KEYWORDS = [
  "screen time",
  "screentime",
  "focus",
  "productivity",
  "doomscroll",
  "scrolling",
  "phone addiction",
  "digital wellness",
  DESCROLL_APP_KEYWORD,
  "usage",
  "habit",
  "attention",
  "distraction",
  "app blocker",
  "notification blocker",
];

const BLOCK_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  {
    pattern:
      /\b(?:nude|nudes|porn|porno|sex(?:ting)?|blowjob|handjob|fuck(?:ing)?|anal|dick|penis|vagina|pussy|cum(?:shot)?|horny)\b/i,
    category: "explicit",
  },
  { pattern: /\b(?:slut|whore|bitch|asshole|bastard)\b/i, category: "abuse" },
  { pattern: /\b(?:kill yourself|go die|rape|molest)\b/i, category: "abuse" },
];

const REDIRECT_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(?:write|fix|debug|code|program|implement)\b/i, category: "coding" },
  {
    pattern: /\b(?:stocks?|crypto|bitcoin|trading|investing|share market)\b/i,
    category: "finance",
  },
  { pattern: /\b(?:diagnose|symptom|treatment|prescription|medicine)\b/i, category: "medical" },
  { pattern: /\b(?:lawsuit|legal advice|attorney|court|contract)\b/i, category: "legal" },
  { pattern: /\b(?:homework|essay|assignment|exam answer)\b/i, category: "homework" },
];

export type ModerationAction = "allow" | "soft_redirect" | "block";

export interface ModerationResult {
  action: ModerationAction;
  category: string;
  response?: string;
  followUpSuggestions?: string[];
}

export function moderateChatMessage(
  message: string,
  appId: string,
  appName: string
): ModerationResult {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  const appProfile = getChatAppProfile(appId, appName);

  for (const rule of BLOCK_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      return {
        action: "block",
        category: rule.category,
        response: appProfile.moderationBlockReply,
        followUpSuggestions: appProfile.moderationBlockSuggestions,
      };
    }
  }

  const isWellnessRelated = WELLNESS_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (appProfile.isDeScroll && !isWellnessRelated) {
    for (const rule of REDIRECT_PATTERNS) {
      if (rule.pattern.test(normalized)) {
        return {
          action: "soft_redirect",
          category: rule.category,
          response: appProfile.moderationRedirectReply,
          followUpSuggestions: appProfile.moderationRedirectSuggestions,
        };
      }
    }
  }

  return { action: "allow", category: "none" };
}
