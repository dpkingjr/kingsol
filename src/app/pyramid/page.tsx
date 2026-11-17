import type { Metadata } from "next";
import PyramidGame from "./PyramidGame";

export const metadata: Metadata = { title: "Pyramid · Kingsol Solitaire" };

export default function Page() {
  return <PyramidGame />;
}
