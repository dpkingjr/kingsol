"use client";

import { Card } from "@/lib/cards";
import { CardView } from "./CardView";

interface Props {
  cards: Card[];
  /** index of the first selected card in this column, if any */
  selectedFrom?: number | null;
  canDrag: (cardIndex: number) => boolean;
  onCardClick: (cardIndex: number) => void;
  onCardDoubleClick?: (cardIndex: number) => void;
  onEmptyClick: () => void;
  onDragStart: (cardIndex: number) => void;
  onDrop: () => void;
  ariaLabel: string;
}

const OFFSET_DOWN = "var(--off-down)";
/** Per-column face-up spacing; shrinks to keep long columns inside the window (see globals.css). */
const OFFSET_UP = "var(--col-off-up)";

/**
 * A tableau column. Cards are nested inside one another so that dragging a card
 * drags the visual stack of every card on top of it.
 */
export function Column({
  cards,
  selectedFrom,
  canDrag,
  onCardClick,
  onCardDoubleClick,
  onEmptyClick,
  onDragStart,
  onDrop,
  ariaLabel,
}: Props) {
  const down = cards.slice(0, -1).filter((c) => !c.faceUp).length;
  const up = Math.max(0, cards.length - 1 - down);
  const height = `calc(var(--ch) + ${down} * ${OFFSET_DOWN} + ${up} * ${OFFSET_UP})`;

  const render = (i: number): React.ReactNode => {
    const card = cards[i];
    const draggable = card.faceUp && canDrag(i);
    const offset = i === 0 ? "0px" : cards[i - 1].faceUp ? OFFSET_UP : OFFSET_DOWN;
    return (
      <div
        key={card.id}
        className="stack-card"
        style={{ top: offset }}
        draggable={draggable}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", card.id);
          onDragStart(i);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onCardClick(i);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onCardDoubleClick?.(i);
        }}
      >
        <CardView card={card} selected={selectedFrom != null && i >= selectedFrom} />
        {i + 1 < cards.length && render(i + 1)}
      </div>
    );
  };

  return (
    <div
      className="column"
      style={{ minHeight: height, "--n-down": down, "--n-up": Math.max(up, 1) } as React.CSSProperties}
      onClick={onEmptyClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      role="group"
      aria-label={ariaLabel}
    >
      {cards.length === 0 ? <div className="slot" /> : render(0)}
    </div>
  );
}
