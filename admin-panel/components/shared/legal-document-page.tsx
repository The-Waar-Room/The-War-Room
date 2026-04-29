import Link from "next/link";

import type { LegalDocument } from "@/lib/legal-content";

type LegalDocumentPageProps = {
  document: LegalDocument;
  eyebrow: string;
};

export default function LegalDocumentPage({
  document,
  eyebrow,
}: LegalDocumentPageProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {document.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {document.description}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Last updated:{" "}
              <span className="font-medium text-slate-900">
                {document.lastUpdated}
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {document.sections.map((section) => (
              <section key={section.heading} className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {section.heading}
                </h2>

                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-7 text-slate-700 sm:text-base"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.bullets ? (
                  <ul className="space-y-3 pl-5 text-sm leading-7 text-slate-700 sm:text-base">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="list-disc">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <Link
            href="/descroll/legal"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Legal hub
          </Link>
          <Link
            href="/descroll/privacy-policy"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Privacy policy
          </Link>
          <Link
            href="/descroll/terms-and-conditions"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Terms and conditions
          </Link>
        </div>
      </div>
    </main>
  );
}
