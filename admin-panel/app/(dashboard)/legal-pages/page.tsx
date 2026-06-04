"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, FileText, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { legalDocuments, legalLinks } from "@/lib/legal-content";
import { cn } from "@/lib/utils";

type LegalRow = {
  key: keyof typeof legalLinks;
  label: string;
  description: string;
  href: string;
};

const legalRows: LegalRow[] = [
  {
    key: "hub",
    label: "Legal hub",
    description: "Public user-facing index for deScroll legal documents.",
    href: legalLinks.hub,
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    description:
      "Data handling, permissions, optional cloud features, and user choices.",
    href: legalLinks.privacy,
  },
  {
    key: "terms",
    label: "Terms and Conditions",
    description:
      "Acceptable use, permissions, billing, AI, support, and limits.",
    href: legalLinks.terms,
  },
];

const postureItems = [
  "Core launcher, blocking, usage, and scroll features are designed to run on device.",
  "Optional cloud features process limited data only when users sign in or use AI Helper, support, subscriptions, diagnostics, analytics, or weather.",
  "The current policy does not claim that deScroll collects no data at all.",
];

export default function LegalPagesPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyLink(key: string, href: string) {
    await navigator.clipboard.writeText(href);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Legal Pages</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Public deScroll legal links and disclosure status
          </p>
        </div>
        <Badge variant="success" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Public routes active
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            Data posture
          </CardTitle>
          <CardDescription>
            Summary reflected by the current Privacy Policy and Terms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {postureItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {legalRows.map((row) => {
          const isCopied = copiedKey === row.key;

          return (
            <Card key={row.key}>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">{row.label}</h2>
                    {row.key === "privacy" ? (
                      <Badge variant="secondary">
                        Updated {legalDocuments.privacy.lastUpdated}
                      </Badge>
                    ) : null}
                    {row.key === "terms" ? (
                      <Badge variant="secondary">
                        Updated {legalDocuments.terms.lastUpdated}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.description}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                    {row.href}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyLink(row.key, row.href)}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" })
                    )}
                  >
                    {isCopied ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {isCopied ? "Copied" : "Copy"}
                  </button>
                  <Link
                    href={row.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
