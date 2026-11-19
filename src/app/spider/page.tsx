import type { Metadata } from "next";
import { GamePage } from "@/components/GamePage";
import SpiderGame from "./SpiderGame";

export const metadata: Metadata = { title: "Spider · Kingsol Solitaire" };

export default function Page() {
  return (
    <GamePage title="Spider" boardClass="board-spider" path="/spider">
      <SpiderGame />
    </GamePage>
  );
}
