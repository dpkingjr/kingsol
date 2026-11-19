import type { Metadata } from "next";
import { GamePage } from "@/components/GamePage";
import KlondikeGame from "./KlondikeGame";

export const metadata: Metadata = { title: "Klondike · Kingsol Solitaire" };

export default function Page() {
  return (
    <GamePage title="Klondike" boardClass="board-klondike" path="/klondike">
      <KlondikeGame />
    </GamePage>
  );
}
