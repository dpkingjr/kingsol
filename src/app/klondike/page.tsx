import type { Metadata } from "next";
import KlondikeGame from "./KlondikeGame";

export const metadata: Metadata = { title: "Klondike · Kingsol Solitaire" };

export default function Page() {
  return <KlondikeGame />;
}
