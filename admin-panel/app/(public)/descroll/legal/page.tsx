import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "deScroll Legal",
  description: "Public legal pages for deScroll hosted by the admin panel.",
};

const legalCards = [
  {
    href: "/descroll/privacy-policy",
    title: "Privacy Policy",
    description:
      "Explains what information deScroll may process, why it is used, and the choices available to users.",
  },
  {
    href: "/descroll/terms-and-conditions",
    title: "Terms and Conditions",
    description:
      "Covers acceptable use, subscriptions, billing, intellectual property, and service limitations.",
  },
];

export default function DeScrollLegalHubPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[36px] border border-white/70 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10 lg:p-14">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
            deScroll public pages
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            deScroll legal documents for your Vercel deployment
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
            Deploy this admin-panel app to Vercel and use the generated
            deScroll-specific URLs in the Android app. After deployment, the
            final links will follow the pattern shown below.
          </p>
        </div>

        <div className="mt-8 grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-700 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-950">deScroll privacy URL</p>
            <p className="mt-2 break-all font-mono text-[13px] text-slate-600">
              https://your-vercel-domain/descroll/privacy-policy
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-950">deScroll terms URL</p>
            <p className="mt-2 break-all font-mono text-[13px] text-slate-600">
              https://your-vercel-domain/descroll/terms-and-conditions
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {legalCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[28px] border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_18px_50px_rgba(14,165,233,0.12)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                deScroll route
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
