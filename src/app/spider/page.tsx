import type { Metadata } from "next";
import SpiderGame from "./SpiderGame";

export const metadata: Metadata = { title: "Spider · Kingsol Solitaire" };

export default function Page() {
  return <SpiderGame />;
}
