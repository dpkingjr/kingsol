export type Suit = "S" | "H" | "D" | "C";

export interface Card {
  id: string;
  suit: Suit;
  rank: number; // 1 (Ace) .. 13 (King)
  faceUp: boolean;
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

export const SUIT_NAME: Record<Suit, string> = {
  S: "spades",
  H: "hearts",
  D: "diamonds",
  C: "clubs",
};

export function rankLabel(rank: number): string {
  switch (rank) {
    case 1:
      return "A";
    case 11:
      return "J";
    case 12:
      return "Q";
    case 13:
      return "K";
    default:
      return String(rank);
  }
}

export function rankName(rank: number): string {
  switch (rank) {
    case 1:
      return "Ace";
    case 11:
      return "Jack";
    case 12:
      return "Queen";
    case 13:
      return "King";
    default:
      return String(rank);
  }
}

export function cardName(card: Card): string {
  return `${rankName(card.rank)} of ${SUIT_NAME[card.suit]}`;
}

export const isRed = (suit: Suit) => suit === "H" || suit === "D";

/** Build a deck from the given suits, repeated `copies` times. */
export function makeDeck(suits: Suit[] = SUITS, copies = 1): Card[] {
  const deck: Card[] = [];
  for (let c = 0; c < copies; c++) {
    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({ id: `${suit}${rank}-${c}`, suit, rank, faceUp: false });
      }
    }
  }
  return deck;
}

/** Small deterministic PRNG so each deal can be identified and replayed by number. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1;
}

export const top = <T,>(pile: T[]): T | undefined => pile[pile.length - 1];

export const faceUp = (card: Card): Card => ({ ...card, faceUp: true });
export const faceDown = (card: Card): Card => ({ ...card, faceUp: false });

/** Can `card` go onto a foundation whose current cards are `pile` (same suit, ascending from Ace)? */
export function canStackOnFoundation(card: Card, pile: Card[]): boolean {
  const t = top(pile);
  if (!t) return card.rank === 1;
  return t.suit === card.suit && card.rank === t.rank + 1;
}

/** Alternating colors, descending rank. */
export function canStackAlternating(card: Card, onto: Card | undefined): boolean {
  if (!onto) return true;
  return onto.faceUp && isRed(onto.suit) !== isRed(card.suit) && onto.rank === card.rank + 1;
}

/** Is cards[from..] a run of alternating colors, descending by one? */
export function isAlternatingRun(cards: Card[], from: number): boolean {
  for (let i = from; i < cards.length; i++) {
    if (!cards[i].faceUp) return false;
    if (i > from && !canStackAlternating(cards[i], cards[i - 1])) return false;
  }
  return from < cards.length;
}
