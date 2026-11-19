import type { Metadata } from "next";
import { GamePage } from "@/components/GamePage";
import PyramidGame from "./PyramidGame";

export const metadata: Metadata = { title: "Pyramid · Kingsol Solitaire" };

export default function Page() {
  return (
    <GamePage title="Pyramid" boardClass="board-pyramid" path="/pyramid">
      <PyramidGame />
    </GamePage>
  );
}
