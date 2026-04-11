interface ChatAppProfile {
  isDeScroll: boolean;
  assistantName: string;
  systemPrompt: string;
  fallbackFollowUps: (message: string, answer: string) => string[];
  moderationBlockReply: string;
  moderationBlockSuggestions: string[];
  moderationRedirectReply: string;
  moderationRedirectSuggestions: string[];
}

function isDeScrollApp(appId: string, appName: string): boolean {
  const normalizedAppId = appId.trim().toLowerCase();
  const normalizedAppName = appName.trim().toLowerCase();

  return normalizedAppId.includes("descroll") || normalizedAppName.includes("descroll");
}

function isSoulLensApp(appId: string, appName: string): boolean {
  const normalizedAppId = appId.trim().toLowerCase();
  const normalizedAppName = appName.trim().toLowerCase();

  return normalizedAppId.includes("soullens") || normalizedAppName.includes("soullens");
}

function deScrollFallbackFollowUps(message: string, answer: string): string[] {
  const lowerMessage = message.toLowerCase();
  const lowerAnswer = answer.toLowerCase();

  if (/^(hey|hi|hello|yo)\b/.test(lowerMessage.trim())) {
    return ["How can I reduce phone use today?", "What deScroll feature should I use first?"];
  }

  if (lowerMessage.includes("screen time") || lowerAnswer.includes("screen time")) {
    return [
      "Which app is taking most of my time?",
      "How do I cut my usage today?",
      "What is a realistic daily limit for me?",
    ];
  }

  if (lowerMessage.includes("focus") || lowerAnswer.includes("focus")) {
    return ["Give me one focus habit for today", "How do I stop checking my phone while working?"];
  }

  return [
    "How can I spend less time on my phone?",
    "What should I improve first?",
    "Which deScroll tool fits me best?",
  ];
}

function genericFallbackFollowUps(_message: string, _answer: string): string[] {
  return [
    "Can you explain that simply?",
    "What should I ask next?",
    "Give me one practical next step",
  ];
}

function soulLensFallbackFollowUps(message: string, answer: string): string[] {
  const lowerMessage = message.toLowerCase();
  const lowerAnswer = answer.toLowerCase();

  if (lowerMessage.includes("anxious") || lowerAnswer.includes("anxious")) {
    return [
      "Show me a verse for anxious days",
      "Reframe this verse for what I feel",
      "Give me one practice for today",
    ];
  }

  if (lowerMessage.includes("grateful") || lowerAnswer.includes("gratitude")) {
    return [
      "Give me a gratitude reflection",
      "Show a related verse",
      "Help me journal on this verse",
    ];
  }

  return [
    "Explain today's verse simply",
    "Reframe this verse for my mood",
    "Show me a related verse",
  ];
}

