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

export const legalDocuments: Record<"privacy" | "terms", LegalDocument> = {
  privacy: {
    title: "Privacy Policy",
    description:
      "How deScroll collects, uses, stores, and shares information when you use the app and related services.",
    lastUpdated: "April 29, 2026",
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "deScroll is designed to help users reduce distractions, improve focus, and manage app usage. This Privacy Policy explains what information we may process when you use deScroll, our support channels, and related subscription features.",
          "By using deScroll, you acknowledge that certain data may be processed to deliver the features you enable, maintain service quality, investigate issues, and comply with legal obligations.",
        ],
      },
      {
        heading: "Information We May Collect",
        paragraphs: [
          "The information we process depends on the features you use, the permissions you grant, and whether you subscribe to premium functionality.",
        ],
        bullets: [
          "Account and contact information you provide through sign-in, support requests, or account-related flows.",
          "Subscription, purchase, and billing status provided through Google Play or other payment platforms.",
          "App settings, preferences, block lists, focus configurations, and other product customizations stored to provide the experience you configure.",
          "Device, diagnostic, crash, and performance information used to maintain reliability and troubleshoot problems.",
          "Usage-related signals and permission-backed data required to power features such as app blocking, usage tracking, reminders, or automation that you explicitly enable.",
          "Messages, attachments, or metadata you submit when contacting support or using communication features.",
        ],
      },
      {
        heading: "Accessibility Service Permission",
        paragraphs: [
          "deScroll requests Android Accessibility Service access only for features that require on-device detection of foreground app activity and rule enforcement.",
          "This permission is used in features such as Focus Enhancer, App Shield, Usage Guardian, Reels usage controls, and Advanced Insights usage tracking. It allows deScroll to detect the currently opened app or supported content surfaces so the app can block selected apps, enforce cooldowns, show warning screens, and track usage for the categories you enable.",
          "Accessibility data is used to power the protection and tracking features you explicitly turn on. You can disable this access at any time in Android accessibility settings, but those related features will stop functioning until the permission is restored.",
        ],
      },
      {
        heading: "Foreground Service Special Use Permission",
        paragraphs: [
          "deScroll uses a special-use foreground service for its persistent floating overlay and timer experience.",
          "This foreground service supports the on-screen floating timer, countdown overlay, focus controls, quick pause or resume actions, and related ongoing notification controls while focus sessions or overlay-based experiences are active.",
          "The permission is not used to access unrelated background data. It is used so Android can keep the overlay and its controls running visibly and reliably while the feature is active.",
        ],
      },
      {
        heading: "Query All Packages Permission",
        paragraphs: [
          "deScroll requests package visibility access so it can identify installed apps on your device where that is necessary for launcher and blocking functionality.",
          "This access is used to build the app list shown in screens such as the launcher app list, favorites, app selection dialogs, hidden-app management, notification history labeling, usage views, icon-pack support, and app-blocking configuration screens. It allows deScroll to display app names, icons, launch targets, and package associations for the apps you manage inside the product.",
          "deScroll uses this permission to support user-facing device-management features and not to sell lists of installed apps. If this visibility is restricted, app discovery, icon mapping, usage labeling, and blocking setup may be incomplete or unavailable.",
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
          "Analyze reliability, performance, and feature usage trends.",
          "Comply with legal obligations and enforce our terms.",
        ],
      },
      {
        heading: "Sharing and Third Parties",
        paragraphs: [
          "We may rely on service providers and platform partners that process data on our behalf or as independent controllers for their own services.",
        ],
        bullets: [
          "Google Play and payment providers for subscription and purchase processing.",
          "Cloud, analytics, crash reporting, hosting, and infrastructure providers used to operate and improve the service.",
          "Authorities or other parties where disclosure is required by law, legal process, or to protect rights, safety, and security.",
        ],
      },
      {
        heading: "Data Retention",
        paragraphs: [
          "We retain information only for as long as needed to provide the service, fulfill the purposes described in this policy, resolve disputes, enforce agreements, and satisfy legal or operational requirements.",
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
          "Contact support through the app or official product channels if you need help with account or privacy-related questions.",
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
    lastUpdated: "April 29, 2026",
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
          "You may use deScroll only in compliance with applicable laws, platform rules, and these terms. You are responsible for the accuracy of information you provide and for activity that occurs through your use of the app.",
        ],
        bullets: [
          "Do not misuse, disrupt, reverse engineer, or attempt unauthorized access to the service.",
          "Do not use deScroll in a way that violates the rights of others or applicable law.",
          "Use device permissions responsibly and only on devices or accounts you are authorized to manage.",
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
          "Query all packages access is used to discover installed apps, render launcher and settings app lists, support app-blocking setup, label usage and notification entries, and resolve icon packs or launch targets.",
          "If you revoke these permissions, related features may stop working, display incomplete data, or become unavailable until access is restored.",
        ],
      },
      {
        heading: "Accounts and Access",
        paragraphs: [
          "Some features may require sign-in, premium access, or specific permissions. You are responsible for safeguarding your device, account credentials, and access to any connected services.",
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
          "We may modify, suspend, or discontinue features at any time. We do not guarantee that the service will always be available, uninterrupted, or error free.",
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
