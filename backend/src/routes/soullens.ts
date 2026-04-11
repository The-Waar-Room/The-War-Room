import { Router, Response } from "express";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import { killSwitch } from "../middleware/killSwitch";
import { rateLimiter } from "../middleware/rateLimiter";
import { trackUsage } from "../services/usageService";
import {
  generateSoulLensInsight,
  getSoulLensDailyVerse,
  getSoulLensProfile,
  getSoulLensVerseById,
  getSoulLensVerses,
  isSoulLensEmotion,
  isSoulLensReligion,
  listSoulLensEmotions,
  listSoulLensReligions,
  type SoulLensProfile,
  upsertSoulLensProfile,
} from "../services/soullensService";
import { AuthenticatedRequest } from "../types";

export const soullensRouter = Router();

soullensRouter.get(
  "/profile",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const profile = await getSoulLensProfile(req.decodedToken!.uid);
      res.json({ success: true, data: profile });
    } catch (err) {
      console.error("[soullens/profile] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

soullensRouter.post(
  "/profile",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const body = (req.body ?? {}) as Partial<SoulLensProfile>;
      const updates: Partial<SoulLensProfile> = {};

      if (body.selectedReligion !== undefined) {
        if (body.selectedReligion !== null && !isSoulLensReligion(body.selectedReligion)) {
          res.status(400).json({ success: false, error: "Invalid religion" });
          return;
        }
        updates.selectedReligion = body.selectedReligion;
      }

      if (body.sacredMomentTime !== undefined) {
        if (body.sacredMomentTime !== null && !/^\d{2}:\d{2}$/.test(body.sacredMomentTime)) {
          res.status(400).json({ success: false, error: "Invalid sacred moment time" });
          return;
        }
        updates.sacredMomentTime = body.sacredMomentTime;
      }

      if (body.languagePreference !== undefined) {
        if (typeof body.languagePreference !== "string" || body.languagePreference.length < 2) {
          res.status(400).json({ success: false, error: "Invalid language preference" });
          return;
        }
        updates.languagePreference = body.languagePreference;
      }

      if (body.themeMode !== undefined) {
        if (!["system", "light", "dark", "sepia", "midnight"].includes(body.themeMode)) {
          res.status(400).json({ success: false, error: "Invalid theme mode" });
          return;
        }
        updates.themeMode = body.themeMode;
      }

      const profile = await upsertSoulLensProfile(req.decodedToken!.uid, updates);

      res.json({ success: true, data: profile });
    } catch (err) {
      console.error("[soullens/profile:update] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

soullensRouter.get(
  "/meta",
  appVerify,
  authMiddleware,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: {
        religions: listSoulLensReligions(),
        emotions: listSoulLensEmotions(),
      },
    });
  }
);

soullensRouter.get(
  "/daily-verse",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const requestedReligion = req.query.religion;
      let religion: string | null =
        typeof requestedReligion === "string" ? requestedReligion : null;

      if (!religion) {
        const profile = await getSoulLensProfile(req.decodedToken!.uid);
        religion = profile.selectedReligion;
      }

      if (!religion || !isSoulLensReligion(religion)) {
        res.status(400).json({ success: false, error: "Religion selection is required" });
        return;
      }

      const verse = getSoulLensDailyVerse(religion);
      res.json({ success: true, data: verse });
    } catch (err) {
      console.error("[soullens/daily-verse] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

soullensRouter.get(
  "/verses",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const religion = req.query.religion;
      if (typeof religion !== "string" || !isSoulLensReligion(religion)) {
        res.status(400).json({ success: false, error: "Valid religion is required" });
        return;
      }

      const search =
        typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
      const theme = typeof req.query.theme === "string" ? req.query.theme.trim().toLowerCase() : "";
      const mood = typeof req.query.mood === "string" ? req.query.mood.trim().toLowerCase() : "";

      const verses = getSoulLensVerses(religion).filter((verse) => {
        const matchesSearch =
          search.length === 0 ||
          verse.reference.toLowerCase().includes(search) ||
          verse.translation.toLowerCase().includes(search) ||
          verse.themes.some((item) => item.toLowerCase().includes(search));
        const matchesTheme =
          theme.length === 0 || verse.themes.some((item) => item.toLowerCase() === theme);
        const matchesMood = mood.length === 0 || verse.moods.some((item) => item === mood);
        return matchesSearch && matchesTheme && matchesMood;
      });

      res.json({ success: true, data: verses });
    } catch (err) {
      console.error("[soullens/verses] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

soullensRouter.get(
  "/verses/:verseId",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const religion = req.query.religion;
      if (typeof religion !== "string" || !isSoulLensReligion(religion)) {
        res.status(400).json({ success: false, error: "Valid religion is required" });
        return;
      }

      const verseId = req.params.verseId;
      if (typeof verseId !== "string") {
        res.status(400).json({ success: false, error: "Verse ID is required" });
        return;
      }

      const verse = getSoulLensVerseById(religion, verseId);
      if (!verse) {
        res.status(404).json({ success: false, error: "Verse not found" });
        return;
      }

      const related = getSoulLensVerses(religion)
        .filter((item) => item.id !== verse.id)
        .filter((item) => item.themes.some((theme) => verse.themes.includes(theme)))
        .slice(0, 3);

      res.json({ success: true, data: { verse, related } });
    } catch (err) {
      console.error("[soullens/verse] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

soullensRouter.post(
  "/ai/explain",
  appVerify,
  authMiddleware,
  killSwitch,
  rateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { verseId, religion, verseText, translation } = req.body as {
        verseId?: string;
        religion?: string;
        verseText?: string;
        translation?: string;
      };

      if (!verseId || !religion || !verseText || !translation) {
        res.status(400).json({ success: false, error: "Missing required fields" });
        return;
      }

      if (!isSoulLensReligion(religion)) {
        res.status(400).json({ success: false, error: "Invalid religion" });
        return;
      }

      const result = await generateSoulLensInsight({
        operation: "explain",
        verseId,
        religion,
        verseText,
        translation,
      });

      const usage = result.cacheHit
        ? null
        : {
            messagesUsedToday: await trackUsage({
              userId: req.decodedToken!.uid,
              appId: req.appId!,
              tokenInput: result.tokenInput,
              tokenOutput: result.tokenOutput,
            }),
            dailyLimit: req.planLimits!.daily_messages,
            remaining: 0,
            plan: req.planType!,
          };

      if (usage) {
        usage.remaining = Math.max(0, usage.dailyLimit - usage.messagesUsedToday);
      }

      res.json({
        success: true,
        data: {
          text: result.text,
          cacheHit: result.cacheHit,
        },
        usage,
      });
    } catch (err) {
      console.error("[soullens/ai/explain] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

soullensRouter.post(
  "/ai/reframe",
  appVerify,
  authMiddleware,
  killSwitch,
  rateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { verseId, religion, verseText, translation, emotion } = req.body as {
        verseId?: string;
        religion?: string;
        verseText?: string;
        translation?: string;
        emotion?: string;
      };

      if (!verseId || !religion || !verseText || !translation || !emotion) {
        res.status(400).json({ success: false, error: "Missing required fields" });
        return;
      }

      if (!isSoulLensReligion(religion)) {
        res.status(400).json({ success: false, error: "Invalid religion" });
        return;
      }

      if (!isSoulLensEmotion(emotion)) {
        res.status(400).json({ success: false, error: "Invalid emotion" });
        return;
      }

      const result = await generateSoulLensInsight({
        operation: "reframe",
        verseId,
        religion,
        verseText,
        translation,
        emotion,
      });

      const usage = result.cacheHit
        ? null
        : {
            messagesUsedToday: await trackUsage({
              userId: req.decodedToken!.uid,
              appId: req.appId!,
              tokenInput: result.tokenInput,
              tokenOutput: result.tokenOutput,
            }),
            dailyLimit: req.planLimits!.daily_messages,
            remaining: 0,
            plan: req.planType!,
          };

      if (usage) {
        usage.remaining = Math.max(0, usage.dailyLimit - usage.messagesUsedToday);
      }

      res.json({
        success: true,
        data: {
          text: result.text,
          cacheHit: result.cacheHit,
          emotion,
        },
        usage,
      });
    } catch (err) {
      console.error("[soullens/ai/reframe] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
