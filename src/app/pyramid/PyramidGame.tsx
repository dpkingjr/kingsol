"use client";

import { useState } from "react";
import { CardView, Slot } from "@/components/CardView";
import { GameShell } from "@/components/GameShell";
import { top } from "@/lib/cards";
import { useDragDrop } from "@/lib/useDragDrop";
import { useGame } from "@/lib/useGame";
import {
  MAX_PASSES,
  PSource,
  PyramidState,
  ROWS,
  cardAt,
  cardsRemaining,
  deal,
  drawStock,
  indexOf,
  isExposed,
  isStuck,
  isWon,
  removeKing,
  removePair,
} from "@/games/pyramid";

const same = (a: PSource | null, b: PSource) =>
  !!a && a.pile === b.pile && (a.pile === "waste" || a.index === (b as { index: number }).index);

export default function PyramidGame() {
  const game = useGame<PyramidState>("pyramid", deal, isWon);
  const { state } = game;
  const [selected, setSelected] = useState<PSource | null>(null);
  const drag = useDragDrop<PSource>();

  const shell = {
    title: "Pyramid",
    seed: game.seed,
    moves: game.moves,
    elapsedSeconds: game.elapsedSeconds,
    won: game.won,
    canUndo: game.canUndo,
    autoSave: game.autoSave,
    onToggleAutoSave: game.setAutoSave,
    onUndo: () => {
      setSelected(null);
      game.undo();
    },
    onNewGame: () => {
      setSelected(null);
      game.newGame();
    },
    onRestart: () => {
      setSelected(null);
      game.restart();
    },
    boardClass: "board-pyramid",
    rules: (
      <ul>
        <li>Clear the pyramid by removing pairs of cards whose ranks add up to 13.</li>
        <li>Ace = 1, Jack = 11, Queen = 12. Kings count 13 and are removed on their own with a single click.</li>
        <li>A pyramid card is available once no card overlaps it from the row below.</li>
        <li>Click the stock to turn a card onto the waste; the top waste card can be paired too.</li>
        <li>You can go through the stock {MAX_PASSES} times in total.</li>
        <li>Click two cards to pair them, or drag one onto the other.</li>
      </ul>
    ),
  };

  if (!state) return <GameShell {...shell}>{null}</GameShell>;
  const s = state;
  const stuck = isStuck(s);

  const click = (src: PSource) => {
    const card = cardAt(s, src);
    if (!card) return;
    if (same(selected, src)) {
      setSelected(null);
      return;
    }
    if (card.rank === 13) {
      setSelected(null);
      game.apply(removeKing(s, src));
      return;
    }
    if (selected && game.apply(removePair(s, selected, src))) {
      setSelected(null);
      return;
    }
    setSelected(src);
  };

  /** Drop target on a card: it glows while the dragged card would pair with it (ranks total 13). */
  const dropOn = (key: string, target: PSource) =>
    drag.target(
      key,
      (src) => removePair(s, src, target) !== null,
      (src) => {
        setSelected(null);
        game.apply(removePair(s, src, target));
      },
    );

  const wasteTop = top(s.waste);
  const stockLabel =
    s.stock.length > 0 ? undefined : s.pass < MAX_PASSES && s.waste.length > 0 ? "↻" : "✕";

  return (
    <GameShell
      {...shell}
      message={stuck ? "No more moves. Undo, restart, or start a new game." : game.notice}
      status={
        <>
          <span>
            Left <strong>{cardsRemaining(s)}</strong>
          </span>
          <span>
            Pass <strong>{s.pass}</strong>/{MAX_PASSES}
          </span>
        </>
      }
    >
      <div className="pyramid-layout">
        <div className="pyramid" aria-label="Pyramid">
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: row + 1 }, (_, pos) => {
              const index = indexOf(row, pos);
              const card = s.pyramid[index];
              if (!card) return null;
              const exposed = isExposed(s, index);
              const src: PSource = { pile: "pyramid", index };
              return (
                <div
                  key={card.id}
                  className={`pyr-card${exposed ? " exposed" : ""}${drag.hover === `p${index}` ? " drop-ok" : ""}`}
                  style={{
                    left: `calc((${pos} - ${row} / 2) * var(--cw) * 1.1 + 3 * var(--cw) * 1.1)`,
                    top: `calc(${row} * var(--ch) * 0.5)`,
                    zIndex: row,
                  }}
                  onClick={() => click(src)}
                  draggable={exposed}
                  onDragStart={() => drag.start(src)}
                  {...(exposed ? dropOn(`p${index}`, src) : {})}
                >
                  <CardView card={card} selected={same(selected, src)} dimmed={!exposed} />
                </div>
              );
            }),
          )}
        </div>

        <div className="pile-group pyramid-side">
          <Slot
            className="stock"
            label={stockLabel}
            ariaLabel={s.stock.length ? `Stock, ${s.stock.length} cards` : "Recycle waste"}
            onClick={() => {
              setSelected(null);
              game.apply(drawStock(s), false);
            }}
          >
            {s.stock.length > 0 && <CardView card={top(s.stock)!} />}
            {s.stock.length > 0 && <span className="count-badge">{s.stock.length}</span>}
          </Slot>
          <Slot ariaLabel="Waste">
            {wasteTop && (
              <div
                className={drag.hover === "w" ? "drop-ok" : undefined}
                onClick={() => click({ pile: "waste" })}
                draggable
                onDragStart={() => drag.start({ pile: "waste" })}
                {...dropOn("w", { pile: "waste" })}
              >
                <CardView card={wasteTop} selected={selected?.pile === "waste"} />
              </div>
            )}
          </Slot>
        </div>
      </div>
    </GameShell>
  );
}
