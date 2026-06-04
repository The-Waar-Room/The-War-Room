export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const legalBaseUrl = "https://the-war-room-sudo.vercel.app";

export const legalLinks = {
  hub: `${legalBaseUrl}/descroll/legal`,
  privacy: `${legalBaseUrl}/descroll/privacy-policy`,
  terms: `${legalBaseUrl}/descroll/terms-and-conditions`,
};

export const legalDocuments: Record<"privacy" | "terms", LegalDocument> = {
  privacy: {
    title: "Privacy Policy",
    description:
      "How deScroll handles device activity, permissions, accounts, support, subscriptions, and optional cloud features.",
    lastUpdated: "June 4, 2026",
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "deScroll is built to help you reduce distractions, manage app use, and stay focused. Core blocking, usage tracking, scroll counters, launcher preferences, and focus settings are designed to run on your device.",
          "Some optional features require data to leave your device, such as sign-in, AI Helper, support tickets, subscription verification, crash reporting, analytics, and weather. This policy explains what is processed, why it is used, and the choices available to you.",
        ],
      },
      {
        heading: "Information We Process",
        paragraphs: [
          "The information deScroll processes depends on the features you enable, permissions you grant, and whether you use optional cloud-backed features.",
        ],
        bullets: [
          "Local app settings, launcher preferences, selected apps, block lists, warning messages, cooldown settings, focus configurations, hidden or renamed apps, and other product customizations.",
          "Local usage data, app usage summaries, notification history, short-video scroll counts, overlay state, and chat history stored in the app database when related features are enabled.",
          "Account information from Google/Firebase sign-in, such as your user ID and email address, when you sign in for AI Helper, support, or subscription features.",
          "AI Helper messages, selected chat history, app version, feature configuration, and requested usage analytics context when you ask the AI Helper to answer using your deScroll data.",
          "Support ticket content, replies, ticket status, priority, app version, and related metadata when you contact support in the app.",
          "Subscription and purchase information needed to verify or manage premium access, such as product ID, base plan ID, purchase token, order ID, purchase state, billing response, and subscription status.",
          "Crash logs, diagnostics, app performance data, and analytics events from Firebase services where enabled to monitor reliability and improve the app.",
          "Approximate location coordinates used for weather when you enable weather and grant coarse location access.",
        ],
      },
      {
        heading: "Accessibility Service Permission",
        paragraphs: [
          "deScroll requests Android Accessibility Service access only for user-facing features that need on-device detection of foreground app activity, supported short-video screens, scroll events, and selected window changes.",
          "This permission powers features such as App Shield, Usage Guardian, Focus Enhancer, Advanced Insights, and short-video scroll counting. It is used to detect selected apps, enforce rules you configure, show warning screens, return you to the launcher during focus sessions, and count supported usage events.",
          "Accessibility-derived activity is not sold and is not sent to advertising services. It stays on your device for core protection and tracking features, except when you explicitly use AI Helper requests that include selected usage analytics context.",
          "You can disable Accessibility access at any time in Android settings. Related protection, blocking, or tracking features may stop working until access is restored.",
        ],
      },
      {
        heading: "Notification Listener and Usage Access",
        paragraphs: [
          "Notification Control uses Android notification listener access to detect notifications from apps you select, apply your configured notification rules, and show notification history inside deScroll.",
          "Usage Access is used for app usage summaries and device wellness features that need Android usage statistics. This data is processed for features you enable and is stored locally unless you choose to include relevant summaries in an AI Helper request.",
        ],
      },
      {
        heading: "Overlay and Foreground Service",
        paragraphs: [
          "deScroll uses overlay and special-use foreground service permissions for visible floating timers, countdown overlays, focus controls, quick pause or resume actions, and ongoing notifications while those experiences are active.",
          "These permissions are used so Android can keep the visible overlay and related controls running reliably. They are not used to collect unrelated background activity.",
        ],
      },
      {
        heading: "Query All Packages Permission",
        paragraphs: [
          "deScroll requests package visibility access so it can identify installed apps where that is necessary for launcher, app selection, blocking, usage labeling, hidden-app management, renamed apps, icon-pack support, notification history labeling, and quick access features.",
          "Installed app inventory is used for deScroll's core launcher and device-management functionality. It is not sold and is not shared for advertising or analytics monetization.",
        ],
      },
      {
        heading: "Location and Weather",
        paragraphs: [
          "If you enable weather and grant approximate location access, deScroll stores your coarse latitude and longitude locally so it can refresh weather on the home screen.",
          "To fetch weather, deScroll sends latitude and longitude to Open-Meteo. The returned temperature is stored locally. Location is not used for advertising.",
        ],
      },
      {
        heading: "Accounts, AI Helper, Support, and Subscriptions",
        paragraphs: [
          "Sign-in is optional for core launcher and blocking features, but may be required for AI Helper, support tickets, account-linked chat history, and premium access.",
          "When you use AI Helper, your message and selected context needed to answer your request may be sent to The War Room backend and AI service providers. If you ask about your usage data, deScroll may include a limited analytics summary, such as app names, package names, usage duration, scroll counts, dates, and configured focus or blocking settings relevant to your question.",
          "Support tickets send the message and metadata you provide so the support team can reply. Subscription features send purchase and status data needed to verify premium access through Google Play and maintain entitlement records.",
        ],
      },
      {
        heading: "How We Use Information",
        paragraphs: [
          "We use information to operate, secure, improve, and support deScroll.",
        ],
        bullets: [
          "Provide core app functionality and premium features.",
          "Maintain subscriptions, restore purchases, and prevent abuse or fraud.",
          "Respond to support requests and service inquiries.",
          "Answer AI Helper requests and maintain account-linked chat history when you use that feature.",
          "Fetch weather when you enable weather and grant location permission.",
          "Analyze reliability, crashes, performance, and high-level feature usage trends.",
          "Comply with legal obligations and enforce our terms.",
        ],
      },
      {
        heading: "Sharing and Third Parties",
        paragraphs: [
          "We do not sell personal data. We may rely on service providers and platform partners that process data on our behalf or provide services you choose to use.",
        ],
        bullets: [
          "Google/Firebase services for authentication, analytics, crash reporting, and infrastructure.",
          "Google Play Billing for subscription purchase and entitlement handling.",
          "The War Room backend and cloud providers used to operate AI Helper, support tickets, subscriptions, and admin tools.",
          "AI service providers used to generate AI Helper responses when you use the AI feature.",
          "Open-Meteo for weather requests when weather is enabled.",
          "Authorities or other parties where disclosure is required by law, legal process, or to protect rights, safety, and security.",
        ],
      },
      {
        heading: "Local Storage, Backup, and Retention",
        paragraphs: [
          "Local deScroll data, including preferences, selected apps, usage records, notification history, and chat history, remains on your device unless you use features that send selected data off-device as described above.",
          "Android backup or device transfer may include app data depending on your device and Google backup settings. You can manage backup behavior in Android system settings.",
          "Cloud-backed data is retained only as long as needed to provide the service, maintain account and subscription records, respond to support requests, troubleshoot reliability issues, prevent abuse, comply with law, and enforce our terms.",
        ],
      },
      {
        heading: "Your Choices",
        paragraphs: [
          "You can control some data practices directly through your device settings, Google Play account, and the permissions or product settings you choose inside the app.",
        ],
        bullets: [
          "Review or revoke device permissions in Android settings.",
          "Manage or cancel subscriptions in Google Play Subscriptions.",
          "Limit or stop use of optional features by disabling them in the app.",
          "Delete local app data through Android app storage settings if you want to remove data stored on your device.",
          "Contact support through in-app Support Tickets or official product channels to ask privacy questions or request deletion of account-linked cloud data, subject to legal, security, billing, and abuse-prevention retention needs.",
        ],
      },
      {
        heading: "Children",
        paragraphs: [
          "deScroll is not intended for children under the age required by applicable law to provide valid consent, unless a parent or guardian has authorized use where permitted.",
        ],
      },
      {
        heading: "Policy Changes",
        paragraphs: [
          "We may update this Privacy Policy from time to time. When we do, we will revise the last updated date on this page. Continued use of the service after an update means the revised policy applies going forward.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    description:
      "The rules and conditions that apply when you access or use deScroll, including subscriptions and acceptable use.",
    lastUpdated: "June 4, 2026",
    sections: [
      {
        heading: "Acceptance of Terms",
        paragraphs: [
          "By downloading, accessing, or using deScroll, you agree to these Terms and Conditions. If you do not agree, do not use the service.",
        ],
      },
      {
        heading: "Use of the Service",
        paragraphs: [
          "deScroll provides launcher, focus, app-management, usage-tracking, AI Helper, support, and subscription features. You may use deScroll only in compliance with applicable laws, platform rules, and these terms.",
          "You are responsible for your device, account, permissions, settings, and activity through your use of the app.",
        ],
        bullets: [
          "Do not misuse, disrupt, reverse engineer, or attempt unauthorized access to the service.",
          "Do not use deScroll in a way that violates the rights of others or applicable law.",
          "Use device permissions responsibly and only on devices, apps, or accounts you are authorized to manage.",
          "Do not attempt to bypass billing, entitlement checks, rate limits, moderation, account restrictions, or security controls.",
        ],
      },
      {
        heading: "Permission-Specific Terms",
        paragraphs: [
          "Some deScroll features require elevated Android permissions so the app can perform the device-management tasks you request.",
        ],
        bullets: [
          "Accessibility Service access is used for features such as Focus Enhancer, App Shield, Usage Guardian, and usage tracking flows that need to detect foreground apps, show warning screens, or enforce selected rules on device.",
          "Foreground service special-use access is used for the floating timer, countdown overlay, persistent focus controls, and related visible overlay interactions while those features are active.",
          "Notification listener access is used for selected notification-control features and notification history.",
          "Usage access is used to show app usage summaries and support usage-based wellness features.",
          "Query all packages access is used to discover installed apps, render launcher and settings app lists, support app-blocking setup, label usage and notification entries, and resolve icon packs or launch targets.",
          "Approximate location is used only for weather when you enable weather features and grant location permission.",
          "If you revoke these permissions, related features may stop working, display incomplete data, or become unavailable until access is restored.",
        ],
      },
      {
        heading: "Accounts and Access",
        paragraphs: [
          "Some features may require sign-in, premium access, network access, or specific Android permissions. You are responsible for safeguarding your device, account credentials, and access to connected services.",
          "We may suspend or restrict account-linked features if we believe there is abuse, fraud, security risk, payment failure, policy violation, or unlawful activity.",
        ],
      },
      {
        heading: "AI Helper and Support",
        paragraphs: [
          "AI Helper is provided for general digital wellness, focus, habit, and app guidance. It may be inaccurate, incomplete, delayed, or unavailable, and it should not be treated as professional medical, legal, financial, emergency, or safety advice.",
          "Support tickets are provided to help with product issues. Do not submit unlawful, abusive, confidential third-party, or highly sensitive information unless it is necessary for support.",
        ],
      },
      {
        heading: "Subscriptions and Billing",
        paragraphs: [
          "Certain features may require a paid subscription. Pricing, trial eligibility, renewal terms, and cancellation options are shown in the app and through the checkout flow provided by Google Play.",
          "Subscriptions renew automatically unless canceled before the renewal date. You can manage or cancel subscriptions through your Google Play account. Refunds, if any, are subject to Google Play policies and applicable law.",
        ],
      },
      {
        heading: "Intellectual Property",
        paragraphs: [
          "deScroll, including its software, design, branding, content, and related materials, is protected by intellectual property laws. Except as expressly permitted, you may not copy, modify, distribute, sell, or create derivative works from the service.",
        ],
      },
      {
        heading: "Availability and Changes",
        paragraphs: [
          "We may modify, suspend, limit, or discontinue features at any time. We do not guarantee that deScroll, cloud features, AI responses, support, subscriptions, or third-party platform services will always be available, uninterrupted, or error free.",
        ],
      },
      {
        heading: "Disclaimers",
        paragraphs: [
          "deScroll is provided on an as available and as is basis to the maximum extent permitted by law. We do not guarantee specific outcomes, uninterrupted access, or compatibility with every device, configuration, or third-party service.",
        ],
      },
      {
        heading: "Limitation of Liability",
        paragraphs: [
          "To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, revenue, profits, or business opportunities arising from your use of deScroll.",
        ],
      },
      {
        heading: "Termination",
        paragraphs: [
          "We may suspend or terminate access to the service if we believe you have violated these terms, created risk for the service or other users, or where required for legal, security, or operational reasons.",
        ],
      },
      {
        heading: "Changes to These Terms",
        paragraphs: [
          "We may revise these Terms and Conditions from time to time. When we do, we will post the updated version here and update the last updated date. Your continued use of deScroll after changes take effect means you accept the revised terms.",
        ],
      },
    ],
  },
};
