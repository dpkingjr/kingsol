import {
  Card,
  canStackAlternating,
  canStackOnFoundation,
  faceDown,
  faceUp,
  isAlternatingRun,
  makeDeck,
  shuffle,
  top,
} from "@/lib/cards";

export type DrawCount = 1 | 3;

export interface KlondikeState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  drawCount: DrawCount;
}

export type KSource =
  | { pile: "waste" }
  | { pile: "foundation"; index: number }
  | { pile: "tableau"; index: number; cardIndex: number };

export type KTarget = { pile: "foundation"; index: number } | { pile: "tableau"; index: number };

export function deal(seed: number, drawCount: DrawCount): KlondikeState {
  const deck = shuffle(makeDeck(), seed);
  const tableau: Card[][] = [];
  let n = 0;
  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let row = 0; row <= col; row++) {
      const card = deck[n++];
      pile.push(row === col ? faceUp(card) : card);
    }
    tableau.push(pile);
  }
  return {
    stock: deck.slice(n).map(faceDown),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    drawCount,
  };
}

/** Click on the stock: draw cards, or recycle the waste when the stock is empty. */
export function drawStock(s: KlondikeState): KlondikeState | null {
  if (s.stock.length === 0) {
    if (s.waste.length === 0) return null;
    return { ...s, stock: s.waste.slice().reverse().map(faceDown), waste: [] };
  }
  const n = Math.min(s.drawCount, s.stock.length);
  const drawn = s.stock.slice(-n).reverse().map(faceUp);
  return { ...s, stock: s.stock.slice(0, -n), waste: [...s.waste, ...drawn] };
}

export function movingCards(s: KlondikeState, src: KSource): Card[] | null {
  switch (src.pile) {
    case "waste": {
      const t = top(s.waste);
      return t ? [t] : null;
    }
    case "foundation": {
      const t = top(s.foundations[src.index]);
      return t ? [t] : null;
    }
    case "tableau": {
      const pile = s.tableau[src.index];
      if (!isAlternatingRun(pile, src.cardIndex)) return null;
      return pile.slice(src.cardIndex);
    }
  }
}

export function canDrag(s: KlondikeState, src: KSource): boolean {
  return movingCards(s, src) !== null;
}

function canPlace(s: KlondikeState, cards: Card[], target: KTarget): boolean {
  if (target.pile === "foundation") {
    return cards.length === 1 && canStackOnFoundation(cards[0], s.foundations[target.index]);
  }
  const dest = s.tableau[target.index];
  const t = top(dest);
  if (!t) return cards[0].rank === 13;
  return canStackAlternating(cards[0], t);
}

function sameSpot(src: KSource, target: KTarget): boolean {
  return (
    (src.pile === "foundation" || src.pile === "tableau") &&
    src.pile === target.pile &&
    src.index === target.index
  );
}

export function move(s: KlondikeState, src: KSource, target: KTarget): KlondikeState | null {
  if (sameSpot(src, target)) return null;
  const cards = movingCards(s, src);
  if (!cards || !canPlace(s, cards, target)) return null;

  const next: KlondikeState = {
    ...s,
    waste: s.waste,
    foundations: s.foundations.slice(),
    tableau: s.tableau.slice(),
  };

  // remove from source
  if (src.pile === "waste") next.waste = s.waste.slice(0, -1);
  else if (src.pile === "foundation") next.foundations[src.index] = s.foundations[src.index].slice(0, -1);
  else {
    const remaining = s.tableau[src.index].slice(0, src.cardIndex);
    const last = top(remaining);
    if (last && !last.faceUp) remaining[remaining.length - 1] = faceUp(last);
    next.tableau[src.index] = remaining;
  }

  // add to target
  if (target.pile === "foundation") next.foundations[target.index] = [...next.foundations[target.index], ...cards];
  else next.tableau[target.index] = [...next.tableau[target.index], ...cards];

  return next;
}

/** Try to send the card at `src` to any foundation. */
export function autoToFoundation(s: KlondikeState, src: KSource): KlondikeState | null {
  if (src.pile === "foundation") return null;
  for (let i = 0; i < 4; i++) {
    const r = move(s, src, { pile: "foundation", index: i });
    if (r) return r;
  }
  return null;
}

/** Find the first legal destination for the cards at `src` (foundation first, then tableau). */
export function autoMove(s: KlondikeState, src: KSource): KlondikeState | null {
  const cards = movingCards(s, src);
  if (!cards) return null;
  if (cards.length === 1) {
    const f = autoToFoundation(s, src);
    if (f) return f;
  }
  for (let i = 0; i < 7; i++) {
    // Don't shuffle a King from one empty column to another.
    if (src.pile === "tableau" && src.cardIndex === 0 && s.tableau[i].length === 0) continue;
    const r = move(s, src, { pile: "tableau", index: i });
    if (r) return r;
  }
  return null;
}

export function isWon(s: KlondikeState): boolean {
  return s.foundations.every((f) => f.length === 13);
}

/** True when every card is face up and the stock/waste is empty: the game can finish itself. */
export function canAutoFinish(s: KlondikeState): boolean {
  return (
    !isWon(s) &&
    s.stock.length === 0 &&
    s.waste.length === 0 &&
    s.tableau.every((p) => p.every((c) => c.faceUp))
  );
}

/** One step of auto-finish: move the lowest available card to a foundation. */
export function autoFinishStep(s: KlondikeState): KlondikeState | null {
  let bestCol = -1;
  let bestRank = 99;
  for (let col = 0; col < s.tableau.length; col++) {
    const t = top(s.tableau[col]);
    if (t && t.rank < bestRank && s.foundations.some((f) => canStackOnFoundation(t, f))) {
      bestCol = col;
      bestRank = t.rank;
    }
  }
  if (bestCol < 0) return null;
  return autoToFoundation(s, { pile: "tableau", index: bestCol, cardIndex: s.tableau[bestCol].length - 1 });
}
