import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TokenSwatches } from "./TokenSwatches";

export const metadata: Metadata = { title: "Tokens", robots: { index: false } };

/** Dev-only review page: every colour token with its contrast against the page background. */
export default function TokensPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <TokenSwatches />;
}
