import type { Metadata } from "next";
import { FeedbackProvider } from "@/admin/ui/feedback";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel ROWE" },
  robots: { index: false, follow: false },
};

/** Todo el panel: avisos y confirmaciones compartidos. Sin cromo de la web pública. */
export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <FeedbackProvider>{children}</FeedbackProvider>;
}
