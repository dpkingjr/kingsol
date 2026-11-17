import { Card, faceDown, faceUp, makeDeck, shuffle, top } from "@/lib/cards";

export const ROWS = 7;
export const PYRAMID_SIZE = (ROWS * (ROWS + 1)) / 2; // 28
export const MAX_PASSES = 3; // the stock may be gone through three times

export interface PyramidState {
  pyramid: (Card | null)[];
  stock: Card[];
  waste: Card[];
  pass: number; // 1-based count of the current trip through the stock
}

export type PSource = { pile: "pyramid"; index: number } | { pile: "waste" };

export const indexOf = (row: number, pos: number) => (row * (row + 1)) / 2 + pos;

export function rowPos(index: number): { row: number; pos: number } {
  let row = 0;
  while (indexOf(row + 1, 0) <= index) row++;
  return { row, pos: index - indexOf(row, 0) };
}

export function deal(seed: number): PyramidState {
  const deck = shuffle(makeDeck(), seed);
  return {
    pyramid: deck.slice(0, PYRAMID_SIZE).map(faceUp),
    stock: deck.slice(PYRAMID_SIZE).map(faceDown),
    waste: [],
    pass: 1,
  };
}

/** A pyramid card is exposed when both cards that overlap it from the row below are gone. */
export function isExposed(s: PyramidState, index: number): boolean {
  if (!s.pyramid[index]) return false;
  const { row, pos } = rowPos(index);
  if (row === ROWS - 1) return true;
  return !s.pyramid[indexOf(row + 1, pos)] && !s.pyramid[indexOf(row + 1, pos + 1)];
}

export function cardAt(s: PyramidState, src: PSource): Card | null {
  if (src.pile === "waste") return top(s.waste) ?? null;
  return isExposed(s, src.index) ? s.pyramid[src.index] : null;
}

function remove(s: PyramidState, src: PSource): PyramidState {
  if (src.pile === "waste") return { ...s, waste: s.waste.slice(0, -1) };
  const pyramid = s.pyramid.slice();
  pyramid[src.index] = null;
  return { ...s, pyramid };
}

const same = (a: PSource, b: PSource) =>
  a.pile === b.pile && (a.pile === "waste" || a.index === (b as { index: number }).index);

/** Remove a King on its own. */
export function removeKing(s: PyramidState, src: PSource): PyramidState | null {
  const c = cardAt(s, src);
  if (!c || c.rank !== 13) return null;
  return remove(s, src);
}

/** Remove two cards whose ranks total 13. */
export function removePair(s: PyramidState, a: PSource, b: PSource): PyramidState | null {
  if (same(a, b)) return null;
  const ca = cardAt(s, a);
  const cb = cardAt(s, b);
  if (!ca || !cb || ca.rank + cb.rank !== 13) return null;
  return remove(remove(s, a), b);
}

export function canRecycle(s: PyramidState): boolean {
  return s.stock.length === 0 && s.waste.length > 0 && s.pass < MAX_PASSES;
}

export function drawStock(s: PyramidState): PyramidState | null {
  if (s.stock.length > 0) {
    return { ...s, stock: s.stock.slice(0, -1), waste: [...s.waste, faceUp(top(s.stock)!)] };
  }
  if (!canRecycle(s)) return null;
  return { ...s, stock: s.waste.slice().reverse().map(faceDown), waste: [], pass: s.pass + 1 };
}

export function isWon(s: PyramidState): boolean {
  return s.pyramid.every((c) => c === null);
}

/** No pair can be made and the stock can't be drawn or recycled. */
export function isStuck(s: PyramidState): boolean {
  if (isWon(s) || s.stock.length > 0 || canRecycle(s)) return false;
  const available: Card[] = [];
  s.pyramid.forEach((_, i) => {
    if (isExposed(s, i)) available.push(s.pyramid[i]!);
  });
  const w = top(s.waste);
  if (w) available.push(w);
  if (available.some((c) => c.rank === 13)) return false;
  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      if (available[i].rank + available[j].rank === 13) return false;
    }
  }
  return true;
}

export function cardsRemaining(s: PyramidState): number {
  return s.pyramid.filter(Boolean).length;
}
