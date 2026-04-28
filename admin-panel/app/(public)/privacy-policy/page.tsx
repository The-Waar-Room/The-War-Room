import type { Metadata } from "next";

import LegalDocumentPage from "@/components/shared/legal-document-page";
import { legalDocuments } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "deScroll Privacy Policy",
  description: "Public privacy policy for deScroll.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage document={legalDocuments.privacy} eyebrow="Privacy" />
  );
}
