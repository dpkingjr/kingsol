"use client";

import { useEffect, useState } from "react";
import { CardView, Slot } from "@/components/CardView";
import { Column } from "@/components/Column";
import { GameShell } from "@/components/GameShell";
import { SUIT_SYMBOL, isRed } from "@/lib/cards";
import { useDragDrop } from "@/lib/useDragDrop";
import { useGame } from "@/lib/useGame";
import { SSource, SpiderState, SuitCount, autoMove, canDrag, deal, dealRow, isWon, move } from "@/games/spider";

export default function SpiderGame() {
  const game = useGame<SpiderState>("spider", (seed) => deal(seed, 1), isWon);
  const { state } = game;
  // Kept in the game state, so a restored save brings its own suit count back.
  const suitCount: SuitCount = state?.suitCount ?? 1;
  const [selected, setSelected] = useState<SSource | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const drag = useDragDrop<SSource>();

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(id);
  }, [message]);

  const shell = {
    title: "Spider",
    seed: game.seed,
    moves: game.moves,
    elapsedSeconds: game.elapsedSeconds,
    won: game.won,
    canUndo: game.canUndo,
    autoSave: game.autoSave,
    onToggleAutoSave: game.setAutoSave,
    message: message ?? game.notice,
    onUndo: () => {
      setSelected(null);
      game.undo();
    },
    onNewGame: () => {
      setSelected(null);
      game.newGame(undefined, (seed) => deal(seed, suitCount));
    },
    onRestart: () => {
      setSelected(null);
      game.restart();
    },
    boardClass: "board-spider",
    options: (
      <select
        aria-label="Number of suits"
        value={suitCount}
        onChange={(e) => {
          const n = Number(e.target.value) as SuitCount;
          setSelected(null);
          game.newGame(undefined, (seed) => deal(seed, n));
        }}
      >
        <option value={1}>1 suit</option>
        <option value={2}>2 suits</option>
        <option value={4}>4 suits</option>
      </select>
    ),
    rules: (
      <ul>
        <li>Two decks, ten columns. Make eight full runs from King down to Ace in a single suit.</li>
        <li>Any card can go on a card one rank higher, whatever its suit.</li>
        <li>Only runs of the same suit can be moved together. Any card or run can fill an empty column.</li>
        <li>A completed King-to-Ace run is removed automatically.</li>
        <li>Click the stock to deal one card onto every column. Every column must have a card first.</li>
      </ul>
    ),
  };

  if (!state) return <GameShell {...shell}>{null}</GameShell>;
  const s = state;

  const tryMove = (src: SSource, target: number) => {
    setSelected(null);
    return game.apply(move(s, src, target));
  };

  const clickCard = (src: SSource) => {
    if (selected && selected.index === src.index && selected.cardIndex === src.cardIndex) {
      setSelected(null);
      return;
    }
    if (selected && selected.index !== src.index && tryMove(selected, src.index)) return;
    setSelected(canDrag(s, src) ? src : null);
  };

  /** Drop target for column `col`; it glows while a legal move is dragged over it. */
  const dropAt = (col: number) =>
    drag.target(
      `t${col}`,
      (src) => move(s, src, col) !== null,
      (src) => tryMove(src, col),
    );

  const dealsLeft = s.stock.length / 10;

  return (
    <GameShell {...shell}>
      <div className="top-row">
        <div className="pile-group">
          <Slot
            className="stock"
            ariaLabel={`Deal a row (${dealsLeft} left)`}
            onClick={() => {
              setSelected(null);
              const r = dealRow(s);
              if (r.ok) game.apply(r.state);
              else setMessage(r.reason);
            }}
          >
            {Array.from({ length: dealsLeft }, (_, i) => (
              <div key={i} className="stock-stack" style={{ left: `calc(${i} * var(--cw) * 0.12)` }}>
                <CardView card={s.stock[0]} />
              </div>
            ))}
            {dealsLeft > 0 && <span className="count-badge">{dealsLeft}</span>}
          </Slot>
        </div>
        <div className="completed" aria-label={`${s.completed.length} of 8 runs completed`}>
          {Array.from({ length: 8 }, (_, i) => {
            const suit = s.completed[i];
            return (
              <div key={i} className={`completed-slot${suit ? " done" : ""}${suit && isRed(suit) ? " red" : ""}`}>
                {suit ? SUIT_SYMBOL[suit] : ""}
              </div>
            );
          })}
        </div>
      </div>

      <div className="tableau cols-10">
        {s.tableau.map((pile, col) => (
          <Column
            key={col}
            cards={pile}
            ariaLabel={`Column ${col + 1}`}
            selectedFrom={selected?.index === col ? selected.cardIndex : null}
            canDrag={(ci) => canDrag(s, { index: col, cardIndex: ci })}
            onCardClick={(ci) => clickCard({ index: col, cardIndex: ci })}
            onCardDoubleClick={(ci) => {
              setSelected(null);
              game.apply(autoMove(s, { index: col, cardIndex: ci }));
            }}
            onEmptyClick={() => selected && tryMove(selected, col)}
            onDragStart={(ci) => drag.start({ index: col, cardIndex: ci })}
            drop={dropAt(col)}
            dropOk={drag.hover === `t${col}`}
          />
        ))}
      </div>
    </GameShell>
  );
}
