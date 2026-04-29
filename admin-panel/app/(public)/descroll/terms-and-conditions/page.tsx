import type { Metadata } from "next";

import LegalDocumentPage from "@/components/shared/legal-document-page";
import { legalDocuments } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "deScroll Terms and Conditions",
  description: "Public terms and conditions for deScroll.",
};

export default function DeScrollTermsAndConditionsPage() {
  return (
    <LegalDocumentPage
      document={legalDocuments.terms}
      eyebrow="deScroll Terms"
    />
  );
}
