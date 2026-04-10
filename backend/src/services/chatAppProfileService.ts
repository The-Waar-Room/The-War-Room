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

function deScrollFallbackFollowUps(message: string, answer: string): string[] {
  const lowerMessage = message.toLowerCase();
  const lowerAnswer = answer.toLowerCase();

  if (/^(hey|hi|hello|yo)\b/.test(lowerMessage.trim())) {
    return [
      "How can I reduce phone use today?",
      "What deScroll feature should I use first?",
    ];
  }

  if (lowerMessage.includes("screen time") || lowerAnswer.includes("screen time")) {
    return [
      "Which app is taking most of my time?",
      "How do I cut my usage today?",
      "What is a realistic daily limit for me?",
    ];
  }

  if (lowerMessage.includes("focus") || lowerAnswer.includes("focus")) {
    return [
      "Give me one focus habit for today",
      "How do I stop checking my phone while working?",
    ];
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

export function getChatAppProfile(appId: string, appName: string): ChatAppProfile {
  if (isDeScrollApp(appId, appName)) {
    return {
      isDeScroll: true,
      assistantName: "deScroll AI",
      systemPrompt: `You are deScroll AI, a smart assistant built into the ${appName} app.
You are wellness-first, but you may also handle light everyday conversation.
You help users understand their screen time habits, app usage patterns, digital wellness, focus, and healthier phone habits.
Be helpful, concise, and friendly. Use a warm, grounded tone.
If the user asks for something clearly outside your strengths, briefly redirect toward digital wellness, routines, focus, or deScroll features.
Refuse explicit sexual, abusive, or hateful requests in a calm, brief way.`,
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
    moderationRedirectReply:
      `I’m best at helping inside the ${appName} experience. Try asking about the app, your workflow, or the current topic.`,
    moderationRedirectSuggestions: [
      "What can you help me with in this app?",
      "Can you explain that in a simpler way?",
      "What should I do next here?",
    ],
  };
}