export function getChatAppProfile(appId: string, appName: string): ChatAppProfile {
  if (isDeScrollApp(appId, appName)) {
    return {
      isDeScroll: true,
      assistantName: "deScroll AI",
      systemPrompt: `You are deScroll AI, the in-app guide for deScroll.
Help users reduce screen time, stay focused, and use deScroll features effectively.

Useful features:
- Usage Guardian: soft daily limits. Path: Settings -> deScroll Protect -> Usage Guardian
- App Shield: full app blocking. Path: Settings -> deScroll Protect -> App Shield
- Focus Enhancer: focus sessions. Path: Settings -> deScroll Protect -> Focus Enhancer
- Notification Control: reduce notification distraction. Path: Settings -> deScroll Protect -> Notification Control
- Advanced Insights: understand usage patterns. Path: Settings -> deScroll Protect -> Advanced Insights
- App Usage: detailed app usage reports. Path: Settings -> deScroll Protect -> Advanced Insights -> App Usage
- Scroll Counter: reel and short-video tracking. Path: Settings -> deScroll Protect -> Advanced Insights -> Scroll Counter
- Hidden Apps: hide selected apps from the launcher. Path: Settings -> deScroll Protect -> Hidden Apps
- Renamed Apps: change app labels shown in the launcher. Path: Settings -> deScroll Protect -> Renamed App

Access and setup help:
- Access Control helps with permissions and setup issues. Path: Settings -> Access Control

When helping:
- understand the problem
- suggest the best feature
- say why it fits
- say where to find it using the exact paths above

Prefer deScroll features over generic advice for focus, habits, distraction, or phone-use problems.
If two features fit, compare them simply.
Mention Access Control for setup or permission issues.
Mention Premium only when needed.

If the user asks about their usage, insights, weekly report, reel activity, or a specific app's usage:
- use only the analytics context provided
- do not invent numbers
- if data is missing, say that clearly and ask a short follow-up
- do not just repeat the data back as a plain summary
- read the numbers and explain what they mean in simple language
- highlight useful patterns such as spikes, improvement, worsening, consistency, top distracting apps, and which app is taking the biggest share
- if the request is for one app or one day, answer directly with the exact number first, then give a short interpretation
- if the request is for multiple days, compare the days, mention the trend, and point out the most important change
- when helpful, translate numbers into plain meaning like higher than usual, improving, stable, or concentrated in one app
- after interpreting the numbers, suggest the most relevant deScroll feature if it genuinely fits

Be warm, short, practical, and clear.
Calmly refuse explicit, abusive, hateful, or harmful requests.`,
      fallbackFollowUps: deScrollFallbackFollowUps,
      moderationBlockReply:
        "I can't help with explicit or abusive requests. If you want, I can help with focus, screen time, habits, or a calmer conversation.",
      moderationBlockSuggestions: [
        "How can I stop checking my phone so often?",
        "Give me a quick focus reset",
        "What should I do when I feel distracted?",
      ],
      moderationRedirectReply:
        "I’m best at digital wellness, focus, screen-time habits, and how to use deScroll. I can still help with a light conversation, but for this topic I’d rather bring it back to your habits, routines, or distractions.",
      moderationRedirectSuggestions: [
        "How can I reduce my screen time today?",
        "Which deScroll feature should I start with?",
        "Help me build a better phone habit",
      ],
    };
  }

  if (isSoulLensApp(appId, appName)) {
    return {
      isDeScroll: false,
      assistantName: "SoulLens AI",
      systemPrompt: `You are SoulLens AI, a spiritually respectful assistant built into the ${appName} app.
You help users reflect on daily scripture, understand verses in plain language, and connect the text to their present emotional state.
Be calm, clear, concise, and non-dogmatic.
Do not claim religious authority, legal rulings, or exclusive doctrinal certainty.
If a user asks for something clearly outside the app's purpose, gently redirect them toward scripture reflection, journaling, mood-based reflection, or daily practice.
Refuse explicit sexual, abusive, or hateful requests in a calm, brief way.`,
      fallbackFollowUps: soulLensFallbackFollowUps,
      moderationBlockReply:
        "I can't help with explicit or abusive requests. If you want, I can help you reflect on a verse, your current mood, or a grounded spiritual practice for today.",
      moderationBlockSuggestions: [
        "Explain today's verse simply",
        "Show me a calming reflection",
        "Help me journal on this verse",
      ],
      moderationRedirectReply:
        "I'm best at daily scripture reflection, plain-language meaning, mood-based reframes, and spiritual journaling inside SoulLens.",
      moderationRedirectSuggestions: [
        "Explain this verse in plain English",
        "Reframe this verse for anxiety",
        "Give me one reflection question",
      ],
    };
  }

  return {
    isDeScroll: false,
    assistantName: `${appName} AI`,
    systemPrompt: `You are a smart assistant built into the ${appName} app.
Be helpful, concise, and friendly.
Answer using only the app context and conversation you were given.
Refuse explicit sexual, abusive, or hateful requests in a calm, brief way.`,
    fallbackFollowUps: genericFallbackFollowUps,
    moderationBlockReply:
      "I can't help with explicit or abusive requests. Please ask something else.",
    moderationBlockSuggestions: [
      "Can you help me with something else?",
      "What can you help me with here?",
    ],
    moderationRedirectReply: `I’m best at helping inside the ${appName} experience. Try asking about the app, your workflow, or the current topic.`,
    moderationRedirectSuggestions: [
      "What can you help me with in this app?",
      "Can you explain that in a simpler way?",
      "What should I do next here?",
    ],
  };
}
