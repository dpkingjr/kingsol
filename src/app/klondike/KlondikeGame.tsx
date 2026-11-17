"use client";

import { useRef, useState } from "react";
import { CardView, Slot } from "@/components/CardView";
import { Column } from "@/components/Column";
import { GameShell } from "@/components/GameShell";
import { top } from "@/lib/cards";
import { useGame } from "@/lib/useGame";
import {
  DrawCount,
  KSource,
  KTarget,
  KlondikeState,
  autoFinishStep,
  autoMove,
  canAutoFinish,
  canDrag,
  deal,
  drawStock,
  isWon,
  move,
} from "@/games/klondike";

const sameSource = (a: KSource | null, b: KSource) =>
  !!a &&
  a.pile === b.pile &&
  (a.pile === "waste" ||
    (a.index === (b as { index: number }).index &&
      (a.pile !== "tableau" || a.cardIndex === (b as { cardIndex: number }).cardIndex)));

export default function KlondikeGame() {
  const game = useGame<KlondikeState>("klondike", (seed) => deal(seed, 1), isWon);
  const { state, apply } = game;
  // Kept in the game state, so a restored save brings its own draw mode back.
  const drawCount: DrawCount = state?.drawCount ?? 1;
  const [selected, setSelected] = useState<KSource | null>(null);
  const dragSource = useRef<KSource | null>(null);
  const finishing = useRef(false);

  if (!state) return <GameShell {...shellProps()}>{null}</GameShell>;
  const s = state;

  function shellProps() {
    return {
      title: "Klondike",
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
        game.newGame(undefined, (seed) => deal(seed, drawCount));
      },
      onRestart: () => {
        setSelected(null);
        game.restart();
      },
      boardClass: "board-klondike",
      options: (
        <select
          aria-label="Cards drawn from stock"
          value={drawCount}
          onChange={(e) => {
            const n = Number(e.target.value) as DrawCount;
            setSelected(null);
            game.newGame(undefined, (seed) => deal(seed, n));
          }}
        >
          <option value={1}>Draw 1</option>
          <option value={3}>Draw 3</option>
        </select>
      ),
      rules: (
        <ul>
          <li>Build the four foundations up by suit from Ace to King.</li>
          <li>On the tableau, build down in alternating colors. Any valid run can be moved together.</li>
          <li>Only a King (or a run starting with a King) can fill an empty column.</li>
          <li>Click the stock to draw; click the empty stock to recycle the waste.</li>
          <li>Click a card then a destination, drag and drop, or double-click to auto-move.</li>
        </ul>
      ),
    };
  }

  const tryMove = (src: KSource, target: KTarget) => {
    const ok = apply(move(s, src, target));
    setSelected(null);
    return ok;
  };

  const clickSource = (src: KSource) => {
    if (sameSource(selected, src)) {
      setSelected(null);
      return;
    }
    if (selected) {
      const target: KTarget | null =
        src.pile === "tableau"
          ? { pile: "tableau", index: src.index }
          : src.pile === "foundation"
            ? { pile: "foundation", index: src.index }
            : null;
      if (target && apply(move(s, selected, target))) {
        setSelected(null);
        return;
      }
    }
    setSelected(canDrag(s, src) ? src : null);
  };

  const dblClick = (src: KSource) => {
    setSelected(null);
    apply(autoMove(s, src));
  };

  const drop = (target: KTarget) => {
    const src = dragSource.current;
    dragSource.current = null;
    if (src) tryMove(src, target);
  };

  const runAutoFinish = () => {
    if (finishing.current) return;
    finishing.current = true;
    const steps: KlondikeState[] = [];
    let cur: KlondikeState | null = s;
    while (cur && (cur = autoFinishStep(cur))) steps.push(cur);
    steps.forEach((st, i) => setTimeout(() => apply(st), i * 60));
    setTimeout(() => (finishing.current = false), steps.length * 60 + 10);
  };

  const wasteShown = s.waste.slice(-(s.drawCount === 3 ? 3 : 1));

  return (
    <GameShell
      {...shellProps()}
      status={
        canAutoFinish(s) && !game.won ? (
          <button className="primary small" onClick={runAutoFinish}>
            Auto-finish
          </button>
        ) : null
      }
    >
      <div className="top-row">
        <div className="pile-group">
          <Slot
            className="stock"
            onClick={() => {
              setSelected(null);
              apply(drawStock(s));
            }}
            ariaLabel={s.stock.length ? `Stock, ${s.stock.length} cards` : "Recycle waste"}
            label={s.stock.length ? undefined : s.waste.length ? "↻" : ""}
          >
            {s.stock.length > 0 && <CardView card={top(s.stock)!} />}
            {s.stock.length > 0 && <span className="count-badge">{s.stock.length}</span>}
          </Slot>
          <div className={`waste fan-${wasteShown.length}`} aria-label="Waste">
            {wasteShown.length === 0 && <div className="slot" />}
            {wasteShown.map((c, i) => {
              const isTop = i === wasteShown.length - 1;
              return (
                <div
                  key={c.id}
                  className="waste-card"
                  style={{ left: `calc(${i} * var(--fan))` }}
                  draggable={isTop}
                  onDragStart={() => (dragSource.current = { pile: "waste" })}
                  onClick={isTop ? () => clickSource({ pile: "waste" }) : undefined}
                  onDoubleClick={isTop ? () => dblClick({ pile: "waste" }) : undefined}
                >
                  <CardView card={c} selected={isTop && selected?.pile === "waste"} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="pile-group">
          {s.foundations.map((f, i) => (
            <Slot
              key={i}
              label="A"
              onClick={() => (f.length ? clickSource({ pile: "foundation", index: i }) : selected && tryMove(selected, { pile: "foundation", index: i }))}
              onDrop={() => drop({ pile: "foundation", index: i })}
              ariaLabel={`Foundation ${i + 1}`}
            >
              {f.length > 0 && (
                <div
                  draggable
                  onDragStart={() => (dragSource.current = { pile: "foundation", index: i })}
                >
                  <CardView
                    card={top(f)!}
                    selected={selected?.pile === "foundation" && selected.index === i}
                  />
                </div>
              )}
            </Slot>
          ))}
        </div>
      </div>

      <div className="tableau cols-7">
        {s.tableau.map((pile, col) => (
          <Column
            key={col}
            cards={pile}
            ariaLabel={`Column ${col + 1}`}
            selectedFrom={selected?.pile === "tableau" && selected.index === col ? selected.cardIndex : null}
            canDrag={(ci) => canDrag(s, { pile: "tableau", index: col, cardIndex: ci })}
            onCardClick={(ci) => clickSource({ pile: "tableau", index: col, cardIndex: ci })}
            onCardDoubleClick={(ci) => dblClick({ pile: "tableau", index: col, cardIndex: ci })}
            onEmptyClick={() => selected && tryMove(selected, { pile: "tableau", index: col })}
            onDragStart={(ci) => (dragSource.current = { pile: "tableau", index: col, cardIndex: ci })}
            onDrop={() => drop({ pile: "tableau", index: col })}
          />
        ))}
      </div>
    </GameShell>
  );
}
