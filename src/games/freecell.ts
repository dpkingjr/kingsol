import {
  Card,
  canStackAlternating,
  canStackOnFoundation,
  faceUp,
  isAlternatingRun,
  isRed,
  makeDeck,
  shuffle,
  top,
} from "@/lib/cards";

export interface FreeCellState {
  cells: (Card | null)[];
  foundations: Card[][];
  tableau: Card[][];
}

export type FSource =
  | { pile: "cell"; index: number }
  | { pile: "foundation"; index: number }
  | { pile: "tableau"; index: number; cardIndex: number };

export type FTarget =
  | { pile: "cell"; index: number }
  | { pile: "foundation"; index: number }
  | { pile: "tableau"; index: number };

export function deal(seed: number): FreeCellState {
  const deck = shuffle(makeDeck(), seed).map(faceUp);
  const tableau: Card[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((card, i) => tableau[i % 8].push(card));
  return { cells: [null, null, null, null], foundations: [[], [], [], []], tableau };
}

/** Max cards movable as a unit, given free cells and empty columns (the "supermove" rule). */
export function maxMovable(s: FreeCellState, toEmptyColumn: boolean): number {
  const freeCells = s.cells.filter((c) => c === null).length;
  let emptyCols = s.tableau.filter((p) => p.length === 0).length;
  if (toEmptyColumn) emptyCols -= 1;
  return (freeCells + 1) * 2 ** Math.max(0, emptyCols);
}

export function movingCards(s: FreeCellState, src: FSource): Card[] | null {
  switch (src.pile) {
    case "cell": {
      const c = s.cells[src.index];
      return c ? [c] : null;
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

export function canDrag(s: FreeCellState, src: FSource): boolean {
  const cards = movingCards(s, src);
  return !!cards && cards.length <= maxMovable(s, false);
}

function canPlace(s: FreeCellState, cards: Card[], target: FTarget): boolean {
  switch (target.pile) {
    case "cell":
      return cards.length === 1 && s.cells[target.index] === null;
    case "foundation":
      return cards.length === 1 && canStackOnFoundation(cards[0], s.foundations[target.index]);
    case "tableau": {
      const dest = s.tableau[target.index];
      if (cards.length > maxMovable(s, dest.length === 0)) return false;
      return canStackAlternating(cards[0], top(dest));
    }
  }
}

export function move(s: FreeCellState, src: FSource, target: FTarget): FreeCellState | null {
  if (src.pile === target.pile && src.index === target.index) return null;
  const cards = movingCards(s, src);
  if (!cards || !canPlace(s, cards, target)) return null;

  const next: FreeCellState = {
    cells: s.cells.slice(),
    foundations: s.foundations.slice(),
    tableau: s.tableau.slice(),
  };

  if (src.pile === "cell") next.cells[src.index] = null;
  else if (src.pile === "foundation") next.foundations[src.index] = s.foundations[src.index].slice(0, -1);
  else next.tableau[src.index] = s.tableau[src.index].slice(0, src.cardIndex);

  if (target.pile === "cell") next.cells[target.index] = cards[0];
  else if (target.pile === "foundation") next.foundations[target.index] = [...next.foundations[target.index], cards[0]];
  else next.tableau[target.index] = [...next.tableau[target.index], ...cards];

  return next;
}

/** Find a sensible destination: foundation, then a non-empty column, then an empty column, then a free cell. */
export function autoMove(s: FreeCellState, src: FSource): FreeCellState | null {
  const cards = movingCards(s, src);
  if (!cards) return null;
  if (cards.length === 1 && src.pile !== "foundation") {
    for (let i = 0; i < 4; i++) {
      const r = move(s, src, { pile: "foundation", index: i });
      if (r) return r;
    }
  }
  const order = s.tableau
    .map((p, i) => ({ i, empty: p.length === 0 }))
    .sort((a, b) => Number(a.empty) - Number(b.empty));
  for (const { i, empty } of order) {
    if (empty && src.pile === "tableau" && src.cardIndex === 0) continue;
    const r = move(s, src, { pile: "tableau", index: i });
    if (r) return r;
  }
  if (src.pile === "tableau" && cards.length === 1) {
    const free = s.cells.indexOf(null);
    if (free >= 0) return move(s, src, { pile: "cell", index: free });
  }
  return null;
}

/** A card is safe to auto-play if no card still in play could need it as a landing spot. */
function isSafeToPlay(card: Card, s: FreeCellState): boolean {
  if (card.rank <= 2) return true;
  const opposite = s.foundations.filter((f) => f.length > 0 && isRed(f[0].suit) !== isRed(card.suit));
  const oppRanks = opposite.map((f) => f.length);
  return oppRanks.length === 2 && oppRanks.every((r) => r >= card.rank - 1);
}

/** Repeatedly move safe cards to the foundations. */
export function autoPlay(s: FreeCellState): FreeCellState {
  let cur = s;
  for (;;) {
    let moved: FreeCellState | null = null;
    for (let i = 0; i < 4 && !moved; i++) {
      const c = cur.cells[i];
      if (c && isSafeToPlay(c, cur)) {
        for (let f = 0; f < 4 && !moved; f++) moved = move(cur, { pile: "cell", index: i }, { pile: "foundation", index: f });
      }
    }
    for (let col = 0; col < 8 && !moved; col++) {
      const pile = cur.tableau[col];
      const t = top(pile);
      if (t && isSafeToPlay(t, cur)) {
        for (let f = 0; f < 4 && !moved; f++) {
          moved = move(cur, { pile: "tableau", index: col, cardIndex: pile.length - 1 }, { pile: "foundation", index: f });
        }
      }
    }
    if (!moved) return cur;
    cur = moved;
  }
}

export function isWon(s: FreeCellState): boolean {
  return s.foundations.every((f) => f.length === 13);
}
