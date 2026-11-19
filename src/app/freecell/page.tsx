import type { Metadata } from "next";
import { GamePage } from "@/components/GamePage";
import FreeCellGame from "./FreeCellGame";

export const metadata: Metadata = { title: "FreeCell · Kingsol Solitaire" };

export default function Page() {
  return (
    <GamePage title="FreeCell" boardClass="board-freecell" path="/freecell">
      <FreeCellGame />
    </GamePage>
  );
}
