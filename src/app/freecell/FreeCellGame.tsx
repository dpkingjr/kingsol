"use client";

import { useRef, useState } from "react";
import { CardView, Slot } from "@/components/CardView";
import { Column } from "@/components/Column";
import { GameShell } from "@/components/GameShell";
import { top } from "@/lib/cards";
import { useGame } from "@/lib/useGame";
import {
  FSource,
  FTarget,
  FreeCellState,
  autoMove,
  autoPlay,
  canDrag,
  deal,
  isWon,
  maxMovable,
  move,
} from "@/games/freecell";

const sameSource = (a: FSource | null, b: FSource) =>
  !!a &&
  a.pile === b.pile &&
  a.index === b.index &&
  (a.pile !== "tableau" || a.cardIndex === (b as { cardIndex: number }).cardIndex);

export default function FreeCellGame() {
  const game = useGame<FreeCellState>("freecell", deal, isWon);
  const { state } = game;
  const [selected, setSelected] = useState<FSource | null>(null);
  const [autoPlayOn, setAutoPlayOn] = useState(true);
  const dragSource = useRef<FSource | null>(null);

  const shell = {
    title: "FreeCell",
    seed: game.seed,
    moves: game.moves,
    elapsedSeconds: game.elapsedSeconds,
    won: game.won,
    canUndo: game.canUndo,
    autoSave: game.autoSave,
    onToggleAutoSave: game.setAutoSave,
    message: game.notice,
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
    boardClass: "board-freecell",
    options: (
      <label className="check">
        <input type="checkbox" checked={autoPlayOn} onChange={(e) => setAutoPlayOn(e.target.checked)} />
        Auto-play
      </label>
    ),
    rules: (
      <ul>
        <li>All cards are dealt face up. Build the four foundations up by suit from Ace to King.</li>
        <li>On the tableau, build down in alternating colors.</li>
        <li>Each free cell holds one card. Any card can go into an empty column.</li>
        <li>
          You can move a run of cards at once when there is room to do it one card at a time: (free cells + 1) × 2
          <sup>empty columns</sup>.
        </li>
        <li>With auto-play on, cards no longer needed on the tableau go to the foundations automatically.</li>
      </ul>
    ),
  };

  if (!state) return <GameShell {...shell}>{null}</GameShell>;
  const s = state;

  const commit = (next: FreeCellState | null) => {
    setSelected(null);
    if (!next) return false;
    return game.apply(autoPlayOn ? autoPlay(next) : next);
  };

  const tryMove = (src: FSource, target: FTarget) => commit(move(s, src, target));

  const clickSource = (src: FSource) => {
    if (sameSource(selected, src)) {
      setSelected(null);
      return;
    }
    if (selected) {
      const target: FTarget =
        src.pile === "tableau" ? { pile: "tableau", index: src.index } : { pile: src.pile, index: src.index };
      if (tryMove(selected, target)) return;
    }
    setSelected(canDrag(s, src) ? src : null);
  };

  const drop = (target: FTarget) => {
    const src = dragSource.current;
    dragSource.current = null;
    if (src) tryMove(src, target);
  };

  return (
    <GameShell
      {...shell}
      status={
        <span title="Largest run you can move right now">
          Max run <strong>{maxMovable(s, false)}</strong>
        </span>
      }
    >
      <div className="top-row">
        <div className="pile-group">
          {s.cells.map((c, i) => (
            <Slot
              key={i}
              className="cell"
              ariaLabel={`Free cell ${i + 1}`}
              onClick={() => (c ? clickSource({ pile: "cell", index: i }) : selected && tryMove(selected, { pile: "cell", index: i }))}
              onDrop={() => drop({ pile: "cell", index: i })}
            >
              {c && (
                <div
                  draggable
                  onDragStart={() => (dragSource.current = { pile: "cell", index: i })}
                  onDoubleClick={() => commit(autoMove(s, { pile: "cell", index: i }))}
                >
                  <CardView card={c} selected={selected?.pile === "cell" && selected.index === i} />
                </div>
              )}
            </Slot>
          ))}
        </div>
        <div className="pile-group">
          {s.foundations.map((f, i) => (
            <Slot
              key={i}
              label="A"
              ariaLabel={`Foundation ${i + 1}`}
              onClick={() =>
                f.length ? clickSource({ pile: "foundation", index: i }) : selected && tryMove(selected, { pile: "foundation", index: i })
              }
              onDrop={() => drop({ pile: "foundation", index: i })}
            >
              {f.length > 0 && (
                <div draggable onDragStart={() => (dragSource.current = { pile: "foundation", index: i })}>
                  <CardView card={top(f)!} selected={selected?.pile === "foundation" && selected.index === i} />
                </div>
              )}
            </Slot>
          ))}
        </div>
      </div>

      <div className="tableau cols-8">
        {s.tableau.map((pile, col) => (
          <Column
            key={col}
            cards={pile}
            ariaLabel={`Column ${col + 1}`}
            selectedFrom={selected?.pile === "tableau" && selected.index === col ? selected.cardIndex : null}
            canDrag={(ci) => canDrag(s, { pile: "tableau", index: col, cardIndex: ci })}
            onCardClick={(ci) => clickSource({ pile: "tableau", index: col, cardIndex: ci })}
            onCardDoubleClick={(ci) => commit(autoMove(s, { pile: "tableau", index: col, cardIndex: ci }))}
            onEmptyClick={() => selected && tryMove(selected, { pile: "tableau", index: col })}
            onDragStart={(ci) => (dragSource.current = { pile: "tableau", index: col, cardIndex: ci })}
            onDrop={() => drop({ pile: "tableau", index: col })}
          />
        ))}
      </div>
    </GameShell>
  );
}
