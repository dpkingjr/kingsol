import type { Metadata } from "next";
import FreeCellGame from "./FreeCellGame";

export const metadata: Metadata = { title: "FreeCell · Kingsol Solitaire" };

export default function Page() {
  return <FreeCellGame />;
}
