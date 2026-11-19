import { Card, SUIT_SYMBOL, cardName, isRed, rankLabel } from "@/lib/cards";
import type { DropHandlers } from "@/lib/useDragDrop";
import { FaceArt } from "./FaceArt";

interface Props {
  card: Card;
  selected?: boolean;
  hint?: boolean;
  dimmed?: boolean;
}

/** A single playing card, drawn entirely with CSS so it scales with --cw. */
export function CardView({ card, selected, hint, dimmed }: Props) {
  if (!card.faceUp) {
    return <div className="card back" aria-label="Face-down card" />;
  }
  const sym = SUIT_SYMBOL[card.suit];
  const label = rankLabel(card.rank);
  const classes = [
    "card",
    isRed(card.suit) ? "red" : "black",
    selected ? "selected" : "",
    hint ? "hint" : "",
    dimmed ? "dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} aria-label={cardName(card)}>
      <span className="corner tl">
        <span className="rank">{label}</span>
        <span className="suit">{sym}</span>
      </span>
      <span className={card.rank > 10 ? "center face" : "center"}>
        {card.rank > 10 ? <FaceArt rank={card.rank as 11 | 12 | 13} suit={card.suit} /> : sym}
      </span>
      <span className="corner br">
        <span className="rank">{label}</span>
        <span className="suit">{sym}</span>
      </span>
    </div>
  );
}

interface SlotProps {
  label?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  /** drop handlers from useDragDrop().target(...) */
  drop?: DropHandlers;
  className?: string;
  /** a card being dragged over this pile could legally land here: highlight it */
  dropOk?: boolean;
  ariaLabel?: string;
}

/** An empty-pile placeholder / container that accepts clicks and drops. */
export function Slot({ label, children, onClick, drop, className, dropOk, ariaLabel }: SlotProps) {
  return (
    <div
      className={["slot", className, dropOk ? "drop-ok" : ""].filter(Boolean).join(" ")}
      onClick={onClick}
      {...drop}
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
    >
      {label && <span className="slot-label">{label}</span>}
      {children}
    </div>
  );
}
