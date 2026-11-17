import { Card, Suit, faceDown, faceUp, makeDeck, shuffle, top } from "@/lib/cards";

export type SuitCount = 1 | 2 | 4;

export interface SpiderState {
  stock: Card[];
  tableau: Card[][];
  completed: Suit[]; // suit of each completed K→A run
  suitCount: SuitCount;
}

export interface SSource {
  index: number;
  cardIndex: number;
}

function spiderDeck(suitCount: SuitCount): Card[] {
  const suits: Suit[] = suitCount === 1 ? ["S"] : suitCount === 2 ? ["S", "H"] : ["S", "H", "D", "C"];
  return makeDeck(suits, 8 / suits.length);
}

export function deal(seed: number, suitCount: SuitCount): SpiderState {
  const deck = shuffle(spiderDeck(suitCount), seed);
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);
  for (let i = 0; i < 54; i++) tableau[i % 10].push(deck[i]);
  for (const pile of tableau) pile[pile.length - 1] = faceUp(pile[pile.length - 1]);
  return { stock: deck.slice(54).map(faceDown), tableau, completed: [], suitCount };
}

/** Is cards[from..] a face-up, same-suit, descending run? */
export function isSuitedRun(cards: Card[], from: number): boolean {
  if (from >= cards.length) return false;
  for (let i = from; i < cards.length; i++) {
    const c = cards[i];
    if (!c.faceUp) return false;
    if (i > from) {
      const prev = cards[i - 1];
      if (prev.suit !== c.suit || prev.rank !== c.rank + 1) return false;
    }
  }
  return true;
}

export function canDrag(s: SpiderState, src: SSource): boolean {
  return isSuitedRun(s.tableau[src.index], src.cardIndex);
}

/** Remove any completed K→A same-suit runs and flip newly exposed cards. */
function collectRuns(s: SpiderState): SpiderState {
  const tableau = s.tableau.slice();
  const completed = s.completed.slice();
  for (let i = 0; i < tableau.length; i++) {
    let pile = tableau[i];
    if (pile.length >= 13) {
      const start = pile.length - 13;
      if (pile[start].rank === 13 && isSuitedRun(pile, start)) {
        completed.push(pile[start].suit);
        pile = pile.slice(0, start);
      }
    }
    const t = top(pile);
    if (t && !t.faceUp) pile = [...pile.slice(0, -1), faceUp(t)];
    tableau[i] = pile;
  }
  return { ...s, tableau, completed };
}

export function move(s: SpiderState, src: SSource, targetIndex: number): SpiderState | null {
  if (src.index === targetIndex) return null;
  const from = s.tableau[src.index];
  if (!isSuitedRun(from, src.cardIndex)) return null;
  const cards = from.slice(src.cardIndex);
  const dest = s.tableau[targetIndex];
  const t = top(dest);
  if (t && t.rank !== cards[0].rank + 1) return null;

  const tableau = s.tableau.slice();
  tableau[src.index] = from.slice(0, src.cardIndex);
  tableau[targetIndex] = [...dest, ...cards];
  return collectRuns({ ...s, tableau });
}

/** Best destination: same-suit match first, then any rank match, then an empty column. */
export function autoMove(s: SpiderState, src: SSource): SpiderState | null {
  const from = s.tableau[src.index];
  if (!isSuitedRun(from, src.cardIndex)) return null;
  const card = from[src.cardIndex];
  const candidates = s.tableau
    .map((pile, i) => ({ i, t: top(pile) }))
    .filter(({ i }) => i !== src.index);
  const suited = candidates.filter(({ t }) => t && t.rank === card.rank + 1 && t.suit === card.suit);
  const ranked = candidates.filter(({ t }) => t && t.rank === card.rank + 1 && t.suit !== card.suit);
  const empty = src.cardIndex === 0 ? [] : candidates.filter(({ t }) => !t);
  for (const { i } of [...suited, ...ranked, ...empty]) {
    const r = move(s, src, i);
    if (r) return r;
  }
  return null;
}

export type DealResult = { ok: true; state: SpiderState } | { ok: false; reason: string };

/** Deal one card onto every column. Not allowed while any column is empty. */
export function dealRow(s: SpiderState): DealResult {
  if (s.stock.length === 0) return { ok: false, reason: "No more cards to deal." };
  if (s.tableau.some((p) => p.length === 0)) {
    return { ok: false, reason: "Fill every empty column before dealing." };
  }
  const stock = s.stock.slice();
  const tableau = s.tableau.map((pile) => [...pile, faceUp(stock.pop()!)]);
  return { ok: true, state: collectRuns({ ...s, stock, tableau }) };
}

export function isWon(s: SpiderState): boolean {
  return s.completed.length === 8;
}
