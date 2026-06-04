import Link from "next/link";
import type { Metadata } from "next";

import { legalDocuments, legalLinks } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "deScroll Legal",
  description: "Public legal pages for deScroll.",
};

const legalCards = [
  {
    href: "/descroll/privacy-policy",
    title: "Privacy Policy",
    description:
      "How deScroll handles device activity, permissions, accounts, support, subscriptions, and optional cloud features.",
    lastUpdated: legalDocuments.privacy.lastUpdated,
  },
  {
    href: "/descroll/terms-and-conditions",
    title: "Terms and Conditions",
    description:
      "The rules for using deScroll, including permissions, subscriptions, AI Helper, support, and acceptable use.",
    lastUpdated: legalDocuments.terms.lastUpdated,
  },
];

export default function DeScrollLegalHubPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            deScroll public pages
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            deScroll legal center
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
            deScroll is designed so core focus, launcher, blocking, and usage
            features run on your device. Optional cloud features, such as AI
            Helper, support, subscriptions, diagnostics, and weather, process
            only the data needed to provide those services.
          </p>
        </div>

        <div className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-950">Legal hub</p>
            <p className="mt-2 break-all font-mono text-[13px] text-slate-600">
              {legalLinks.hub}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-950">Privacy policy</p>
            <p className="mt-2 break-all font-mono text-[13px] text-slate-600">
              {legalLinks.privacy}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-950">Terms</p>
            <p className="mt-2 break-all font-mono text-[13px] text-slate-600">
              {legalLinks.terms}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {legalCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-lg border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_18px_50px_rgba(14,165,233,0.12)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
                Last updated {card.lastUpdated}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                {card.description}
              </p>
              <p className="mt-5 font-medium text-slate-900 transition group-hover:text-sky-700">
                Open page
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
